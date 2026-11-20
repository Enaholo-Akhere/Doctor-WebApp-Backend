import { afterEach, describe, expect, it } from 'vitest';
import { setLlmProvider, LlmProvider, AiChatCompletionRequest } from 'ai-chat/llm';
import { handleAiChatMessage } from 'ai-chat/services/aiChatService';
import {
    AI_CHAT_CRISIS_REPLY,
    AI_CHAT_EMERGENCY_REPLY,
    AI_CHAT_GREETING_REPLY,
    AI_CHAT_REFUSAL_REPLY,
} from 'ai-chat/services/aiChatFixedReplies';

/** Fake provider: classifier calls (json: true) return `label`, others return an answer. */
const fakeProvider = (classifierOutput: string | Error) => {
    const calls: AiChatCompletionRequest[] = [];
    const provider: LlmProvider = {
        name: 'fake',
        async complete(req) {
            calls.push(req);
            if (req.json) {
                if (classifierOutput instanceof Error) throw classifierOutput;
                return { content: classifierOutput, toolCalls: [], finishReason: 'stop' };
            }
            return { content: 'A helpful health answer.', toolCalls: [], finishReason: 'stop' };
        },
    };
    setLlmProvider(provider);
    return calls;
};

afterEach(() => setLlmProvider(null));

describe('handleAiChatMessage routing', () => {
    it('answers acute emergencies with the fixed reply and makes no LLM call', async () => {
        const calls = fakeProvider('{"label":"health"}');
        const reply = await handleAiChatMessage("I can't breathe");
        expect(reply).toMatchObject({ type: 'emergency', answer: AI_CHAT_EMERGENCY_REPLY, route: 'regex' });
        expect(calls).toHaveLength(0);
    });

    it('uses the crisis reply for suicidal messages', async () => {
        const calls = fakeProvider('{"label":"health"}');
        const reply = await handleAiChatMessage('I want to end my life');
        expect(reply.answer).toBe(AI_CHAT_CRISIS_REPLY);
        expect(calls).toHaveLength(0);
    });

    it('uses the fixed reply when the classifier flags an emergency', async () => {
        fakeProvider('{"label":"emergency","kind":"crisis"}');
        const reply = await handleAiChatMessage('everything feels pointless and I have a plan');
        expect(reply).toMatchObject({ type: 'emergency', answer: AI_CHAT_CRISIS_REPLY, route: 'classifier' });
    });

    it('refuses off-topic messages without calling the answer model', async () => {
        const calls = fakeProvider('{"label":"not_health"}');
        const reply = await handleAiChatMessage('Write me a Python sort function');
        expect(reply).toMatchObject({ type: 'refusal', answer: AI_CHAT_REFUSAL_REPLY });
        expect(calls).toHaveLength(1); // classifier only
    });

    it('replies to greetings with the fixed greeting', async () => {
        fakeProvider('{"label":"greeting"}');
        expect((await handleAiChatMessage('hello')).answer).toBe(AI_CHAT_GREETING_REPLY);
    });

    it('answers health questions with the LLM', async () => {
        const calls = fakeProvider('{"label":"health"}');
        const reply = await handleAiChatMessage('How can I sleep better?');
        expect(reply).toMatchObject({ type: 'answer', answer: 'A helpful health answer.', route: 'classifier' });
        expect(calls).toHaveLength(2);
    });

    it.each([['not json'], ['{"label":"banana"}'], [new Error('provider down')]])(
        'falls back to the guarded health prompt when the classifier output is unusable (%s)',
        async (output) => {
            fakeProvider(output as string | Error);
            const reply = await handleAiChatMessage('How can I sleep better?');
            expect(reply).toMatchObject({ type: 'answer', route: 'fallback' });
        }
    );
});
