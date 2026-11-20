import express from 'express';
import rateLimit from 'express-rate-limit';
import validate from 'DTO_Validations/zod_validate';
import { asyncHandler } from '@utils/asyncHandler';
import { aiChatIdentity, hashIp } from './middleware/aiChatIdentity';
import { appError } from '@utils/appError';
import { aiChatRequestSchema } from './aiChat.validation';
import {
    deleteAiChatData,
    getAiChatExport,
    getAiChatMessages,
    getAiChatQuota,
    postAiChat,
    postAiChatConsent,
} from './aiChat.controller';

const router = express.Router();

/**
 * Per-IP burst protection, separate from the daily question quota.
 * Uses req.ip, which is the real client IP because `trust proxy` is set.
 */
const aiChatRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.AI_CHAT_RATE_LIMIT_PER_MINUTE) || 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Count by salted IP hash so raw IPs aren't kept even in memory.
    keyGenerator: (req) => hashIp(req.ip || req.socket.remoteAddress || 'unknown'),
    message: {
        success: false,
        code: 'AI_CHAT_RATE_LIMITED',
        message: 'Too many requests. Please wait a minute and try again.',
    },
});

/** HTTPS only in production (`trust proxy` makes req.secure reliable behind Render/Netlify). */
const requireHttps: express.RequestHandler = (req, _res, next) =>
    process.env.NODE_ENV === 'production' && !req.secure ? next(appError({ message: 'HTTPS is required', statusCode: 400 })) : next();

router.use(requireHttps);
router.use(aiChatRateLimit);

// Plain HTTP only: the AI chat never uses the real-time socket layer.
router.get('/quota', aiChatIdentity, asyncHandler(getAiChatQuota));
router.get('/messages', aiChatIdentity, asyncHandler(getAiChatMessages));
router.get('/export', aiChatIdentity, asyncHandler(getAiChatExport));
router.post('/consent', aiChatIdentity, asyncHandler(postAiChatConsent));
router.delete('/data', aiChatIdentity, asyncHandler(deleteAiChatData));
router.post('/', aiChatIdentity, validate(aiChatRequestSchema), asyncHandler(postAiChat));

export default router;
