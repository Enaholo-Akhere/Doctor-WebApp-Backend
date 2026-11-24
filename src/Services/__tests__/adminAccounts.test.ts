import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

vi.mock('@utils/message/adminMessageEmail', () => ({ sendAdminMessageEmail: vi.fn(async () => {}) }));

import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import 'models/ReviewSchema';
import AdminMessage from 'models/AdminMessageSchema';
import { sendAdminMessageEmail } from '@utils/message/adminMessageEmail';
import { listAccounts, restoreAccount, softDeleteAccount, updateAccount } from 'Services/adminAccountsService';
import { cleanHtml, listAdminMessages, sendAdminMessage } from 'Services/adminMessageService';
import { getDoctorByIdService, getDoctorService } from 'Services/doctorService';

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
    await Promise.all([User.deleteMany({}), Doctor.deleteMany({}), AdminMessage.deleteMany({})]);
});

const admin = new mongoose.Types.ObjectId().toString();
let n = 0;
const patient = (fields: Record<string, unknown> = {}) =>
    new User({ name: `Patient ${++n}`, email: `p${n}@x.com`, password: 'x', role: 'patient', photo: { imageUrl: 'u', publicId: 'p' }, bloodType: 'O+', allergies: ['penicillin'], refreshedToken: 'tok', ...fields }).save();
const doctor = (fields: Record<string, unknown> = {}) =>
    new Doctor({ name: `Doctor ${++n}`, email: `d${n}@x.com`, password: 'x', specialization: 'cardiologist', isApproved: 'approved', photo: { imageUrl: 'u', publicId: 'p' }, refreshedToken: 'tok', ...fields }).save();

describe('listing accounts', () => {
    it('lists patients without health data, searchable and paginated', async () => {
        await patient({ name: 'Ada Lovelace' });
        await patient();
        await patient();
        await new User({ name: 'An Admin', email: 'a@x.com', password: 'x', role: 'admin', photo: { imageUrl: 'u', publicId: 'p' } }).save();

        const all = await listAccounts('patient', {});
        expect(all.total).toBe(3); // admins aren't patients
        expect(all.rows[0]).not.toHaveProperty('bloodType');
        expect(all.rows[0]).not.toHaveProperty('allergies');
        expect(all.rows[0]).not.toHaveProperty('password');

        expect((await listAccounts('patient', { search: 'lovelace' })).rows.map((r) => r.name)).toEqual(['Ada Lovelace']);
        const page2 = await listAccounts('patient', { limit: 2, page: 2 });
        expect(page2).toMatchObject({ total: 3, pages: 2, page: 2 });
        expect(page2.rows).toHaveLength(1);
    });

    it('searches doctors by specialty too', async () => {
        await doctor({ specialization: 'neurologist' });
        await doctor();
        expect((await listAccounts('doctor', { search: 'neuro' })).rows).toHaveLength(1);
    });
});

describe('editing', () => {
    it('changes only the editable fields', async () => {
        const p = await patient();
        const row = await updateAccount('patient', String(p._id), { name: '  New Name ', phone: '+234800', email: 'hijack@x.com', role: 'admin' });
        expect(row).toMatchObject({ name: 'New Name', phone: '+234800', email: p.email });
        const saved = await User.findById(p._id).lean();
        expect(saved?.role).toBe('patient');
    });

    it('updates a doctor and keeps the profile slug in step', async () => {
        const d = await doctor({ name: 'Ada Obi' });
        const row = await updateAccount('doctor', String(d._id), { specialization: 'neurologist', ticketPrice: 80 });
        expect(row).toMatchObject({ specialization: 'neurologist', ticketPrice: 80, slug: 'ada-obi-neurologist' });
    });

    it('404s for the wrong role or an unknown id', async () => {
        const d = await doctor();
        await expect(updateAccount('patient', String(d._id), { name: 'X' })).rejects.toMatchObject({ statusCode: 404 });
        await expect(updateAccount('doctor', 'nope', { name: 'X' })).rejects.toMatchObject({ statusCode: 404 });
    });
});

describe('soft delete', () => {
    it('hides a doctor from the public site, ends their sessions, and can be restored', async () => {
        const d = await doctor();
        await softDeleteAccount('doctor', String(d._id), admin);

        const saved = await Doctor.findById(d._id).lean();
        expect(saved?.deletedAt).toBeInstanceOf(Date);
        expect(saved?.refreshedToken).toBeUndefined();
        expect((await getDoctorService()).data).toEqual([]);
        expect((await getDoctorByIdService(String(d._id))).error?.message).toBe('doctor not found');

        expect((await listAccounts('doctor', {})).total).toBe(0);
        expect((await listAccounts('doctor', { deleted: true })).total).toBe(1);

        await restoreAccount('doctor', String(d._id));
        expect((await getDoctorService()).data).toHaveLength(1);
    });

    it('keeps the record (it is not erased)', async () => {
        const p = await patient();
        await softDeleteAccount('patient', String(p._id), admin);
        expect(await User.countDocuments({ _id: p._id })).toBe(1);
    });
});

describe('messages', () => {
    it('emails every active patient individually and logs the send', async () => {
        await patient({ name: 'Ann' });
        await patient({ name: 'Ben' });
        const gone = await patient({ name: 'Gone' });
        await softDeleteAccount('patient', String(gone._id), admin);

        const r = await sendAdminMessage({ audience: 'all_patients', subject: 'Hello', html: '<p>Hi {{name}}</p>' }, admin);
        expect(r).toMatchObject({ recipientCount: 2, sent: 2, failed: 0 });
        expect(sendAdminMessageEmail).toHaveBeenCalledTimes(2);
        expect(vi.mocked(sendAdminMessageEmail).mock.calls.map((c) => c[0].name).sort()).toEqual(['Ann', 'Ben']);

        const [history] = await listAdminMessages();
        expect(history).toMatchObject({ subject: 'Hello', audience: 'all_patients', recipientCount: 2, recipients: [] });
    });

    it('sends to selected patients and doctors, skipping deleted ones', async () => {
        const p = await patient();
        const d = await doctor();
        const gone = await doctor();
        await softDeleteAccount('doctor', String(gone._id), admin);
        const r = await sendAdminMessage({
            audience: 'selected',
            recipients: [{ id: String(p._id), role: 'patient' }, { id: String(d._id), role: 'doctor' }, { id: String(gone._id), role: 'doctor' }],
            subject: 'Update',
            html: '<p>Note</p>',
        }, admin);
        expect(r.recipientCount).toBe(2);
        expect((await listAdminMessages())[0].recipients).toHaveLength(2);
    });

    it('counts failed emails without stopping the rest', async () => {
        await patient();
        await patient();
        vi.mocked(sendAdminMessageEmail).mockRejectedValueOnce(new Error('bounce'));
        expect(await sendAdminMessage({ audience: 'all_patients', subject: 'S', html: '<p>x</p>' }, admin)).toMatchObject({ sent: 1, failed: 1 });
    });

    it('rejects empty messages and empty audiences', async () => {
        await expect(sendAdminMessage({ audience: 'all_doctors', subject: 'S', html: '<p>x</p>' }, admin)).rejects.toThrow(/No recipients/);
        await patient();
        await expect(sendAdminMessage({ audience: 'all_patients', subject: 'S', html: '<p><br></p>' }, admin)).rejects.toThrow(/Write a message/);
        await expect(sendAdminMessage({ audience: 'all_patients', subject: ' ', html: '<p>x</p>' }, admin)).rejects.toThrow(/subject/);
    });

    it('strips anything unsafe from the HTML', () => {
        const out = cleanHtml('<p onclick="x()">Hi <strong>there</strong></p><script>alert(1)</script><a href="javascript:x">bad</a><a href="https://careconnect.com">ok</a>');
        expect(out).not.toMatch(/script|onclick|javascript/);
        expect(out).toContain('<strong>there</strong>');
        expect(out).toContain('href="https://careconnect.com"');
        expect(out).toContain('rel="noopener noreferrer"');
    });
});
