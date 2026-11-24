import { Request, Response } from 'express';
import { appError } from '@utils/appError';
import { isTranscriptionEnabled, RECORDING_NOTICE } from 'config/recording';
import { isChatRole } from 'Services/chatService';
import {
    acceptAudio,
    Actor,
    approve,
    deleteRecord,
    getRecord,
    listForDoctor,
    listForPatient,
    updateSummary,
} from 'Services/consultationService';
import { AudioTrack } from 'Services/transcriptionService';
import { TranscriptSpeaker } from 'models/ConsultationSchema';

const actorFrom = (res: Response): Actor => {
    const { id, role } = res.locals.auth ?? {};
    if (!isChatRole(role)) throw appError({ message: 'Record not found', statusCode: 404 });
    return { id: String(id), role };
};

// GET /consultations/config
export const getConfig = (_req: Request, res: Response) => {
    res.status(200).json({ enabled: isTranscriptionEnabled(), notice: RECORDING_NOTICE });
};

// GET /consultations  (doctor: everything they recorded; patient: their approved records)
export const listRecords = async (_req: Request, res: Response) => {
    const actor = actorFrom(res);
    const records = actor.role === 'doctor' ? await listForDoctor(actor) : await listForPatient(actor);
    res.status(200).json({ records });
};

// GET /consultations/:id
export const getRecordById = async (req: Request, res: Response) => {
    const record = await getRecord(req.params.id, actorFrom(res));
    res.status(200).json({ record });
};

// POST /consultations/:id/audio   multipart: doctor, patient (audio), durationSec
export const uploadAudio = async (req: Request, res: Response) => {
    if (!isTranscriptionEnabled()) {
        throw appError({ message: 'Call transcription is turned off', statusCode: 503 });
    }
    const files = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>;
    const tracks: AudioTrack[] = (['doctor', 'patient'] as TranscriptSpeaker[]).flatMap((speaker) => {
        const file = files[speaker]?.[0];
        return file?.size ? [{ speaker, buffer: file.buffer, mimeType: file.mimetype }] : [];
    });
    const duration = Number(req.body?.durationSec);
    const record = await acceptAudio(
        req.params.id,
        actorFrom(res),
        tracks,
        Number.isFinite(duration) && duration > 0 ? Math.round(duration) : undefined
    );
    res.status(202).json({ record: { _id: record._id, status: record.status } });
};

// PATCH /consultations/:id   { summary }
export const patchSummary = async (req: Request, res: Response) => {
    const record = await updateSummary(req.params.id, actorFrom(res), req.body.summary);
    res.status(200).json({ record });
};

// POST /consultations/:id/approve
export const approveRecord = async (req: Request, res: Response) => {
    const record = await approve(req.params.id, actorFrom(res));
    res.status(200).json({ record });
};

// DELETE /consultations/:id
export const removeRecord = async (req: Request, res: Response) => {
    await deleteRecord(req.params.id, actorFrom(res));
    res.status(200).json({ message: 'Record deleted' });
};
