import mongoose, { Schema, Types } from 'mongoose';
import { CallType } from 'models/messages';

/**
 * One recorded consultation: a transcript of (part of) a doctor-patient call
 * plus an AI-drafted summary the doctor reviews before it becomes part of the
 * patient's health history. Audio is never stored; only the transcript.
 *
 * Lifecycle:
 *   recording       both parties consented, doctor's browser is recording
 *   processing      audio received, transcription + summary in progress
 *   pending_review  AI draft ready; only the doctor can see it
 *   approved        doctor signed it off; visible to the patient
 *   failed          transcription/summary failed (see failureReason)
 */
export type ConsultationStatus = 'recording' | 'processing' | 'pending_review' | 'approved' | 'failed';
export type TranscriptSpeaker = 'doctor' | 'patient';

export interface TranscriptSegment {
    speaker: TranscriptSpeaker;
    startSec: number;
    endSec: number;
    text: string;
}

export interface ConsultationSummary {
    chiefComplaint: string;
    symptoms: string[];
    assessment: string;
    plan: string;
    medications: string[];
    followUp: string;
}

export interface IConsultation {
    _id: Types.ObjectId;
    patient: Types.ObjectId;
    doctor: Types.ObjectId;
    callId: string;
    callType: CallType;
    status: ConsultationStatus;
    consent: {
        noticeVersion: string;
        doctorConsentedAt: Date;
        patientConsentedAt: Date;
    };
    recordingStartedAt: Date;
    recordingEndedAt?: Date;
    durationSec?: number;
    transcript: TranscriptSegment[];
    summary?: ConsultationSummary;
    failureReason?: string;
    approvedAt?: Date;
    /** Set when the doctor edits the summary after approving it. */
    amendedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export const EMPTY_SUMMARY: ConsultationSummary = {
    chiefComplaint: '',
    symptoms: [],
    assessment: '',
    plan: '',
    medications: [],
    followUp: '',
};

const segmentSchema = new Schema<TranscriptSegment>(
    {
        speaker: { type: String, enum: ['doctor', 'patient'], required: true },
        startSec: { type: Number, required: true },
        endSec: { type: Number, required: true },
        text: { type: String, required: true },
    },
    { _id: false }
);

const summarySchema = new Schema<ConsultationSummary>(
    {
        chiefComplaint: { type: String, default: '' },
        symptoms: { type: [String], default: [] },
        assessment: { type: String, default: '' },
        plan: { type: String, default: '' },
        medications: { type: [String], default: [] },
        followUp: { type: String, default: '' },
    },
    { _id: false }
);

const consultationSchema = new Schema<IConsultation>(
    {
        patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
        callId: { type: String, required: true },
        callType: { type: String, enum: ['audio', 'video'], required: true },
        status: {
            type: String,
            enum: ['recording', 'processing', 'pending_review', 'approved', 'failed'],
            default: 'recording',
            required: true,
        },
        consent: {
            noticeVersion: { type: String, required: true },
            doctorConsentedAt: { type: Date, required: true },
            patientConsentedAt: { type: Date, required: true },
        },
        recordingStartedAt: { type: Date, required: true },
        recordingEndedAt: { type: Date },
        durationSec: { type: Number },
        transcript: { type: [segmentSchema], default: [] },
        summary: { type: summarySchema },
        failureReason: { type: String },
        approvedAt: { type: Date },
        amendedAt: { type: Date },
    },
    { timestamps: true }
);

consultationSchema.index({ patient: 1, status: 1, createdAt: -1 });
consultationSchema.index({ doctor: 1, createdAt: -1 });

export default mongoose.model<IConsultation>('Consultation', consultationSchema);
