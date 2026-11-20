/**
 * Provider-agnostic LLM types for the AI chat assistant.
 * Groq is the first implementation; Ollama (or another OpenAI-compatible
 * provider) can be added later behind the same interface.
 */

export type AiChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiChatToolCall {
    id: string;
    name: string;
    /** Raw JSON string of arguments, exactly as the model produced it. */
    arguments: string;
}

export interface AiChatLlmMessage {
    role: AiChatRole;
    content: string;
    /** Present on assistant messages that request tool calls. */
    toolCalls?: AiChatToolCall[];
    /** Present on tool messages: the call this result answers. */
    toolCallId?: string;
}

export interface AiChatToolDefinition {
    name: string;
    description: string;
    /** JSON Schema for the tool's arguments. */
    parameters: Record<string, unknown>;
}

export interface AiChatCompletionRequest {
    messages: AiChatLlmMessage[];
    tools?: AiChatToolDefinition[];
    /** Ask the model for a JSON object response (used by the classifier). */
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
    /** Override the default model for this call. */
    model?: string;
}

export interface AiChatCompletionResult {
    content: string;
    toolCalls: AiChatToolCall[];
    finishReason: string | null;
}

export interface LlmProvider {
    readonly name: string;
    complete(request: AiChatCompletionRequest): Promise<AiChatCompletionResult>;
}

/** Thrown for any provider failure so callers never leak provider internals. */
export class AiChatLlmError extends Error {
    constructor(
        message: string,
        public readonly status?: number
    ) {
        super(message);
        this.name = 'AiChatLlmError';
    }
}
