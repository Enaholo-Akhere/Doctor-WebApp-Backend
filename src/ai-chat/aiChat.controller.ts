import { NextFunction, Request, Response } from 'express';
import { appError } from '@utils/appError';
import { winston_logger } from '@utils/logger';
import { AiChatLlmError } from './llm';
import { AI_CHAT_DISCLAIMER } from './aiChat.constants';
import { aiChatRequestSchema } from './aiChat.validation';
import { AiChatTurn, handleAiChatMessage } from './services/aiChatService';
import { AiChatQuota, aiChatDailyLimit, nextUtcMidnight, quotaKeysFor } from './services/aiChatQuota';
import { getAiChatPlan } from './services/aiChatPlan';
import { listMessages, loadRecentTurns, saveExchange } from './services/aiChatHistory';
import {
    AI_CHAT_CONSENT_VERSION,
    deleteAiChatData as deleteAiChatDataFor,
    exportAiChatData,
    hasCurrentConsent,
    recordConsent,
} from './services/aiChatPrivacy';
import { scrubPii } from './services/aiChatPii';
import { detectEmergency } from './services/aiChatEmergency';
import { AI_CHAT_CRISIS_REPLY, AI_CHAT_EMERGENCY_REPLY } from './services/aiChatFixedReplies';
import type { AiChatIdentity } from './middleware/aiChatIdentity';

/** Where the "Book a doctor" button points when the daily limit is reached. */
export const AI_CHAT_BOOKING_PATH = '/doctors';

const identityOf = (res: Response): AiChatIdentity => res.locals.aiChat.identity;

interface AiChatAccess {
    /** undefined = unlimited (active booking). */
    quota?: AiChatQuota;
    planActiveUntil?: Date;
}

/** Active booking -> unlimited; otherwise the free daily quota. */
const accessFor = async (identity: AiChatIdentity): Promise<AiChatAccess> => {
    if (identity.kind === 'user') {
        const plan = await getAiChatPlan(identity.userId);
        if (plan.unlimited) return { planActiveUntil: plan.activeUntil };
    }
    return { quota: new AiChatQuota(quotaKeysFor(identity)) };
};

const quotaInfo = async (access: AiChatAccess, remaining?: number) =>
    access.quota
        ? {
              remainingQuestions: remaining ?? (await access.quota.remaining()),
              limit: aiChatDailyLimit(),
              resetsAt: access.quota.resetsAt.toISOString(),
          }
        : {
              remainingQuestions: null,
              limit: aiChatDailyLimit(),
              resetsAt: nextUtcMidnight(new Date()).toISOString(),
              planActiveUntil: access.planActiveUntil?.toISOString(),
          };

/** GET /ai-chat/quota: questions left today, plus whether the privacy notice must be accepted. */
export const getAiChatQuota = async (req: Request, res: Response) => {
    const identity = identityOf(res);
    const [info, consented] = await Promise.all([quotaInfo(await accessFor(identity)), hasCurrentConsent(identity)]);
    res.status(200).json({ ...info, consentRequired: !consented, consentVersion: AI_CHAT_CONSENT_VERSION });
};

/** POST /ai-chat/consent: accept the current privacy notice (version + timestamp stored). */
export const postAiChatConsent = async (req: Request, res: Response, next: NextFunction) => {
    if (req.body?.version !== AI_CHAT_CONSENT_VERSION) {
        return next(appError({ message: 'The privacy notice has changed. Please review it again.', statusCode: 409 }));
    }
    await recordConsent(identityOf(res));
    res.status(200).json({ success: true, consentVersion: AI_CHAT_CONSENT_VERSION });
};

/** GET /ai-chat/export: the caller's AI chat data as a JSON download. */
export const getAiChatExport = async (req: Request, res: Response) => {
    const data = await exportAiChatData(identityOf(res));
    res.setHeader('Content-Disposition', `attachment; filename="careconnect-ai-chat-${data.exportedAt.slice(0, 10)}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
};

/** GET /ai-chat/messages: the signed-in patient's saved conversation. Guests have none. */
export const getAiChatMessages = async (req: Request, res: Response) => {
    const identity = identityOf(res);
    res.status(200).json({ messages: identity.kind === 'user' ? await listMessages(identity.userId) : [] });
};

/** DELETE /ai-chat/data: delete the caller's AI chat messages and consent now. */
export const deleteAiChatData = async (req: Request, res: Response) => {
    const result = await deleteAiChatDataFor(identityOf(res));
    winston_logger.info(`ai-chat data deleted (${result.deletedMessages} messages)`);
    res.status(200).json({ success: true, ...result });
};

export const postAiChat = async (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    // Re-parse to get trimmed values and defaults (validate() only checks).
    const body = aiChatRequestSchema.shape.body.parse(req.body);
    const identity = identityOf(res);

    // Personal identifiers never reach the LLM, the logs or the database.
    const message = scrubPii(body.message);

    try {
        if (!(await hasCurrentConsent(identity))) {
            // Safety first: an emergency still gets the fixed reply (no LLM, nothing stored).
            const urgent = detectEmergency(message);
            if (urgent) {
                res.status(200).json({
                    type: 'emergency',
                    answer: urgent === 'crisis' ? AI_CHAT_CRISIS_REPLY : AI_CHAT_EMERGENCY_REPLY,
                    sources: [],
                    actions: [],
                    disclaimer: AI_CHAT_DISCLAIMER,
                    remainingQuestions: null,
                });
                return;
            }
            res.status(428).json({
                success: false,
                code: 'AI_CHAT_CONSENT_REQUIRED',
                message: 'Please review and accept the AI assistant privacy notice first.',
                consentVersion: AI_CHAT_CONSENT_VERSION,
            });
            return;
        }

        const access = await accessFor(identity);
        // Signed-in history comes from the server; guests (never stored) send their own.
        const history: AiChatTurn[] =
            identity.kind === 'user'
                ? await loadRecentTurns(identity.userId)
                : body.history.map((t) => ({ role: t.role, content: scrubPii(t.content) }));

        const reply = await handleAiChatMessage(message, history, access.quota, { identity, now: new Date() });

        if (reply.type === 'limit') {
            res.status(429).json({
                success: false,
                code: 'AI_CHAT_LIMIT_REACHED',
                message: `You've used your ${aiChatDailyLimit()} free questions for today. Book a doctor for unlimited AI chat, or come back tomorrow.`,
                bookingUrl: AI_CHAT_BOOKING_PATH,
                ...(await quotaInfo(access, 0)),
            });
            winston_logger.info(`ai-chat limit reached (${identity.kind})`);
            return;
        }

        if (identity.kind === 'user') {
            // A history write failure must not lose the answer the user is waiting for.
            await saveExchange(identity.userId, message, reply).catch(() =>
                winston_logger.warn('ai-chat history save failed')
            );
        }

        res.status(200).json({
            type: reply.type,
            answer: reply.answer,
            sources: reply.sources ?? [],
            actions: reply.actions ?? [],
            disclaimer: AI_CHAT_DISCLAIMER,
            ...(await quotaInfo(access)),
        });
        // Metadata only: never log message content, emails or IPs.
        const plan = access.quota ? 'free' : 'unlimited';
        const tools = reply.toolsUsed?.length ? ` tools=[${reply.toolsUsed.join(',')}]` : '';
        winston_logger.info(`ai-chat ${reply.type} via ${reply.route} (${identity.kind}, ${plan})${tools} in ${Date.now() - started}ms`);
    } catch (error) {
        const status = error instanceof AiChatLlmError ? error.status : undefined;
        winston_logger.error(`ai-chat failure (provider status: ${status ?? 'n/a'})`);
        next(
            appError({
                message: 'The AI assistant is unavailable right now. Please try again in a moment.',
                statusCode: 503,
            })
        );
    }
};
