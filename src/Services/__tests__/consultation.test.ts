import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

vi.mock('Services/transcriptionService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('Services/transcriptionService')>();
    return { ...actual, transcribe: vi.fn(), summarize: vi.fn() };
});

import Consultation from 'models/ConsultationSchema';
import RecordAccessLog from 'models/RecordAccessLogSchema';
import { RECORDING_NOTICE } from 'config/recording';
import {
    acceptAudio,
    Actor,
    approve,
    createRecording,
    deleteRecord,
    getRecord,
    listForDoctor,
    listForPatient,
    processRecording,
    updateSummary,
} from 'Services/consultationService';
import { mergeTracks, parseSummary, summarize, toSegments, transcribe } from 'Services/transcriptionService';

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
    await Promise.all([Consultation.deleteMany({}), RecordAccessLog.deleteMany({})]);
});

const newId = () => new mongoose.Types.ObjectId().toString();
const doctor: Actor = { id: newId(), role: 'doctor' };
const patient: Actor = { id: newId(), role: 'patient' };
const otherDoctor: Actor = { id: newId(), role: 'doctor' };
const otherPatient: Actor = { id: newId(), role: 'patient' };

const SUMMARY = {
    chiefComplaint: 'Headache for three days',
    symptoms: ['headache', 'nausea'],
    assessment: 'Tension headache',
    plan: 'Rest and hydration',
    medications: ['Paracetamol 500mg as needed'],
    followUp: 'In one week if not better',
};
const TRANSCRIPT = [{ speaker: 'patient' as const, startSec: 0, endSec: 2, text: 'I have a headache.' }];
const TRACK = { speaker: 'doctor' as const, buffer: Buffer.from('audio'), mimeType: 'audio/webm' };

const newRecording = () =>
    createRecording({
        callId: '11111111-1111-4111-8111-111111111111',
        callType: 'audio',
        doctorId: doctor.id,
        patientId: patient.id,
        doctorConsentedAt: new Date(),
        patientConsentedAt: new Date(),
    });

/** A record that has been transcribed and is awaiting the doctor's review. */
const reviewedRecording = async () => {
    const record = await newRecording();
    await Consultation.updateOne({ _id: record._id }, { status: 'pending_review', transcript: TRANSCRIPT, summary: SUMMARY });
    return String(record._id);
};

const expect404 = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ statusCode: 404 });

describe('creating a recording', () => {
    it('stores both consents and the notice version, and logs the creation', async () => {
        const record = await newRecording();
        expect(record.status).toBe('recording');
        expect(record.consent.noticeVersion).toBe(RECORDING_NOTICE.version);
        expect(record.consent.patientConsentedAt).toBeInstanceOf(Date);
        await vi.waitFor(async () => expect(await RecordAccessLog.countDocuments({ action: 'create' })).toBe(1));
    });
});

describe('processing audio', () => {
    it('saves the transcript and AI summary for review', async () => {
        vi.mocked(transcribe).mockResolvedValue(TRANSCRIPT);
        vi.mocked(summarize).mockResolvedValue(SUMMARY);
        const id = String((await newRecording())._id);

        await processRecording(id, [TRACK]);

        const saved = await Consultation.findById(id).lean();
        expect(saved?.status).toBe('pending_review');
        expect(saved?.transcript[0].text).toBe('I have a headache.');
        expect(saved?.summary?.assessment).toBe('Tension headache');
    });

    it('marks the record failed when transcription fails', async () => {
        vi.mocked(transcribe).mockRejectedValue(new Error('provider down'));
        const id = String((await newRecording())._id);

        await processRecording(id, [TRACK]);

        const saved = await Consultation.findById(id).lean();
        expect(saved?.status).toBe('failed');
        expect(saved?.failureReason).toMatch(/audio was not kept/);
    });

    it('only accepts audio once, and only from the recording doctor', async () => {
        vi.mocked(transcribe).mockResolvedValue(TRANSCRIPT);
        vi.mocked(summarize).mockResolvedValue(SUMMARY);
        const id = String((await newRecording())._id);

        await expect404(acceptAudio(id, otherDoctor, [TRACK]));
        await expect404(acceptAudio(id, patient, [TRACK]));
        await acceptAudio(id, doctor, [TRACK], 300);
        await expect(acceptAudio(id, doctor, [TRACK])).rejects.toMatchObject({ statusCode: 409 });
    });
});

describe('who can see a record', () => {
    it('hides drafts from the patient until the doctor approves', async () => {
        const id = await reviewedRecording();

        await expect404(getRecord(id, patient));
        expect(await listForPatient(patient)).toHaveLength(0);

        await approve(id, doctor);

        expect((await getRecord(id, patient)).summary?.chiefComplaint).toBe(SUMMARY.chiefComplaint);
        expect(await listForPatient(patient)).toHaveLength(1);
    });

    it('never shows a record to other doctors or patients', async () => {
        const id = await reviewedRecording();
        await approve(id, doctor);

        await expect404(getRecord(id, otherDoctor));
        await expect404(getRecord(id, otherPatient));
        expect(await listForDoctor(otherDoctor)).toHaveLength(0);
        expect(await listForPatient(otherPatient)).toHaveLength(0);
    });

    it('logs every view', async () => {
        const id = await reviewedRecording();
        await getRecord(id, doctor);
        await vi.waitFor(async () => expect(await RecordAccessLog.countDocuments({ action: 'view' })).toBe(1));
    });
});

describe('doctor review', () => {
    it('lets the doctor edit before approving, and marks later edits as amendments', async () => {
        const id = await reviewedRecording();

        const edited = await updateSummary(id, doctor, { ...SUMMARY, assessment: 'Migraine' });
        expect(edited.summary?.assessment).toBe('Migraine');
        expect(edited.amendedAt).toBeUndefined();

        await approve(id, doctor);
        const amended = await updateSummary(id, doctor, { ...SUMMARY, followUp: 'In two weeks' });
        expect(amended.amendedAt).toBeInstanceOf(Date);
    });

    it('rejects edits from anyone but the recording doctor', async () => {
        const id = await reviewedRecording();
        await expect404(updateSummary(id, otherDoctor, SUMMARY));
        await expect404(updateSummary(id, patient, SUMMARY));
        await expect404(approve(id, otherDoctor));
    });

    it('cannot approve a record that is not awaiting review', async () => {
        const id = String((await newRecording())._id);
        await expect(approve(id, doctor)).rejects.toMatchObject({ statusCode: 409 });
    });
});

describe('deleting a record', () => {
    it('lets the doctor discard a draft but not an approved record', async () => {
        const draft = await reviewedRecording();
        await deleteRecord(draft, doctor);
        expect(await Consultation.findById(draft)).toBeNull();

        const approved = await reviewedRecording();
        await approve(approved, doctor);
        await expect(deleteRecord(approved, doctor)).rejects.toMatchObject({ statusCode: 409 });
    });

    it('lets the patient delete their approved record, and keeps the audit log', async () => {
        const id = await reviewedRecording();
        await approve(id, doctor);

        await expect404(deleteRecord(id, otherPatient));
        await deleteRecord(id, patient);

        expect(await Consultation.findById(id)).toBeNull();
        await vi.waitFor(async () => expect(await RecordAccessLog.countDocuments({ action: 'delete' })).toBe(1));
    });

    it('does not let the patient delete a draft they cannot see', async () => {
        const id = await reviewedRecording();
        await expect404(deleteRecord(id, patient));
    });
});

describe('transcript helpers', () => {
    it('drops likely non-speech segments and interleaves both speakers by time', () => {
        const doctorSegs = toSegments('doctor', [
            { start: 0, end: 2, text: ' How can I help? ' },
            { start: 5, end: 6, text: 'Thank you for watching.', no_speech_prob: 0.9 },
            { start: 8, end: 10, text: 'Any fever?' },
        ]);
        const patientSegs = toSegments('patient', [
            { start: 3, end: 5, text: 'I have a headache.' },
            { start: 11, end: 12, text: 'No.' },
        ]);

        expect(mergeTracks(doctorSegs, patientSegs).map((s) => `${s.speaker}: ${s.text}`)).toEqual([
            'doctor: How can I help?',
            'patient: I have a headache.',
            'doctor: Any fever?',
            'patient: No.',
        ]);
    });

    it('parses the summary defensively', () => {
        const parsed = parseSummary(
            'Here you go: {"chiefComplaint":" Cough ","symptoms":["cough",""," fever ",3],"assessment":null,"extra":"x"}'
        );
        expect(parsed).toEqual({
            chiefComplaint: 'Cough',
            symptoms: ['cough', 'fever'],
            assessment: '',
            plan: '',
            medications: [],
            followUp: '',
        });
        expect(() => parseSummary('not json')).toThrow(/valid JSON/);
    });
});
