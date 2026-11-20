import AiChatConsent from 'ai-chat/models/aiChatConsent.model';
import AiChatMessage from 'ai-chat/models/aiChatMessage.model';
import AiChatUsage from 'ai-chat/models/aiChatUsage.model';
import type { AiChatIdentity } from 'ai-chat/middleware/aiChatIdentity';

/**
 * Bump this whenever the privacy notice text changes: everyone is asked to
 * accept the new version before their next AI chat.
 */
export const AI_CHAT_CONSENT_VERSION = '2026-11-20';

const GUEST_CONSENT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const consentKey = (identity: AiChatIdentity) =>
    identity.kind === 'user' ? `user:${identity.userId}` : `guest:${identity.guestId}`;

export const hasCurrentConsent = async (identity: AiChatIdentity) =>
    !!(await AiChatConsent.exists({ key: consentKey(identity), version: AI_CHAT_CONSENT_VERSION }));

export const recordConsent = async (identity: AiChatIdentity, now = new Date()) => {
    await AiChatConsent.updateOne(
        { key: consentKey(identity) },
        {
            $set: {
                version: AI_CHAT_CONSENT_VERSION,
                acceptedAt: now,
                ...(identity.kind === 'guest' && { expiresAt: new Date(now.getTime() + GUEST_CONSENT_DAYS * DAY_MS) }),
            },
        },
        { upsert: true }
    );
};

/** Everything we hold about the caller's AI chat, as plain JSON. */
export const exportAiChatData = async (identity: AiChatIdentity, now = new Date()) => {
    const key = consentKey(identity);
    const usageKey = identity.kind === 'user' ? `user:${identity.userId}` : `guest:${identity.guestId}`;

    const [consent, usage, messages] = await Promise.all([
        AiChatConsent.findOne({ key }).select('-_id version acceptedAt').lean(),
        AiChatUsage.find({ key: usageKey }).select('-_id day count').sort({ day: -1 }).lean(),
        identity.kind === 'user'
            ? AiChatMessage.find({ userId: identity.userId })
                  .sort({ createdAt: 1, _id: 1 })
                  .select('-_id role content type sources actions createdAt')
                  .lean()
            : Promise.resolve([]),
    ]);

    return {
        exportedAt: now.toISOString(),
        account: identity.kind === 'user' ? { type: 'patient', id: identity.userId } : { type: 'guest' },
        consent: consent ?? null,
        dailyQuestionCounts: usage,
        messages,
        retention: {
            messages:
                identity.kind === 'user'
                    ? 'Deleted after 30 days, or kept while you have an active booking.'
                    : 'Guest messages are never stored on our servers.',
            dailyQuestionCounts: 'Deleted after 7 days.',
        },
    };
};

/**
 * Delete the caller's AI chat data now: messages and consent. Daily question
 * counters are kept (no content; deleted automatically after 7 days) so that
 * deleting data can't be used to reset the free daily limit.
 */
export const deleteAiChatData = async (identity: AiChatIdentity) => {
    const [messages, consent] = await Promise.all([
        identity.kind === 'user' ? AiChatMessage.deleteMany({ userId: identity.userId }) : Promise.resolve({ deletedCount: 0 }),
        AiChatConsent.deleteOne({ key: consentKey(identity) }),
    ]);
    return { deletedMessages: messages.deletedCount ?? 0, deletedConsent: (consent.deletedCount ?? 0) > 0 };
};
