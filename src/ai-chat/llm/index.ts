import { GroqProvider } from './groqProvider';
import { LlmProvider } from './types';

let provider: LlmProvider | null = null;

/**
 * Returns the configured LLM provider (AI_CHAT_PROVIDER, default "groq").
 * Created lazily so a missing key only affects the AI chat, not server start-up.
 */
export const getLlmProvider = (): LlmProvider => {
    if (provider) return provider;
    const name = (process.env.AI_CHAT_PROVIDER || 'groq').toLowerCase();
    switch (name) {
        case 'groq':
            provider = new GroqProvider();
            break;
        default:
            throw new Error(`Unsupported AI_CHAT_PROVIDER "${name}"`);
    }
    return provider;
};

/** Test hook: swap in a fake provider. */
export const setLlmProvider = (p: LlmProvider | null) => {
    provider = p;
};

export * from './types';
