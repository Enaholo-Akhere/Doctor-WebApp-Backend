import type { AiChatToolDefinition } from 'ai-chat/llm';
import type { AiChatIdentity } from 'ai-chat/middleware/aiChatIdentity';

/** Trusted source shown under an answer. */
export interface AiChatSource {
    title: string;
    url: string;
    publisher: string;
}

/** A button the app shows under an answer (the model never writes URLs itself). */
export interface AiChatAction {
    type: 'booking';
    label: string;
    url: string;
}

export interface AiChatToolContext {
    identity: AiChatIdentity;
    now: Date;
}

export interface AiChatToolResult {
    /** What the model sees (kept small and free of other users' data). */
    content: Record<string, unknown>;
    sources?: AiChatSource[];
    actions?: AiChatAction[];
}

export interface AiChatTool {
    definition: AiChatToolDefinition;
    /** `args` is untrusted model output: every tool validates it. */
    run(args: unknown, ctx: AiChatToolContext): Promise<AiChatToolResult>;
}
