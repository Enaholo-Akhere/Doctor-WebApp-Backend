import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Booking from 'models/BookingSchema';
import AiChatUsage from 'ai-chat/models/aiChatUsage.model';
import AiChatMessage from 'ai-chat/models/aiChatMessage.model';
import { clearAiChatPlanCache, findActiveBookingPlan, getAiChatPlan } from 'ai-chat/services/aiChatPlan';
import { AiChatQuota, quotaKeysFor } from 'ai-chat/services/aiChatQuota';
import { handleAiChatMessage } from 'ai-chat/services/aiChatService';
import { loadRecentTurns, saveExchange, listMessages, deleteMessages } from 'ai-chat/services/aiChatHistory';
import { setLlmProvider, LlmProvider } from 'ai-chat/llm';

let mongo: MongoMemoryServer;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(mongo.getUri());
    await Promise.all([AiChatUsage.syncIndexes(), AiChatMessage.syncIndexes()]);
}, 120_000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});

const userId = new mongoose.Types.ObjectId().toString();
const doctorId = new mongoose.Types.ObjectId();
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-20T12:00:00Z');
const daysAgo = (n: number, from = NOW) => new Date(from.getTime() - n * DAY);

/** Insert a booking directly with a chosen createdAt (timestamps off for the insert). */
const addBooking = async (opts: { createdAt: Date; isPaid?: boolean; status?: string; expiresAt?: Date; user?: string }) => {
    await Booking.collection.insertOne({
        doctor: doctorId,
        user: new mongoose.Types.ObjectId(opts.user ?? userId),
        ticketPrice: '100',
        sessionId: 'sess',
        status: opts.status ?? 'approved',
        isPaid: opts.isPaid ?? true,
        createdAt: opts.createdAt,
        updatedAt: opts.createdAt,
        ...(opts.expiresAt && { expiresAt: opts.expiresAt }),
    });
};

beforeEach(() => {
    clearAiChatPlanCache();
    const provider: LlmProvider = {
        name: 'fake',
        async complete(req) {
            if (req.json) return { content: '{"label":"health"}', toolCalls: [], finishReason: 'stop' };
            return { content: 'answer', toolCalls: [], finishReason: 'stop' };
        },
    };
    setLlmProvider(provider);
});

afterEach(async () => {
    await Promise.all([Booking.deleteMany({}), AiChatUsage.deleteMany({}), AiChatMessage.deleteMany({})]);
    setLlmProvider(null);
});

describe('active booking => unlimited', () => {
    it('a paid booking from 5 days ago is active until createdAt + 30 days', async () => {
        await addBooking({ createdAt: daysAgo(5) });
        const plan = await findActiveBookingPlan(userId, NOW);
        expect(plan.unlimited).toBe(true);
        expect(plan.activeUntil?.toISOString()).toBe(new Date(daysAgo(5).getTime() + 30 * DAY).toISOString());
    });

    it.each([
        ['unpaid', { createdAt: daysAgo(1), isPaid: false }],
        ['cancelled', { createdAt: daysAgo(1), status: 'cancelled' }],
        ['older than 30 days', { createdAt: daysAgo(31) }],
        ['past its own expiry', { createdAt: daysAgo(1), expiresAt: daysAgo(0.5) }],
        ["someone else's", { createdAt: daysAgo(1), user: new mongoose.Types.ObjectId().toString() }],
    ])('is not unlimited for a booking that is %s', async (_label, opts) => {
        await addBooking(opts);
        expect((await findActiveBookingPlan(userId, NOW)).unlimited).toBe(false);
    });

    it('counts a pending (not yet approved) booking once it is paid', async () => {
        await addBooking({ createdAt: daysAgo(2), status: 'pending', isPaid: true });
        expect((await findActiveBookingPlan(userId, NOW)).unlimited).toBe(true);
    });

    it("uses the booking's own expiry when it has one", async () => {
        const expiresAt = new Date(NOW.getTime() + 60 * DAY);
        await addBooking({ createdAt: daysAgo(45), expiresAt });
        expect((await findActiveBookingPlan(userId, NOW)).activeUntil?.toISOString()).toBe(expiresAt.toISOString());
    });

    it('never modifies bookings', async () => {
        await addBooking({ createdAt: daysAgo(5) });
        const before = await Booking.collection.find().toArray();
        await getAiChatPlan(userId, NOW);
        expect(await Booking.collection.find().toArray()).toEqual(before);
    });
});

describe('plan cache (~10 minutes)', () => {
    it('reuses the result for 10 minutes, then re-checks', async () => {
        expect((await getAiChatPlan(userId, NOW)).unlimited).toBe(false);
        await addBooking({ createdAt: NOW });
        expect((await getAiChatPlan(userId, new Date(NOW.getTime() + 9 * 60_000))).unlimited).toBe(false); // cached
        expect((await getAiChatPlan(userId, new Date(NOW.getTime() + 11 * 60_000))).unlimited).toBe(true); // re-checked
    });

    it('never serves a cached "unlimited" past the booking expiry', async () => {
        const createdAt = new Date(NOW.getTime() - 30 * DAY + 5 * 60_000); // expires in 5 minutes
        await addBooking({ createdAt });
        expect((await getAiChatPlan(userId, NOW)).unlimited).toBe(true);
        expect((await getAiChatPlan(userId, new Date(NOW.getTime() + 6 * 60_000))).unlimited).toBe(false);
    });
});

describe('quota with bookings', () => {
    /** One request the way the controller does it: plan check, then quota only if not unlimited. */
    const askAt = async (now: Date) => {
        const plan = await getAiChatPlan(userId, now);
        const quota = plan.unlimited ? undefined : new AiChatQuota(quotaKeysFor({ kind: 'user', userId, role: 'patient' }), now);
        return handleAiChatMessage('How can I sleep better?', [], quota);
    };

    it('is unlimited during an active booking', async () => {
        await addBooking({ createdAt: daysAgo(3) });
        for (let i = 0; i < 6; i++) expect((await askAt(NOW)).type).toBe('answer');
        expect(await AiChatUsage.countDocuments()).toBe(0); // nothing counted
    });

    it('reverts to 3 per day once the booking expires', async () => {
        const createdAt = daysAgo(29);
        await addBooking({ createdAt });
        // Day 29: unlimited.
        for (let i = 0; i < 5; i++) expect((await askAt(NOW)).type).toBe('answer');

        // Day 31: booking expired -> back to the free quota.
        const later = new Date(createdAt.getTime() + 31 * DAY);
        for (let i = 0; i < 3; i++) expect((await askAt(later)).type).toBe('answer');
        expect((await askAt(later)).type).toBe('limit');
    });
});

describe('message history (signed-in only)', () => {
    it('saves exchanges and returns the last 10 turns oldest-first', async () => {
        const start = NOW.getTime();
        for (let i = 0; i < 12; i++) {
            await saveExchange(userId, `q${i}`, { answer: `a${i}`, type: 'answer' }, new Date(start + i * 1000));
        }
        const turns = await loadRecentTurns(userId);
        expect(turns).toHaveLength(20);
        expect(turns[0]).toEqual({ role: 'user', content: 'q2' });
        expect(turns.at(-1)).toEqual({ role: 'assistant', content: 'a11' });

        const listed = await listMessages(userId);
        expect(listed.at(-1)).toMatchObject({ role: 'assistant', content: 'a11', type: 'answer' });

        expect(await deleteMessages(userId)).toBe(24);
        expect(await listMessages(userId)).toEqual([]);
    });
});
