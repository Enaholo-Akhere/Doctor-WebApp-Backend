import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { appError } from '@utils/appError';
import { asyncHandler } from '@utils/asyncHandler';
import { sanitizedUser } from 'Middleware/sanitized';
import { restrict } from 'Middleware/auth';
import validate from 'DTO_Validations/zod_validate';
import { MAX_RECORDING_BYTES } from 'config/recording';
import {
    approveRecord,
    getConfig,
    getRecordById,
    listRecords,
    patchSummary,
    removeRecord,
    uploadAudio,
} from 'Controllers/consultationController';

const router = express.Router();

const text = z.string().trim().max(2000);
const items = z.array(z.string().trim().min(1).max(200)).max(30);
const summarySchema = z.object({
    body: z.object({
        summary: z.object({
            chiefComplaint: text,
            symptoms: items,
            assessment: text,
            plan: text,
            medications: items,
            followUp: text,
        }),
    }),
});

// Audio is kept in memory only, handed to the transcription provider, then dropped.
const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_RECORDING_BYTES, files: 2 },
    fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('audio/')),
}).fields([
    { name: 'doctor', maxCount: 1 },
    { name: 'patient', maxCount: 1 },
]);

const receiveAudio: express.RequestHandler = (req, res, next) =>
    audioUpload(req, res, (err: unknown) => {
        if (!err) return next();
        const code = (err as { code?: string }).code;
        const message =
            code === 'LIMIT_FILE_SIZE'
                ? `Recording is too large (max ${MAX_RECORDING_BYTES / 1024 / 1024} MB per track)`
                : 'Could not read the uploaded audio';
        next(appError({ message, statusCode: 400 }));
    });

const anyone = [sanitizedUser, restrict(['patient', 'doctor'])];
const doctorOnly = [sanitizedUser, restrict(['doctor'])];

router.get('/config', anyone, getConfig);
router.get('/', anyone, asyncHandler(listRecords));
router.get('/:id', anyone, asyncHandler(getRecordById));
// Auth runs before multer so unauthenticated uploads are never buffered.
router.post('/:id/audio', doctorOnly, receiveAudio, asyncHandler(uploadAudio));
router.patch('/:id', doctorOnly, validate(summarySchema), asyncHandler(patchSummary));
router.post('/:id/approve', doctorOnly, asyncHandler(approveRecord));
router.delete('/:id', anyone, asyncHandler(removeRecord));

export default router;
