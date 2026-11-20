import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AUDIENCE } from 'config/constant';
import { verifyToken } from '@utils/generateTokens';
import { appError } from '@utils/appError';
import { winston_logger } from '@utils/logger';
import User from 'models/UserSchema';

export type AiChatIdentity =
    | { kind: 'user'; userId: string; role: string }
    | { kind: 'guest'; guestId: string; ipHash: string };

export const AI_CHAT_GUEST_COOKIE = 'ai_guest_id';
const GUEST_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let warnedMissingSalt = false;
const fallbackSalt = crypto.randomBytes(32).toString('hex');

/**
 * Salted, day-scoped hash of the client IP. The raw IP is never stored or
 * logged, and the hash changes every UTC day so it can't be used to track
 * a guest across days.
 */
export const hashIp = (ip: string, now: Date = new Date()) => {
    let salt = process.env.AI_CHAT_IP_SALT;
    if (!salt) {
        if (!warnedMissingSalt) {
            winston_logger.warn('AI_CHAT_IP_SALT is not set; using a per-process salt (guest IP limits reset on restart)');
            warnedMissingSalt = true;
        }
        salt = fallbackSalt;
    }
    return crypto.createHmac('sha256', salt).update(`${now.toISOString().slice(0, 10)}:${ip}`).digest('hex');
};

/** Reads or issues the HttpOnly guest cookie (random UUID, no personal data). */
const guestIdentity = (req: Request, res: Response): AiChatIdentity => {
    const existing = req.cookies?.[AI_CHAT_GUEST_COOKIE];
    let guestId = typeof existing === 'string' && UUID_RE.test(existing) ? existing : null;
    if (!guestId) {
        guestId = crypto.randomUUID();
        res.cookie(AI_CHAT_GUEST_COOKIE, guestId, {
            httpOnly: true,
            secure: true,
            // Production calls go through the Netlify proxy (same site), and
            // localhost:5173 -> localhost:5001 is same-site too.
            sameSite: 'lax',
            maxAge: GUEST_COOKIE_MAX_AGE_MS,
            path: '/api/v1/ai-chat',
        });
    }
    // `trust proxy` is set, so req.ip is the real client IP behind Render/Netlify.
    return { kind: 'guest', guestId, ipHash: hashIp(req.ip || req.socket.remoteAddress || 'unknown') };
};

/**
 * Optional auth for the AI chat. Unlike `sanitizedUser`, a missing or unusable
 * token means "guest" instead of an error.
 *
 * - Expired patient token -> 401 so the frontend refreshes and retries.
 * - Doctor token -> 404 (the assistant is hidden from doctors; never 403,
 *   which logs the user out on the frontend).
 */
export const aiChatIdentity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.get('authorization')?.split(' ')[1];
        if (!token) {
            res.locals.aiChat = { identity: guestIdentity(req, res) };
            return next();
        }

        const payload = jwt.decode(token) as jwt.JwtPayload | null;
        const aud = typeof payload?.aud === 'string' ? payload.aud : undefined;

        if (aud && aud === AUDIENCE.DOCTOR) {
            return next(appError({ message: 'The AI assistant is not available for doctor accounts', statusCode: 404 }));
        }

        if (!payload?.sub || !aud || aud !== AUDIENCE.PATIENT) {
            res.locals.aiChat = { identity: guestIdentity(req, res) };
            return next();
        }

        const { decoded, expired } = verifyToken(token, aud);
        if (expired) return next(appError({ message: 'Unauthorized. Access token expired.', statusCode: 401 }));

        const user = decoded && (decoded as jwt.JwtPayload).sub ? await User.findById(payload.sub).select('role refreshedToken') : null;

        // Logged-out or unknown users fall back to guest access.
        const identity: AiChatIdentity = user?.refreshedToken
            ? { kind: 'user', userId: String(user._id), role: user.role ?? 'patient' }
            : guestIdentity(req, res);

        res.locals.aiChat = { identity };
        next();
    } catch (error) {
        next(error);
    }
};
