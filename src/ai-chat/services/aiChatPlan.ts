import mongoose from 'mongoose';
import Booking from 'models/BookingSchema';

/**
 * Which AI chat plan a signed-in patient is on.
 *
 * Unlimited while they have an ACTIVE booking:
 *   - isPaid: true and not cancelled
 *   - still within its validity: the booking's own `expiresAt` if it has one,
 *     otherwise createdAt + 30 days
 * Everyone else gets the free daily quota.
 *
 * Bookings are only ever READ here, never modified.
 */

export const AI_CHAT_BOOKING_VALID_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
export const AI_CHAT_PLAN_CACHE_MS = 10 * 60 * 1000;

export interface AiChatPlan {
    unlimited: boolean;
    /** When the active booking stops granting unlimited access. */
    activeUntil?: Date;
}

interface BookingLike {
    createdAt: Date;
    expiresAt?: Date;
}

export const bookingActiveUntil = (b: BookingLike) =>
    b.expiresAt ? new Date(b.expiresAt) : new Date(new Date(b.createdAt).getTime() + AI_CHAT_BOOKING_VALID_DAYS * DAY_MS);

/** Uncached lookup of the user's active booking (latest-expiring first). */
export const findActiveBookingPlan = async (userId: string, now: Date = new Date()): Promise<AiChatPlan> => {
    if (!mongoose.isValidObjectId(userId)) return { unlimited: false };
    const cutoff = new Date(now.getTime() - AI_CHAT_BOOKING_VALID_DAYS * DAY_MS);

    const candidates = await Booking.find({
        user: userId,
        isPaid: true,
        status: { $ne: 'cancelled' },
        // Own expiry if present, otherwise the 30-day window from creation.
        $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false }, createdAt: { $gt: cutoff } }],
    })
        .select('createdAt expiresAt')
        .lean<BookingLike[]>();

    const activeUntil = candidates
        .map(bookingActiveUntil)
        .filter((d) => d > now)
        .sort((a, b) => b.getTime() - a.getTime())[0];

    return activeUntil ? { unlimited: true, activeUntil } : { unlimited: false };
};

/**
 * ~10 minute cache so every message doesn't hit the bookings collection.
 * A cached "unlimited" never outlives the booking itself, so access drops back
 * to the free quota as soon as the booking expires.
 */
const cache = new Map<string, { plan: AiChatPlan; until: number }>();

export const getAiChatPlan = async (userId: string, now: Date = new Date()): Promise<AiChatPlan> => {
    const hit = cache.get(userId);
    if (hit && hit.until > now.getTime()) return hit.plan;

    const plan = await findActiveBookingPlan(userId, now);
    const until = Math.min(now.getTime() + AI_CHAT_PLAN_CACHE_MS, plan.activeUntil?.getTime() ?? Infinity);
    cache.set(userId, { plan, until });
    return plan;
};

/** Test hook. */
export const clearAiChatPlanCache = () => cache.clear();
