import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Booking from 'models/BookingSchema';
import Doctor from 'models/DoctorSchema';
import AiChatUsage from 'ai-chat/models/aiChatUsage.model';
import { setLlmProvider, LlmProvider, AiChatCompletionRequest, AiChatCompletionResult } from 'ai-chat/llm';
import { runAiChatAgent, AI_CHAT_MAX_AGENT_ITERATIONS } from 'ai-chat/services/aiChatAgent';
import { handleAiChatMessage } from 'ai-chat/services/aiChatService';
import { AiChatQuota, quotaKeysFor } from 'ai-chat/services/aiChatQuota';
import { getMyBookingTool } from 'ai-chat/tools/getMyBooking';
import { getBookingLinkTool } from 'ai-chat/tools/getBookingLink';
import { resetKnowledgeProvider, sanitizeKnowledgeQuery, setKnowledgeProvider } from 'ai-chat/tools/searchHealthKnowledge';
import { parseMedlinePlusXml } from 'ai-chat/tools/knowledge/medlinePlus';
import type { AiChatToolContext } from 'ai-chat/tools';

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
    await Promise.all([Booking.deleteMany({}), Doctor.deleteMany({}), AiChatUsage.deleteMany({})]);
    setLlmProvider(null);
    resetKnowledgeProvider();
});

const me = new mongoose.Types.ObjectId().toString();
const someoneElse = new mongoose.Types.ObjectId().toString();
const NOW = new Date('2026-11-20T12:00:00Z');
const userCtx: AiChatToolContext = { identity: { kind: 'user', userId: me, role: 'patient' }, now: NOW };
const guestCtx: AiChatToolContext = { identity: { kind: 'guest', guestId: 'g', ipHash: 'h' }, now: NOW };

/** Scripted LLM: each non-classifier call returns the next scripted step. */
const scripted = (steps: Array<Partial<AiChatCompletionResult>>, classifierLabel = 'health') => {
    const calls: AiChatCompletionRequest[] = [];
    let i = 0;
    const provider: LlmProvider = {
        name: 'scripted',
        async complete(req) {
            if (req.json) return { content: JSON.stringify({ label: classifierLabel }), toolCalls: [], finishReason: 'stop' };
            calls.push(req);
            const step = steps[Math.min(i++, steps.length - 1)];
            return { content: '', toolCalls: [], finishReason: 'stop', ...step };
        },
    };
    setLlmProvider(provider);
    return calls;
};

const toolCall = (name: string, args: object = {}, id = `${name}-1`) => ({ id, name, arguments: JSON.stringify(args) });

describe('agent loop', () => {
    it('searches trusted references, then answers with sources', async () => {
        setKnowledgeProvider({
            name: 'fake',
            search: async (q) => [{ title: 'Migraine', url: 'https://medlineplus.gov/migraine.html', publisher: 'MedlinePlus', summary: `About ${q}` }],
        });
        const calls = scripted([{ toolCalls: [toolCall('searchHealthKnowledge', { query: 'migraine' })] }, { content: 'Migraines are recurring headaches.' }]);

        const res = await runAiChatAgent('What triggers migraines?', [], guestCtx);
        expect(res.answer).toBe('Migraines are recurring headaches.');
        expect(res.sources).toEqual([{ title: 'Migraine', url: 'https://medlineplus.gov/migraine.html', publisher: 'MedlinePlus' }]);
        expect(res.toolsUsed).toEqual(['searchHealthKnowledge']);
        // The tool result went back to the model as a tool message.
        const toolMsg = calls[1].messages.find((m) => m.role === 'tool');
        expect(toolMsg?.content).toContain('About migraine');
    });

    it(`stops after ${AI_CHAT_MAX_AGENT_ITERATIONS} tool rounds and forces a final answer without tools`, async () => {
        const calls = scripted([
            ...Array.from({ length: AI_CHAT_MAX_AGENT_ITERATIONS }, (_, i) => ({ toolCalls: [toolCall('getBookingLink', {}, `c${i}`)] })),
            { content: 'Final answer.' },
        ]);
        const res = await runAiChatAgent('help', [], guestCtx);
        expect(res.answer).toBe('Final answer.');
        expect(calls).toHaveLength(AI_CHAT_MAX_AGENT_ITERATIONS + 1);
        expect(calls.at(-1)?.tools).toBeUndefined();
    });

    it('survives unknown tools and bad arguments', async () => {
        scripted([
            { toolCalls: [{ id: 'x', name: 'deleteEverything', arguments: '{}' }, { id: 'y', name: 'searchHealthKnowledge', arguments: 'not json' }] },
            { content: 'Done.' },
        ]);
        expect((await runAiChatAgent('hi', [], guestCtx)).answer).toBe('Done.');
    });

    it('uses only one daily question however many tool rounds it takes', async () => {
        scripted([{ toolCalls: [toolCall('getBookingLink')] }, { toolCalls: [toolCall('getBookingLink', {}, 'b')] }, { content: 'ok' }]);
        const quota = new AiChatQuota(quotaKeysFor(guestCtx.identity), NOW);
        const reply = await handleAiChatMessage('Where can I book?', [], quota, guestCtx);
        expect(reply.type).toBe('answer');
        expect(await new AiChatQuota(quotaKeysFor(guestCtx.identity), NOW).remaining()).toBe(2);
    });
});

describe('getMyBooking', () => {
    const addBooking = (user: string, doctor: mongoose.Types.ObjectId, extra: object = {}) =>
        Booking.collection.insertOne({ user: new mongoose.Types.ObjectId(user), doctor, ticketPrice: '1', sessionId: 's', status: 'approved', isPaid: true, createdAt: new Date('2026-11-15T00:00:00Z'), ...extra });

    it("returns only the signed-in user's bookings, ignoring any id the model passes", async () => {
        const doc = await Doctor.create({ name: 'Dr Ada', email: 'ada@x.com', password: 'x', photo: { imageUrl: 'i', publicId: 'p' }, specialization: 'Dermatology', isApproved: 'approved' });
        await addBooking(me, doc._id);
        await addBooking(someoneElse, doc._id, { status: 'cancelled' });

        const res = await getMyBookingTool.run({ userId: someoneElse }, userCtx);
        const bookings = (res.content as { bookings: Array<Record<string, unknown>> }).bookings;
        expect(bookings).toHaveLength(1);
        expect(bookings[0]).toMatchObject({ doctor: 'Dr Ada', specialty: 'Dermatology', status: 'approved', paid: true, active: true, activeUntil: '2026-12-15' });
    });

    it('tells guests to sign in', async () => {
        expect((await getMyBookingTool.run({}, guestCtx)).content).toMatchObject({ signedIn: false });
    });
});

describe('getBookingLink', () => {
    it('suggests approved doctors matching the specialty (word-stem match)', async () => {
        await Doctor.create([
            { name: 'Dr Skin', email: 'a@x.com', password: 'x', photo: { imageUrl: 'i', publicId: 'p' }, specialization: 'Dermatology', isApproved: 'approved' },
            { name: 'Dr Pending', email: 'b@x.com', password: 'x', photo: { imageUrl: 'i', publicId: 'p' }, specialization: 'Dermatology', isApproved: 'pending' },
            { name: 'Dr Heart', email: 'c@x.com', password: 'x', photo: { imageUrl: 'i', publicId: 'p' }, specialization: 'Cardiology', isApproved: 'approved' },
        ]);
        const res = await getBookingLinkTool.run({ specialty: 'dermatologist' }, guestCtx);
        expect(res.actions?.map((a) => a.label)).toEqual(['Book Dr Skin', 'See all doctors']);
        expect(res.actions?.[0].url).toMatch(/^\/doctor\/[a-f0-9]{24}$/);
    });

    it('falls back to the doctors page (and treats regex characters literally)', async () => {
        const res = await getBookingLinkTool.run({ specialty: '.*' }, guestCtx);
        expect(res.actions).toEqual([{ type: 'booking', label: 'Book a doctor', url: '/doctors' }]);
    });
});

describe('knowledge search helpers', () => {
    it('strips personal details from the outgoing query', () => {
        expect(sanitizeKnowledgeQuery('migraine john@doe.com +234 803 123 4567')).toBe('migraine');
        expect(sanitizeKnowledgeQuery('iron-deficiency anemia!')).toBe('iron-deficiency anemia');
    });

    it('parses MedlinePlus results into plain-text summaries', () => {
        const xml = `<nlmSearchResult><list><document rank="0" url="https://medlineplus.gov/migraine.html">
<content name="title">&lt;span class="qt0"&gt;Migraine&lt;/span&gt;</content>
<content name="FullSummary">&lt;p&gt;Migraines are headaches.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Stress&lt;/li&gt;&lt;li&gt;Light&lt;/li&gt;&lt;/ul&gt;</content>
</document></list></nlmSearchResult>`;
        expect(parseMedlinePlusXml(xml, 3)).toEqual([
            {
                title: 'Migraine',
                url: 'https://medlineplus.gov/migraine.html',
                publisher: 'MedlinePlus (U.S. National Library of Medicine)',
                summary: 'Migraines are headaches. Stress; Light;',
            },
        ]);
    });
});

describe('agent resilience and source relevance', () => {
    it('retries once when the model returns an empty turn', async () => {
        scripted([{ content: '' }, { content: 'Recovered answer.' }]);
        expect((await runAiChatAgent('rash', [], guestCtx)).answer).toBe('Recovered answer.');
    });

    it('falls back to a tool-free answer if the model keeps stalling', async () => {
        const calls = scripted([{ content: '' }, { content: '' }, { content: 'Plain answer.' }]);
        expect((await runAiChatAgent('rash', [], guestCtx)).answer).toBe('Plain answer.');
        expect(calls.at(-1)?.tools).toBeUndefined();
    });

    it('only lists sources whose title matches the query', async () => {
        const { relevantResults } = await import('ai-chat/tools/searchHealthKnowledge');
        const r = (title: string) => ({ title, url: `u/${title}`, publisher: 'p', summary: 's' });
        expect(relevantResults('migraine', [r('Migraine'), r('Nausea and Vomiting'), r('Raynaud Phenomenon')]).map((x) => x.title)).toEqual(['Migraine']);
        expect(relevantResults('iron deficiency', [r('Anemia'), r('Iron')]).map((x) => x.title)).toEqual(['Iron']);
        expect(relevantResults('stomach bug', [r('Gastroenteritis'), r('Norovirus')]).map((x) => x.title)).toEqual(['Gastroenteritis']);
    });
});
