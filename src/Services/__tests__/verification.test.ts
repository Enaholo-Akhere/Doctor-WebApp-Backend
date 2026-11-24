import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

vi.mock('config/documentStorage', () => ({
    documentUpload: { single: vi.fn() },
    storeDocument: vi.fn(async () => ({ publicId: `docs/${Math.random()}`, resourceType: 'image', format: 'jpg' })),
    documentViewUrl: vi.fn(() => 'https://signed.example/view'),
    deleteStoredDocument: vi.fn(async () => ({})),
}));
vi.mock('@utils/message/verificationEmails', () => ({
    sendApprovalDecisionEmail: vi.fn(async () => {}),
    sendLicenceExpiryEmail: vi.fn(async () => {}),
}));

import Doctor from 'models/DoctorSchema';
import { deleteStoredDocument } from 'config/documentStorage';
import { sendApprovalDecisionEmail, sendLicenceExpiryEmail } from '@utils/message/verificationEmails';
import {
    addDocument,
    deleteDocument,
    getDoctorForReview,
    getMyVerification,
    listDoctorsForReview,
    reviewDocument,
    runLicenceExpiryCheck,
    setApproval,
    VerificationError,
} from 'Services/verificationService';

let mongo: MongoMemoryServer;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(mongo.getUri());
}, 120_000);
afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});
afterEach(async () => {
    vi.clearAllMocks();
    await Doctor.deleteMany({});
});

const admin = new mongoose.Types.ObjectId().toString();
let n = 0;
const newDoctor = async () =>
    String(
        (
            await new Doctor({
                email: `d${++n}@example.com`,
                password: 'x',
                name: 'Ada Obi',
                specialization: 'cardiologist',
                photo: { imageUrl: 'https://example.com/a.jpg', publicId: 'a' },
            }).save()
        )._id,
    );

const file = (name = 'doc.jpg') => ({ originalname: name, size: 1234, mimetype: 'image/jpeg', buffer: Buffer.from('x') }) as Express.Multer.File;
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const uploadRequired = async (id: string, licenceExpiry = inDays(365)) => {
    await addDocument(id, { file: file(), kind: 'government_id' });
    await addDocument(id, { file: file(), kind: 'practising_licence', expiresAt: licenceExpiry });
    return addDocument(id, { file: file(), kind: 'medical_degree' });
};

const rejects = (p: Promise<unknown>, message: RegExp) => expect(p).rejects.toThrow(message);

describe('doctor uploads', () => {
    it('lists what is still missing', async () => {
        const id = await newDoctor();
        const v = await getMyVerification(id);
        expect(v.status).toBe('pending');
        expect(v.missing).toEqual(['government_id', 'practising_licence', 'medical_degree']);
        expect(v.readyForReview).toBe(false);
    });

    it('becomes ready once the required documents are uploaded', async () => {
        const id = await newDoctor();
        const v = await uploadRequired(id);
        expect(v.missing).toEqual([]);
        expect(v.readyForReview).toBe(true);
        expect(v.documents).toHaveLength(3);
        // Storage ids never leave the server.
        expect(v.documents[0]).not.toHaveProperty('publicId');
    });

    it('validates the upload', async () => {
        const id = await newDoctor();
        await rejects(addDocument(id, { kind: 'cv' }), /attach a file/);
        await rejects(addDocument(id, { file: file(), kind: 'selfie' }), /Unknown document type/);
        await rejects(addDocument(id, { file: file(), kind: 'practising_licence' }), /needs an expiry date/);
        await rejects(addDocument(id, { file: file(), kind: 'practising_licence', expiresAt: inDays(-1) }), /already expired/);
    });

    it('lets doctors remove documents that are not accepted', async () => {
        const id = await newDoctor();
        const v = await addDocument(id, { file: file(), kind: 'cv' });
        const after = await deleteDocument(id, v.documents[0]._id);
        expect(after.documents).toHaveLength(0);
        expect(deleteStoredDocument).toHaveBeenCalledOnce();

        const again = await uploadRequired(id);
        await setApproval(id, { status: 'approved' }, admin);
        await rejects(deleteDocument(id, again.documents[0]._id), /can’t be removed/);
    });
});

describe('admin review', () => {
    it('refuses approval until the required documents are in', async () => {
        const id = await newDoctor();
        await addDocument(id, { file: file(), kind: 'government_id' });
        await rejects(setApproval(id, { status: 'approved' }, admin), /Missing: Current practising licence, Medical degree certificate/);
    });

    it('approves, accepts pending documents and emails the doctor', async () => {
        const id = await newDoctor();
        await uploadRequired(id);
        const r = await setApproval(id, { status: 'approved', note: 'Welcome' }, admin);
        expect(r.status).toBe('approved');
        expect(r.documents.every((d) => d.status === 'accepted')).toBe(true);
        expect(r.documents[0].viewUrl).toBe('https://signed.example/view');
        expect(sendApprovalDecisionEmail).toHaveBeenCalledWith(expect.objectContaining({ approved: true, note: 'Welcome' }));
    });

    it('needs a reason to reject a doctor or a document', async () => {
        const id = await newDoctor();
        const v = await uploadRequired(id);
        await rejects(setApproval(id, { status: 'cancelled' }, admin), /why/);
        await rejects(reviewDocument(id, v.documents[0]._id, { status: 'rejected' }), /why/);
    });

    it('treats a rejected required document as missing', async () => {
        const id = await newDoctor();
        const v = await uploadRequired(id);
        const idDoc = v.documents.find((d) => d.kind === 'government_id')!;
        const r = await reviewDocument(id, idDoc._id, { status: 'rejected', note: 'Blurry photo' });
        expect(r.missing).toEqual(['government_id']);
        await rejects(setApproval(id, { status: 'approved' }, admin), /Government photo ID/);
    });

    it('filters the doctor list by status', async () => {
        const a = await newDoctor();
        await newDoctor();
        await uploadRequired(a);
        await setApproval(a, { status: 'approved' }, admin);
        expect((await listDoctorsForReview('approved')).map((d) => d._id)).toEqual([a]);
        expect(await listDoctorsForReview('pending')).toHaveLength(1);
        expect(await listDoctorsForReview()).toHaveLength(2);
    });

    it('404s for an unknown doctor', async () => {
        const err = await getDoctorForReview(new mongoose.Types.ObjectId().toString()).catch((e) => e);
        expect(err).toBeInstanceOf(VerificationError);
        expect(err.statusCode).toBe(404);
    });
});

describe('licence expiry', () => {
    it('reminds once before expiry, then unlists when it lapses', async () => {
        const id = await newDoctor();
        await uploadRequired(id, inDays(10));
        await setApproval(id, { status: 'approved' }, admin);

        expect(await runLicenceExpiryCheck()).toEqual({ reminded: 1, unlisted: 0 });
        expect(await runLicenceExpiryCheck()).toEqual({ reminded: 0, unlisted: 0 });
        expect(sendLicenceExpiryEmail).toHaveBeenCalledWith(expect.objectContaining({ expired: false }));

        const later = new Date(Date.now() + 11 * 86_400_000);
        expect(await runLicenceExpiryCheck(later)).toEqual({ reminded: 0, unlisted: 1 });
        const doctor = await Doctor.findById(id).lean();
        expect(doctor?.isApproved).toBe('pending');
        expect(doctor?.approvalReview?.note).toMatch(/expired/);
    });

    it('a renewed licence resets the reminder', async () => {
        const id = await newDoctor();
        await uploadRequired(id, inDays(10));
        await setApproval(id, { status: 'approved' }, admin);
        await runLicenceExpiryCheck();
        await addDocument(id, { file: file(), kind: 'practising_licence', expiresAt: inDays(400) });
        expect((await Doctor.findById(id).lean())?.licenceReminderSentAt).toBeUndefined();
        expect(await runLicenceExpiryCheck()).toEqual({ reminded: 0, unlisted: 0 });
    });
});
