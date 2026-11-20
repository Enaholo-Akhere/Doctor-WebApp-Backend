import type { AiChatAction, AiChatSource, AiChatToolContext } from 'ai-chat/tools';
import { runAiChatAgent } from './aiChatAgent';
import { detectEmergency } from './aiChatEmergency';
import { classifyMessage } from './aiChatClassifier';
import {
    AI_CHAT_CRISIS_REPLY,
    AI_CHAT_EMERGENCY_REPLY,
    AI_CHAT_GREETING_REPLY,
    AI_CHAT_REFUSAL_REPLY,
} from './aiChatFixedReplies';

export interface AiChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * - answer:    an LLM-written health answer (the only type that will count
 *              toward the daily quota in Phase 3)
 * - emergency: fixed emergency/crisis reply
 * - refusal:   fixed "health topics only" reply
 * - greeting:  fixed hello/what-can-you-do reply
 */
export type AiChatReplyType = 'answer' | 'emergency' | 'refusal' | 'greeting';

export type AiChatReply =
    | {
          type: AiChatReplyType;
          answer: string;
          /** How the message was routed, for metadata-only logging. */
          route: 'regex' | 'classifier' | 'fallback';
          /** Answers only: trusted references the agent used. */
          sources?: AiChatSource[];
          /** Answers only: buttons such as "Book a doctor". */
          actions?: AiChatAction[];
          toolsUsed?: string[];
      }
    | { type: 'limit'; route: 'quota' };

/** What the pipeline needs from the quota. Omit for unlimited callers. */
export interface AiChatQuotaGate {
    remaining(): Promise<number>;
    /** Atomically take one question; false if none are left. */
    reserve(): Promise<boolean>;
    /** Return the reserved question (the answer failed). */
    refund(): Promise<void>;
}

const emergencyReply = (kind: 'medical' | 'crisis') => (kind === 'crisis' ? AI_CHAT_CRISIS_REPLY : AI_CHAT_EMERGENCY_REPLY);

/** Reserve a question, answer it, and refund the question if answering fails. */
const countedAnswer = async (
    message: string,
    history: AiChatTurn[],
    quota: AiChatQuotaGate | undefined,
    route: 'classifier' | 'fallback',
    ctx: AiChatToolContext
): Promise<AiChatReply> => {
    if (quota && !(await quota.reserve())) return { type: 'limit', route: 'quota' };
    try {
        // One question no matter how many tool rounds the agent takes.
        const result = await runAiChatAgent(message, history, ctx);
        return { type: 'answer', route, ...result };
    } catch (error) {
        await quota?.refund();
        throw error;
    }
};

/**
 * Pipeline: emergency safety net -> quota check -> classifier -> answer.
 * Only LLM-written health answers use a question. Emergencies, refusals,
 * greetings and errors are free, and emergencies are answered even when the
 * daily limit has been reached.
 */
export const handleAiChatMessage = async (
    message: string,
    history: AiChatTurn[] = [],
    quota?: AiChatQuotaGate,
    ctx: AiChatToolContext = { identity: { kind: 'guest', guestId: 'anonymous', ipHash: 'n/a' }, now: new Date() }
): Promise<AiChatReply> => {
    // 1. Deterministic safety net: no LLM involved, never blocked by the quota.
    const urgent = detectEmergency(message);
    if (urgent) return { type: 'emergency', answer: emergencyReply(urgent), route: 'regex' };

    // 2. Out of questions: stop before any LLM call.
    if (quota && (await quota.remaining()) <= 0) return { type: 'limit', route: 'quota' };

    // 3. Classifier.
    const classification = await classifyMessage(message, history);
    switch (classification?.label) {
        case 'emergency':
            return { type: 'emergency', answer: emergencyReply(classification.kind ?? 'medical'), route: 'classifier' };
        case 'not_health':
            return { type: 'refusal', answer: AI_CHAT_REFUSAL_REPLY, route: 'classifier' };
        case 'greeting':
            return { type: 'greeting', answer: AI_CHAT_GREETING_REPLY, route: 'classifier' };
        case 'health':
            return countedAnswer(message, history, quota, 'classifier', ctx);
        default:
            // Classifier unavailable: the main prompt still refuses off-topic
            // requests and directs emergencies to help.
            return countedAnswer(message, history, quota, 'fallback', ctx);
    }
};
