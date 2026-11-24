import { Types } from 'mongoose';
import { appError } from '@utils/appError';
import { winston_logger } from '@utils/logger';
import { RECORDING_NOTICE } from 'config/recording';
import Consultation, { ConsultationSummary, IConsultation } from 'models/ConsultationSchema';
import RecordAccessLog, { RecordAccessAction } from 'models/RecordAccessLogSchema';
// Registered for populate('patient' | 'doctor').
import 'models/UserSchema';
import 'models/DoctorSchema';
import { CallType, ChatRole } from 'models/messages';
import { AudioTrack, summarize, transcribe } from './transcriptionService';

/**
 * Consultation records: creation from a consented call recording, the
 * transcription pipeline, doctor review, and patient access.
 *
 * Access rules:
 * - The doctor who recorded it sees it in every state and can edit/approve.
 * - The patient sees it only once the doctor has approved it.
 * - Nobody else, including the patient's other doctors.
 * Denials are 404s, never 403s: the frontend treats 403 as a dead session.
 */

export interface Actor {
    id: string;
    role: ChatRole;
}

const notFound = () => appError({ message: 'Record not found', statusCode: 404 });

const log = (record: Pick<IConsultation, '_id' | 'patient'>, actor: Actor, action: RecordAccessAction) =>
    RecordAccessLog.create({
        consultation: record._id,
        patient: record.patient,
        actor: actor.id,
        actorRole: actor.role,
        action,
    }).catch((error: Error) => winston_logger.error(`record access log failed: ${error.message}`));

/** Whether `actor` may see this record at all. */
export const canView = (record: Pick<IConsultation, 'doctor' | 'patient' | 'status'>, actor: Actor) =>
    actor.role === 'doctor'
        ? String(record.doctor) === actor.id
        : String(record.patient) === actor.id && record.status === 'approved';

/** Whether `actor` may delete it: patients their approved records, doctors only unapproved drafts. */
export const canDelete = (record: Pick<IConsultation, 'doctor' | 'patient' | 'status'>, actor: Actor) =>
    actor.role === 'doctor'
        ? String(record.doctor) === actor.id && record.status !== 'approved'
        : String(record.patient) === actor.id && record.status === 'approved';

const loadForDoctor = async (id: string, actor: Actor) => {
    if (actor.role !== 'doctor' || !Types.ObjectId.isValid(id)) throw notFound();
    const record = await Consultation.findById(id);
    if (!record || String(record.doctor) !== actor.id) throw notFound();
    return record;
};

// ── Creation (from the call socket, once both parties consented) ─────────

export const createRecording = async (p: {
    callId: string;
    callType: CallType;
    doctorId: string;
    patientId: string;
    doctorConsentedAt: Date;
    patientConsentedAt: Date;
}) => {
    const record = await Consultation.create({
        callId: p.callId,
        callType: p.callType,
        doctor: p.doctorId,
        patient: p.patientId,
        status: 'recording',
        consent: {
            noticeVersion: RECORDING_NOTICE.version,
            doctorConsentedAt: p.doctorConsentedAt,
            patientConsentedAt: p.patientConsentedAt,
        },
        recordingStartedAt: new Date(),
    });
    void log(record, { id: p.doctorId, role: 'doctor' }, 'create');
    return record;
};

/** Marks a recording finished (stopped by either party, or the call ended). */
export const markRecordingEnded = async (id: string) => {
    await Consultation.updateOne(
        { _id: id, status: 'recording', recordingEndedAt: { $exists: false } },
        { $set: { recordingEndedAt: new Date() } }
    );
};

// ── Audio upload + processing ────────────────────────────────────────────

/**
 * Accepts the audio for a recording and starts processing in the background.
 * The audio buffers are dropped as soon as transcription finishes; they are
 * never written to disk or storage.
 */
export const acceptAudio = async (id: string, actor: Actor, tracks: AudioTrack[], durationSec?: number) => {
    const record = await loadForDoctor(id, actor);
    if (record.status !== 'recording') {
        throw appError({ message: 'Audio for this record was already received', statusCode: 409 });
    }
    if (!tracks.length) throw appError({ message: 'No audio received', statusCode: 400 });

    record.status = 'processing';
    record.recordingEndedAt ??= new Date();
    if (durationSec !== undefined) record.durationSec = durationSec;
    await record.save();

    void processRecording(String(record._id), tracks);
    return record;
};

export const processRecording = async (id: string, tracks: AudioTrack[]) => {
    try {
        const transcript = await transcribe(tracks);
        const summary = await summarize(transcript);
        await Consultation.updateOne({ _id: id }, { $set: { transcript, summary, status: 'pending_review' } });
    } catch (error: any) {
        winston_logger.error(`consultation ${id} processing failed: ${error.message}`);
        await Consultation.updateOne(
            { _id: id },
            { $set: { status: 'failed', failureReason: 'Transcription failed. The audio was not kept.' } }
        );
    }
};

// ── Reading ──────────────────────────────────────────────────────────────

const LIST_FIELDS = 'status callType recordingStartedAt durationSec summary.chiefComplaint approvedAt amendedAt failureReason createdAt';

export const listForDoctor = (actor: Actor) =>
    Consultation.find({ doctor: actor.id })
        .select(`${LIST_FIELDS} patient`)
        .populate('patient', 'name photo')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

export const listForPatient = (actor: Actor) =>
    Consultation.find({ patient: actor.id, status: 'approved' })
        .select(`${LIST_FIELDS} doctor`)
        .populate('doctor', 'name photo specialization')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

export const getRecord = async (id: string, actor: Actor) => {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    // Check access on the raw ids: a populated ref is null if that account was deleted.
    const record = await Consultation.findById(id).lean();
    if (!record || !canView(record, actor)) throw notFound();
    void log(record, actor, 'view');
    return Consultation.populate(record, [
        { path: 'patient', select: 'name photo' },
        { path: 'doctor', select: 'name photo specialization' },
    ]);
};

// ── Doctor review ────────────────────────────────────────────────────────

export const updateSummary = async (id: string, actor: Actor, summary: ConsultationSummary) => {
    const record = await loadForDoctor(id, actor);
    if (record.status !== 'pending_review' && record.status !== 'approved') {
        throw appError({ message: 'This record has no summary to edit yet', statusCode: 409 });
    }
    record.summary = summary;
    if (record.status === 'approved') record.amendedAt = new Date();
    await record.save();
    void log(record, actor, 'update');
    return record;
};

export const approve = async (id: string, actor: Actor) => {
    const record = await loadForDoctor(id, actor);
    if (record.status !== 'pending_review') {
        throw appError({ message: 'Only records awaiting review can be approved', statusCode: 409 });
    }
    record.status = 'approved';
    record.approvedAt = new Date();
    await record.save();
    void log(record, actor, 'approve');
    return record;
};

export const deleteRecord = async (id: string, actor: Actor) => {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const record = await Consultation.findById(id);
    if (!record) throw notFound();
    if (!canDelete(record, actor)) {
        // Hide existence from people who can't see it; explain to those who can.
        if (canView(record, actor)) {
            throw appError({ message: 'Approved records can only be deleted by the patient', statusCode: 409 });
        }
        throw notFound();
    }
    await record.deleteOne();
    void log(record, actor, 'delete');
};
