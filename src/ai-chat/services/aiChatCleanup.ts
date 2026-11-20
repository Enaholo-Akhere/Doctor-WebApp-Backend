import cron from 'node-cron';
import Booking from 'models/BookingSchema';
import AiChatMessage from 'ai-chat/models/aiChatMessage.model';
import AiChatUsage from 'ai-chat/models/aiChatUsage.model';
import AiChatConsent from 'ai-chat/models/aiChatConsent.model';
import { AI_CHAT_BOOKING_VALID_DAYS } from './aiChatPlan';
import { winston_logger } from '@utils/logger';

const DAY_MS = 24 * 60 * 60 * 1000;
export const AI_CHAT_MESSAGE_RETENTION_DAYS = 30;
export const AI_CHAT_USAGE_RETENTION_DAYS = 7;

/** Users whose bookings currently grant unlimited access (their messages are kept). */
const usersWithActiveBooking = async (now: Date) => {
    const cutoff = new Date(now.getTime() - AI_CHAT_BOOKING_VALID_DAYS * DAY_MS);
    return Booking.distinct('user', {
        isPaid: true,
        status: { $ne: 'cancelled' },
        $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false }, createdAt: { $gt: cutoff } }],
    });
};

/**
 * Daily retention clean-up:
 * - ai_chat_messages older than 30 days, unless the user has an active booking
 * - ai_chat_usage older than 7 days (also enforced by a TTL index)
 * - expired guest consent rows (also enforced by a TTL index)
 * Logs counts only.
 */
export const runAiChatCleanup = async (now: Date = new Date()) => {
    const keepUsers = await usersWithActiveBooking(now);
    const [messages, usage, consent] = await Promise.all([
        AiChatMessage.deleteMany({
            createdAt: { $lt: new Date(now.getTime() - AI_CHAT_MESSAGE_RETENTION_DAYS * DAY_MS) },
            userId: { $nin: keepUsers },
        }),
        AiChatUsage.deleteMany({ createdAt: { $lt: new Date(now.getTime() - AI_CHAT_USAGE_RETENTION_DAYS * DAY_MS) } }),
        AiChatConsent.deleteMany({ expiresAt: { $lt: now } }),
    ]);
    const result = {
        messagesDeleted: messages.deletedCount ?? 0,
        usageRowsDeleted: usage.deletedCount ?? 0,
        guestConsentsDeleted: consent.deletedCount ?? 0,
    };
    winston_logger.info(
        `ai-chat cleanup: ${result.messagesDeleted} messages, ${result.usageRowsDeleted} usage rows, ${result.guestConsentsDeleted} guest consents deleted`
    );
    return result;
};

let task: cron.ScheduledTask | null = null;

/** Schedule the daily clean-up (default 03:15 UTC; override with AI_CHAT_CLEANUP_CRON). */
export const startAiChatCleanupJob = () => {
    if (task) return task;
    const schedule = process.env.AI_CHAT_CLEANUP_CRON || '15 3 * * *';
    if (!cron.validate(schedule)) {
        winston_logger.error('ai-chat cleanup: invalid AI_CHAT_CLEANUP_CRON, job not scheduled');
        return null;
    }
    task = cron.schedule(
        schedule,
        () => {
            runAiChatCleanup().catch(() => winston_logger.error('ai-chat cleanup failed'));
        },
        { timezone: 'UTC' }
    );
    return task;
};
