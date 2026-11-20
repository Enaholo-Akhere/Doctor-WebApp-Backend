import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AiChatUsage from 'ai-chat/models/aiChatUsage.model';
import { AiChatQuota, quotaKeysFor } from 'ai-chat/services/aiChatQuota';
import { handleAiChatMessage } from 'ai-chat/services/aiChatService';
import { setLlmProvider, LlmProvider } from 'ai-chat/llm';
import type { AiChatIdentity } from 'ai-chat/middleware/aiChatIdentity';

let mongo: MongoMemoryServer;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await mongoose.connect(mongo.getUri());
    await AiChatUsage.syncIndexes();
}, 120_000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});

afterEach(async () => {
    await AiChatUsage.deleteMany({});
    setLlmProvider(null);
});

/** Fake LLM: the classifier returns `label`; answers succeed unless `failAnswers`. */
let label = 'health';
let failAnswers = false;
let llmCalls = 0;
beforeEach(() => {
    label = 'health';
    failAnswers = false;
    llmCalls = 0;
    const provider: LlmProvider = {
        name: 'fake',
        async complete(req) {
            llmCalls++;
            if (req.json) return { content: JSON.stringify({ label }), toolCalls: [], finishReason: 'stop' };
            if (failAnswers) throw new Error('provider down');
            return { content: 'answer', toolCalls: [], finishReason: 'stop' };
        },
    };
    setLlmProvider(provider);
});

const guest = (guestId = 'g-1', ipHash = 'ip-1'): AiChatIdentity => ({ kind: 'guest', guestId, ipHash });
const user: AiChatIdentity = { kind: 'user', userId: 'u-1', role: 'patient' };

const DAY_1 = new Date('2026-11-20T10:00:00Z');
const DAY_1_LATE = new Date('2026-11-20T23:59:59Z');
const DAY_2 = new Date('2026-11-21T00:00:01Z');

/** Ask one question as `who` at time `now` (a fresh quota per request, like the controller). */
const ask = (who: AiChatIdentity, now = DAY_1, message = 'How can I sleep better?') =>
    handleAiChatMessage(message, [], new AiChatQuota(quotaKeysFor(who), now));

const remaining = (who: AiChatIdentity, now = DAY_1) => new AiChatQuota(quotaKeysFor(who), now).remaining();

describe('daily quota: 3 answered health questions per UTC day', () => {
    it('allows the 3rd question and blocks the 4th', async () => {
        expect((await ask(guest())).type).toBe('answer');
        expect((await ask(guest())).type).toBe('answer');
        expect(await remaining(guest())).toBe(1);
        expect((await ask(guest())).type).toBe('answer'); // 3rd: allowed
        expect(await remaining(guest())).toBe(0);

        llmCalls = 0;
        expect((await ask(guest())).type).toBe('limit'); // 4th: blocked
        expect(llmCalls).toBe(0); // blocked before any LLM call
    });

    it('applies the same limit to signed-in users without an active booking', async () => {
        for (let i = 0; i < 3; i++) expect((await ask(user)).type).toBe('answer');
        expect((await ask(user)).type).toBe('limit');
    });

    it('does not count refusals or greetings', async () => {
        label = 'not_health';
        for (let i = 0; i < 5; i++) expect((await ask(guest())).type).toBe('refusal');
        label = 'greeting';
        expect((await ask(guest())).type).toBe('greeting');
        expect(await remaining(guest())).toBe(3);

        label = 'health';
        for (let i = 0; i < 3; i++) expect((await ask(guest())).type).toBe('answer');
        expect((await ask(guest())).type).toBe('limit');
    });

    it('does not count emergencies, and still answers them after the limit', async () => {
        label = 'emergency';
        expect((await ask(guest())).type).toBe('emergency');
        expect(await remaining(guest())).toBe(3);

        label = 'health';
        for (let i = 0; i < 3; i++) await ask(guest());
        // Out of questions, but an acute emergency still gets the fixed reply.
        expect((await ask(guest(), DAY_1, "I can't breathe")).type).toBe('emergency');
    });

    it('does not count failed answers (errors are free)', async () => {
        failAnswers = true;
        await expect(ask(guest())).rejects.toThrow();
        await expect(ask(guest())).rejects.toThrow();
        expect(await remaining(guest())).toBe(3);
    });

    it('resets at the start of the next UTC day', async () => {
        for (let i = 0; i < 3; i++) await ask(guest(), DAY_1);
        expect((await ask(guest(), DAY_1_LATE)).type).toBe('limit');
        expect(await remaining(guest(), DAY_2)).toBe(3);
        expect((await ask(guest(), DAY_2)).type).toBe('answer');
    });

    it('stops a guest resetting the quota by clearing cookies (per-IP ceiling)', async () => {
        // Same IP hash, a new guest cookie every 3 questions. IP ceiling is 10.
        let answered = 0;
        for (let g = 0; g < 5; g++) {
            for (let i = 0; i < 3; i++) if ((await ask(guest(`g-${g}`, 'shared-ip'))).type === 'answer') answered++;
        }
        expect(answered).toBe(10);
    });

    it('never hands out more than the limit under concurrent requests', async () => {
        const results = await Promise.all(Array.from({ length: 8 }, () => ask(guest())));
        expect(results.filter((r) => r.type === 'answer')).toHaveLength(3);
        expect(results.filter((r) => r.type === 'limit')).toHaveLength(5);
        const row = await AiChatUsage.findOne({ key: 'guest:g-1' }).lean();
        expect(row?.count).toBe(3);
    });

    it('stores only counters: no message content, emails or raw IPs', async () => {
        await ask(guest('g-9', 'hashed-ip'), DAY_1, 'my email is a@b.com and I have a headache');
        const rows = await AiChatUsage.find().lean();
        const stored = JSON.stringify(rows);
        expect(stored).not.toContain('headache');
        expect(stored).not.toContain('a@b.com');
        expect(rows.map((r) => r.key).sort()).toEqual(['guest:g-9', 'ip:hashed-ip']);
    });
});
