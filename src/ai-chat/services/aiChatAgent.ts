import { getLlmProvider, AiChatLlmMessage } from 'ai-chat/llm';
import { AI_CHAT_HISTORY_TURNS } from 'ai-chat/aiChat.constants';
import { AI_CHAT_TOOLS, aiChatToolByName, AiChatAction, AiChatSource, AiChatToolContext } from 'ai-chat/tools';
import { winston_logger } from '@utils/logger';
import { AI_CHAT_SYSTEM_PROMPT } from './aiChatPrompts';
import type { AiChatTurn } from './aiChatService';

export const AI_CHAT_MAX_AGENT_ITERATIONS = 5;
const TOOL_TIMEOUT_MS = 8000;

export interface AiChatAgentResult {
    answer: string;
    sources: AiChatSource[];
    actions: AiChatAction[];
    /** Tool names called, for metadata-only logging. */
    toolsUsed: string[];
}

const withTimeout = <T>(p: Promise<T>, ms: number) =>
    Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('tool timeout')), ms))]);

const parseArgs = (raw: string): unknown => {
    try {
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const dedupe = <T>(items: T[], key: (t: T) => string): T[] => Array.from(new Map(items.map((i) => [key(i), i] as [string, T])).values());

/**
 * Agent loop: the model may call tools (search trusted references, read the
 * caller's own bookings, get a booking link) for up to 5 rounds, then answers.
 * Tools run with the server-side identity, never identity from the model.
 */
export const runAiChatAgent = async (message: string, history: AiChatTurn[], ctx: AiChatToolContext): Promise<AiChatAgentResult> => {
    const llm = getLlmProvider();
    const tools = AI_CHAT_TOOLS.map((t) => t.definition);
    const messages: AiChatLlmMessage[] = [
        { role: 'system', content: AI_CHAT_SYSTEM_PROMPT },
        // A turn is one user message + one assistant reply.
        ...history.slice(-AI_CHAT_HISTORY_TURNS * 2),
        { role: 'user', content: message },
    ];
    const sources: AiChatSource[] = [];
    const actions: AiChatAction[] = [];
    const toolsUsed: string[] = [];

    const done = (answer: string): AiChatAgentResult => ({
        answer,
        sources: dedupe(sources, (s) => s.url),
        actions: dedupe(actions, (a) => a.url),
        toolsUsed,
    });

    let emptyRetries = 0;
    for (let i = 0; i < AI_CHAT_MAX_AGENT_ITERATIONS; i++) {
        const res = await llm.complete({ messages, tools });

        if (!res.toolCalls.length) {
            const answer = res.content.trim();
            if (answer) return done(answer);
            // gpt-oss occasionally ends a turn with neither text nor a parsed
            // tool call. Retry the step once, then fall through to a final
            // answer without tools.
            if (emptyRetries++ < 1) {
                i--;
                continue;
            }
            break;
        }

        messages.push({ role: 'assistant', content: res.content, toolCalls: res.toolCalls });

        for (const call of res.toolCalls) {
            const tool = aiChatToolByName.get(call.name);
            toolsUsed.push(call.name);
            let content: Record<string, unknown>;
            if (!tool) {
                content = { error: `Unknown tool "${call.name}"` };
            } else {
                try {
                    const result = await withTimeout(tool.run(parseArgs(call.arguments), ctx), TOOL_TIMEOUT_MS);
                    content = result.content;
                    if (result.sources) sources.push(...result.sources);
                    if (result.actions) actions.push(...result.actions);
                } catch {
                    winston_logger.warn(`ai-chat tool ${call.name} failed`);
                    content = { error: 'Tool unavailable. Continue without it.' };
                }
            }
            messages.push({ role: 'tool', toolCallId: call.id, content: JSON.stringify(content) });
        }
    }

    // Out of tool rounds (or the model stalled): final answer with what we have, tools disabled.
    const final = await llm.complete({ messages });
    const answer = final.content.trim();
    if (!answer) throw new Error('Empty AI response');
    return done(answer);
};
