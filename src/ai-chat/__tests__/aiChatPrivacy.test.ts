import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Booking from 'models/BookingSchema';
import AiChatMessage from 'ai-chat/models/aiChatMessage.model';
import AiChatUsage from 'ai-chat/models/aiChatUsage.model';
import AiChatConsent from 'ai-chat/models/aiChatConsent.model';
import {
    AI_CHAT_CONSENT_VERSION,
    deleteAiChatData,
    exportAiChatData,
    hasCurrentConsent,
    recordConsent,
} from 'ai-chat/services/aiChatPrivacy';
import { runAiChatCleanup } from 'ai-chat/services/aiChatCleanup';
import { saveExchange } from 'ai-chat/services/aiChatHistory';
import type { AiChatIdentity } from 'ai-chat/middleware/aiChatIdentity';

let mongo: MongoMemoryServer;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(mongo.getUri());
    await Promise.all([AiChatMessage.syncIndexes(), AiChatUsage.syncIndexes(), AiChatConsent.syncIndexes()]);
}, 120_000);
afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});
afterEach(async () => {
    await Promise.all([Booking.deleteMany({}), AiChatMessage.deleteMany({}), AiChatUsage.deleteMany({}), AiChatConsent.deleteMany({})]);
});

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-20T03:15:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const newId = () => new mongoose.Types.ObjectId().toString();
const asUser = (userId: string): AiChatIdentity => ({ kind: 'user', userId, role: 'patient' });
const guest: AiChatIdentity = { kind: 'guest', guestId: '11111111-1111-4111-8111-111111111111', ipHash: 'h' };

describe('consent', () => {
    it('is required until the current version is accepted, with version and timestamp stored', async () => {
        const me = asUser(newId());
        expect(await hasCurrentConsent(me)).toBe(false);
        await recordConsent(me, NOW);
        expect(await hasCurrentConsent(me)).toBe(true);
        const row = await AiChatConsent.findOne().lean();
        expect(row).toMatchObject({ version: AI_CHAT_CONSENT_VERSION, acceptedAt: NOW });
        expect(row?.expiresAt).toBeUndefined(); // users' consent doesn't expire
    });

    it('asks again when the notice version changes', async () => {
        const me = asUser(newId());
        await AiChatConsent.create({ key: `user:${me.kind === 'user' && me.userId}`, version: 'old-version', acceptedAt: ago(10) });
        expect(await hasCurrentConsent(me)).toBe(false);
    });

    it('stores guest consent with a 30-day expiry', async () => {
        await recordConsent(guest, NOW);
        const row = await AiChatConsent.findOne({ key: `guest:${guest.kind === 'guest' && guest.guestId}` }).lean();
        expect(row?.expiresAt?.toISOString()).toBe(new Date(NOW.getTime() + 30 * DAY).toISOString());
    });
});

describe('export and delete', () => {
    it("exports only the caller's own data, then deletes messages and consent but keeps counters", async () => {
        const meId = newId();
        const otherId = newId();
        await recordConsent(asUser(meId), NOW);
        await saveExchange(meId, 'my question', { answer: 'my answer', type: 'answer' }, ago(1));
        await saveExchange(otherId, 'their question', { answer: 'their answer', type: 'answer' }, ago(1));
        await AiChatUsage.create({ key: `user:${meId}`, day: '2026-11-19', count: 2 });

        const data = await exportAiChatData(asUser(meId), NOW);
        expect(data.account).toEqual({ type: 'patient', id: meId });
        expect(data.consent).toMatchObject({ version: AI_CHAT_CONSENT_VERSION });
        expect(data.messages.map((m) => m.content)).toEqual(['my question', 'my answer']);
        expect(data.dailyQuestionCounts).toEqual([{ day: '2026-11-19', count: 2 }]);
        expect(JSON.stringify(data)).not.toContain('their');

        expect(await deleteAiChatData(asUser(meId))).toEqual({ deletedMessages: 2, deletedConsent: true });
        expect(await AiChatMessage.countDocuments({ userId: meId })).toBe(0);
        expect(await AiChatMessage.countDocuments({ userId: otherId })).toBe(2); // untouched
        expect(await hasCurrentConsent(asUser(meId))).toBe(false);
        // Counters stay, so deleting data can't reset the free daily limit.
        expect(await AiChatUsage.countDocuments({ key: `user:${meId}` })).toBe(1);
    });

    it('exports no messages for guests (never stored)', async () => {
        const data = await exportAiChatData(guest, NOW);
        expect(data.messages).toEqual([]);
        expect(data.account).toEqual({ type: 'guest' });
    });
});

describe('daily cleanup job', () => {
    it('applies the retention rules and reports counts', async () => {
        const plain = newId(); // no booking
        const booked = newId(); // active booking
        const expired = newId(); // booking expired

        for (const u of [plain, booked, expired]) {
            await saveExchange(u, 'old', { answer: 'old', type: 'answer' }, ago(31));
            await saveExchange(u, 'recent', { answer: 'recent', type: 'answer' }, ago(2));
        }
        const booking = (user: string, createdAt: Date) =>
            Booking.collection.insertOne({ user: new mongoose.Types.ObjectId(user), doctor: new mongoose.Types.ObjectId(), ticketPrice: '1', sessionId: 's', status: 'approved', isPaid: true, createdAt });
        await booking(booked, ago(10));
        await booking(expired, ago(40));

        await AiChatUsage.collection.insertMany([
            { key: 'guest:a', day: '2026-11-10', count: 3, createdAt: ago(10) },
            { key: 'guest:b', day: '2026-11-19', count: 1, createdAt: ago(1) },
        ]);
        await AiChatConsent.collection.insertMany([
            { key: 'guest:old', version: 'v', acceptedAt: ago(40), expiresAt: ago(10) },
            { key: 'guest:new', version: 'v', acceptedAt: ago(1), expiresAt: new Date(NOW.getTime() + 29 * DAY) },
        ]);

        const result = await runAiChatCleanup(NOW);
        expect(result).toEqual({ messagesDeleted: 4, usageRowsDeleted: 1, guestConsentsDeleted: 1 });

        // Old messages gone for users without an active booking; kept while a booking is active.
        expect(await AiChatMessage.countDocuments({ userId: plain })).toBe(2);
        expect(await AiChatMessage.countDocuments({ userId: expired })).toBe(2);
        expect(await AiChatMessage.countDocuments({ userId: booked })).toBe(4);
        expect(await AiChatUsage.countDocuments()).toBe(1);
        expect(await AiChatConsent.countDocuments()).toBe(1);
    });
});
