import AiChatMessage from 'ai-chat/models/aiChatMessage.model';
import { AI_CHAT_HISTORY_TURNS } from 'ai-chat/aiChat.constants';
import type { AiChatTurn } from './aiChatService';
import type { AiChatAction, AiChatSource } from 'ai-chat/tools';

/** The last N turns (user + assistant pairs) for the model's context, oldest first. */
export const loadRecentTurns = async (userId: string): Promise<AiChatTurn[]> => {
    const rows = await AiChatMessage.find({ userId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(AI_CHAT_HISTORY_TURNS * 2)
        .select('role content')
        .lean();
    return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
};

/** Save one exchange. Both rows get distinct timestamps so ordering is stable. */
export const saveExchange = async (
    userId: string,
    question: string,
    reply: { answer: string; type: string; sources?: AiChatSource[]; actions?: AiChatAction[] },
    now = new Date()
) => {
    await AiChatMessage.insertMany([
        { userId, role: 'user', content: question, createdAt: now, updatedAt: now },
        { userId, role: 'assistant', content: reply.answer, type: reply.type, sources: reply.sources?.length ? reply.sources : undefined, actions: reply.actions?.length ? reply.actions : undefined, createdAt: new Date(now.getTime() + 1), updatedAt: new Date(now.getTime() + 1) },
    ]);
};

/** Recent messages for the chat panel, oldest first. */
export const listMessages = async (userId: string, limit = 50) => {
    const rows = await AiChatMessage.find({ userId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .select('role content type sources actions createdAt')
        .lean();
    return rows.reverse().map((r) => ({
        id: String(r._id),
        role: r.role,
        content: r.content,
        type: r.type,
        sources: r.sources ?? [],
        actions: r.actions ?? [],
        createdAt: r.createdAt,
    }));
};

export const deleteMessages = async (userId: string) => (await AiChatMessage.deleteMany({ userId })).deletedCount ?? 0;
