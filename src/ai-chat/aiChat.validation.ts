import { z } from 'zod';
import { AI_CHAT_HISTORY_TURNS, AI_CHAT_MAX_MESSAGE_LENGTH } from './aiChat.constants';

const content = z.string().trim().min(1).max(AI_CHAT_MAX_MESSAGE_LENGTH);

export const aiChatRequestSchema = z.object({
    body: z.object({
        message: z
            .string({ required_error: 'Please type a question' })
            .trim()
            .min(1, 'Please type a question')
            .max(AI_CHAT_MAX_MESSAGE_LENGTH, `Questions can be up to ${AI_CHAT_MAX_MESSAGE_LENGTH} characters`),
        // Recent turns held by the client (guests are never stored server-side).
        history: z
            .array(z.object({ role: z.enum(['user', 'assistant']), content }))
            .max(AI_CHAT_HISTORY_TURNS * 2)
            .optional()
            .default([]),
    }),
});

export type AiChatRequestBody = z.infer<typeof aiChatRequestSchema>['body'];
