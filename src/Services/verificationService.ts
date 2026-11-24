import mongoose from 'mongoose';
import cron from 'node-cron';
import Doctor from 'models/DoctorSchema';
import { winston_logger } from '@utils/logger';
import type { DoctorSchemaInterface, VerificationDocument } from 'types';
import {
    DOCUMENT_KINDS,
    DOCUMENT_LABELS,
    DocumentKind,
    KINDS_REQUIRING_EXPIRY,
    LICENCE_REMINDER_DAYS,
    REQUIRED_KINDS,
} from 'config/verification';
import { deleteStoredDocument, documentViewUrl, storeDocument } from 'config/documentStorage';
import { sendApprovalDecisionEmail, sendLicenceExpiryEmail } from '@utils/message/verificationEmails';

/** Thrown for problems the user can fix; controllers turn it into a 400/404. */
export class VerificationError extends Error {
    constructor(message: string, public statusCode = 400) {
        super(message);
    }
}

type DoctorDoc = mongoose.HydratedDocument<DoctorSchemaInterface>;

const startOfToday = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

/** The doctor's current practising licence: the latest non-rejected one. */
const currentLicence = (docs: VerificationDocument[]) =>
    docs
        .filter((d) => d.kind === 'practising_licence' && d.status !== 'rejected')
        .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0];

/** What's missing before this doctor can be approved. */
export const verificationSummary = (doctor: Pick<DoctorSchemaInterface, 'verificationDocuments'>) => {
    const docs = doctor.verificationDocuments ?? [];
    const usable = docs.filter((d) => d.status !== 'rejected');
    const missing = REQUIRED_KINDS.filter((kind) => !usable.some((d) => d.kind === kind));
    const licence = currentLicence(docs);
    const licenceExpiresAt = licence?.expiresAt ?? null;
    const licenceExpired = !!licenceExpiresAt && new Date(licenceExpiresAt) < startOfToday();
    return {
        missing,
        missingLabels: missing.map((k) => DOCUMENT_LABELS[k]),
        licenceExpiresAt,
        licenceExpired,
        readyForReview: missing.length === 0 && !licenceExpired,
    };
};

/** Document metadata safe to send to the doctor or an admin (no storage ids). */
const publicDocument = (d: VerificationDocument, withViewUrl = false) => ({
    _id: String(d._id),
    kind: d.kind,
    label: DOCUMENT_LABELS[d.kind],
    originalName: d.originalName,
    size: d.size,
    expiresAt: d.expiresAt,
    status: d.status,
    reviewNote: d.reviewNote,
    uploadedAt: d.uploadedAt,
    ...(withViewUrl && { viewUrl: documentViewUrl(d) }),
});

const findDoctor = async (id: string): Promise<DoctorDoc> => {
    if (!mongoose.isValidObjectId(id)) throw new VerificationError('doctor not found', 404);
    const doctor = await Doctor.findById(id);
    if (!doctor) throw new VerificationError('doctor not found', 404);
    return doctor;
};

const parseExpiry = (kind: DocumentKind, raw?: string) => {
    if (!raw) {
        if (KINDS_REQUIRING_EXPIRY.includes(kind)) throw new VerificationError(`${DOCUMENT_LABELS[kind]} needs an expiry date`);
        return undefined;
    }
    const date = new Date(raw);
    if (Number.isNaN(+date)) throw new VerificationError('Invalid expiry date');
    if (date < startOfToday()) throw new VerificationError('This document has already expired');
    return date;
};

// ── Doctor ──────────────────────────────────────────────────────────

export const getMyVerification = async (doctorId: string) => {
    const doctor = await findDoctor(doctorId);
    return {
        status: doctor.isApproved,
        review: doctor.approvalReview?.note ? { note: doctor.approvalReview.note, reviewedAt: doctor.approvalReview.reviewedAt } : null,
        documents: (doctor.verificationDocuments ?? []).map((d) => publicDocument(d)),
        ...verificationSummary(doctor),
        kinds: DOCUMENT_KINDS.map((k) => ({
            kind: k,
            label: DOCUMENT_LABELS[k],
            required: REQUIRED_KINDS.includes(k),
            needsExpiry: KINDS_REQUIRING_EXPIRY.includes(k),
        })),
    };
};

export const addDocument = async (
    doctorId: string,
    { file, kind, expiresAt }: { file?: Express.Multer.File; kind?: string; expiresAt?: string },
) => {
    if (!file) throw new VerificationError('Please attach a file');
    if (!kind || !DOCUMENT_KINDS.includes(kind as DocumentKind)) throw new VerificationError('Unknown document type');
    const docKind = kind as DocumentKind;
    const expiry = parseExpiry(docKind, expiresAt);
    const doctor = await findDoctor(doctorId);

    const stored = await storeDocument(file, doctorId);
    doctor.verificationDocuments!.push({
        kind: docKind,
        ...stored,
        originalName: file.originalname.slice(0, 120),
        size: file.size,
        expiresAt: expiry,
        status: 'pending',
        uploadedAt: new Date(),
    } as VerificationDocument);
    // A new licence restarts the reminder clock.
    if (docKind === 'practising_licence') doctor.licenceReminderSentAt = undefined;
    await doctor.save();
    return getMyVerification(doctorId);
};

/** Doctors can remove documents that haven't been accepted. Accepted ones stay as the record of what was verified. */
export const deleteDocument = async (doctorId: string, documentId: string) => {
    const doctor = await findDoctor(doctorId);
    const doc = doctor.verificationDocuments!.find((d) => String(d._id) === documentId);
    if (!doc) throw new VerificationError('document not found', 404);
    if (doc.status === 'accepted') throw new VerificationError('Accepted documents can’t be removed. Upload a newer one instead.');
    doctor.verificationDocuments = doctor.verificationDocuments!.filter((d) => String(d._id) !== documentId);
    await doctor.save();
    await deleteStoredDocument(doc).catch((e) => winston_logger.error(`document delete failed: ${e.message}`));
    return getMyVerification(doctorId);
};

// ── Admin ───────────────────────────────────────────────────────────

const ADMIN_LIST_FIELDS = 'name email specialization photo slug isApproved createdAt verificationDocuments approvalReview';

export const listDoctorsForReview = async (status?: string) => {
    const filter = status && ['pending', 'approved', 'cancelled'].includes(status) ? { isApproved: status } : {};
    const doctors = await Doctor.find(filter).select(ADMIN_LIST_FIELDS).sort({ createdAt: -1 }).lean<DoctorSchemaInterface[]>();
    return doctors.map((d) => ({
        _id: String((d as unknown as { _id: unknown })._id),
        name: d.name,
        email: d.email,
        specialization: d.specialization,
        photo: d.photo?.imageUrl,
        slug: d.slug,
        status: d.isApproved,
        documentCount: d.verificationDocuments?.length ?? 0,
        pendingDocuments: d.verificationDocuments?.filter((x) => x.status === 'pending').length ?? 0,
        ...verificationSummary(d),
    }));
};

export const getDoctorForReview = async (doctorId: string) => {
    const doctor = await findDoctor(doctorId);
    return {
        _id: String(doctor._id),
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        photo: doctor.photo?.imageUrl,
        slug: doctor.slug,
        bio: doctor.bio,
        qualifications: doctor.qualifications,
        experiences: doctor.experiences,
        status: doctor.isApproved,
        review: doctor.approvalReview ?? null,
        documents: (doctor.verificationDocuments ?? []).map((d) => publicDocument(d, true)),
        ...verificationSummary(doctor),
    };
};

export const reviewDocument = async (
    doctorId: string,
    documentId: string,
    { status, note }: { status: 'accepted' | 'rejected'; note?: string },
) => {
    const doctor = await findDoctor(doctorId);
    const doc = doctor.verificationDocuments!.find((d) => String(d._id) === documentId);
    if (!doc) throw new VerificationError('document not found', 404);
    if (status === 'rejected' && !note?.trim()) throw new VerificationError('Tell the doctor why the document was rejected');
    doc.status = status;
    doc.reviewNote = note?.trim() || undefined;
    await doctor.save();
    return getDoctorForReview(doctorId);
};

/**
 * Approve, reject ('cancelled') or send back to pending. Approval requires
 * the required documents and an unexpired licence, and accepts any
 * documents still pending.
 */
export const setApproval = async (
    doctorId: string,
    { status, note }: { status: 'approved' | 'cancelled' | 'pending'; note?: string },
    adminId: string,
) => {
    const doctor = await findDoctor(doctorId);
    if (status === 'approved') {
        const summary = verificationSummary(doctor);
        if (summary.missing.length) throw new VerificationError(`Missing: ${summary.missingLabels.join(', ')}`);
        if (summary.licenceExpired) throw new VerificationError('The practising licence has expired');
        doctor.verificationDocuments!.forEach((d) => {
            if (d.status === 'pending') d.status = 'accepted';
        });
    }
    if (status === 'cancelled' && !note?.trim()) throw new VerificationError('Tell the doctor why they weren’t approved');

    const changed = doctor.isApproved !== status;
    doctor.isApproved = status;
    doctor.approvalReview = { reviewedAt: new Date(), reviewedBy: new mongoose.Types.ObjectId(adminId), note: note?.trim() || undefined };
    await doctor.save();

    if (changed && status !== 'pending') {
        sendApprovalDecisionEmail({ email: doctor.email, name: doctor.name, approved: status === 'approved', note: note?.trim() })
            .catch((e) => winston_logger.error(`approval email failed: ${e.message}`));
    }
    return getDoctorForReview(doctorId);
};

// ── Licence expiry ──────────────────────────────────────────────────

/**
 * Daily: email doctors whose licence expires within LICENCE_REMINDER_DAYS,
 * and unlist approved doctors whose licence has expired.
 */
export const runLicenceExpiryCheck = async (now = new Date()) => {
    const doctors = await Doctor.find({ isApproved: 'approved', deletedAt: null });
    let reminded = 0;
    let unlisted = 0;
    const soon = new Date(now.getTime() + LICENCE_REMINDER_DAYS * 86_400_000);

    for (const doctor of doctors) {
        const licence = currentLicence(doctor.verificationDocuments ?? []);
        if (!licence?.expiresAt) continue;
        const expiresAt = new Date(licence.expiresAt);

        if (expiresAt < now) {
            doctor.isApproved = 'pending';
            doctor.approvalReview = {
                reviewedAt: now,
                note: `Your practising licence expired on ${expiresAt.toDateString()}. Upload your renewed licence to be listed again.`,
            };
            await doctor.save();
            unlisted++;
            sendLicenceExpiryEmail({ email: doctor.email, name: doctor.name, expiresAt, expired: true })
                .catch((e) => winston_logger.error(`licence email failed: ${e.message}`));
        } else if (expiresAt < soon && !doctor.licenceReminderSentAt) {
            doctor.licenceReminderSentAt = now;
            await doctor.save();
            reminded++;
            sendLicenceExpiryEmail({ email: doctor.email, name: doctor.name, expiresAt, expired: false })
                .catch((e) => winston_logger.error(`licence email failed: ${e.message}`));
        }
    }
    if (reminded || unlisted) winston_logger.info(`licence check: ${reminded} reminded, ${unlisted} unlisted`);
    return { reminded, unlisted };
};

let task: cron.ScheduledTask | null = null;

/** Daily at 06:00 UTC; override with LICENCE_CHECK_CRON. */
export const startLicenceExpiryJob = () => {
    if (task) return task;
    const schedule = process.env.LICENCE_CHECK_CRON || '0 6 * * *';
    if (!cron.validate(schedule)) {
        winston_logger.error('licence check: invalid LICENCE_CHECK_CRON, job not scheduled');
        return null;
    }
    task = cron.schedule(schedule, () => {
        runLicenceExpiryCheck().catch((e) => winston_logger.error(`licence check failed: ${e.message}`));
    }, { timezone: 'UTC' });
    return task;
};
