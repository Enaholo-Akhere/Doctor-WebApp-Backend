import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'groq-sdk/resources/chat/completions';
import {
    AiChatCompletionRequest,
    AiChatCompletionResult,
    AiChatLlmError,
    AiChatLlmMessage,
    LlmProvider,
} from './types';

// Groq retired its Llama chat models; gpt-oss is open-weight and supports tool calling.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

/** gpt-oss models are reasoning models: keep reasoning short and out of the reply. */
const isReasoningModel = (model: string) => model.startsWith('openai/gpt-oss');

const toGroqMessage = (m: AiChatLlmMessage): ChatCompletionMessageParam => {
    if (m.role === 'tool') {
        return { role: 'tool', content: m.content, tool_call_id: m.toolCallId ?? '' };
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.toolCalls.map((c) => ({
                id: c.id,
                type: 'function' as const,
                function: { name: c.name, arguments: c.arguments },
            })),
        };
    }
    return { role: m.role, content: m.content } as ChatCompletionMessageParam;
};

export class GroqProvider implements LlmProvider {
    readonly name = 'groq';
    private client: Groq;
    private model: string;

    constructor(apiKey = process.env.GROQ_API_KEY, model = process.env.AI_CHAT_MODEL) {
        if (!apiKey) throw new AiChatLlmError('GROQ_API_KEY is not configured');
        // Retries are handled by the SDK for transient 429/5xx responses.
        this.client = new Groq({ apiKey, maxRetries: 2, timeout: 30_000 });
        this.model = model || DEFAULT_MODEL;
    }

    async complete(req: AiChatCompletionRequest): Promise<AiChatCompletionResult> {
        const tools: ChatCompletionTool[] | undefined = req.tools?.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.parameters },
        }));

        const model = req.model || this.model;

        try {
            const res = await this.client.chat.completions.create({
                model,
                messages: req.messages.map(toGroqMessage),
                temperature: req.temperature ?? 0.3,
                max_tokens: req.maxTokens ?? 1200,
                ...(isReasoningModel(model) && { reasoning_effort: 'low' as const, include_reasoning: false }),
                ...(tools?.length && { tools, tool_choice: 'auto' as const }),
                ...(req.json && { response_format: { type: 'json_object' as const } }),
            });

            const choice = res.choices[0];
            return {
                content: choice?.message?.content ?? '',
                toolCalls: (choice?.message?.tool_calls ?? []).map((c) => ({
                    id: c.id,
                    name: c.function.name,
                    arguments: c.function.arguments,
                })),
                finishReason: choice?.finish_reason ?? null,
            };
        } catch (error: unknown) {
            // Never surface the provider's raw error (it may echo the request).
            const status = error instanceof Groq.APIError ? error.status : undefined;
            throw new AiChatLlmError('LLM provider request failed', status);
        }
    }
}
