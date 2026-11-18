import { Request, Response } from 'express';
import { appError } from '@utils/appError';
import { canChat, getMessages as fetchMessages, isChatRole, isObjectId, listConversations } from 'Services/chatService';
import { presence } from 'Starters/sockets/presence';
import { getIceServers as resolveIceServers } from 'config/iceServers';
import { ChatRole } from 'models/messages';

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

const chatSelf = (res: Response): { id: string; role: ChatRole } => {
    const { id, role } = res.locals.auth ?? {};
    if (!isChatRole(role)) {
        throw appError({ message: 'Chat is only available to patients and doctors', statusCode: 400 });
    }
    return { id: String(id), role };
};

// GET /chat/conversations
export const getConversations = async (req: Request, res: Response) => {
    const self = chatSelf(res);
    const conversations = await listConversations(self, presence.isOnline);
    res.status(200).json({ conversations });
};

// GET /chat/:otherUserId/messages?before=<messageId>&limit=30
export const getMessages = async (req: Request, res: Response) => {
    const self = chatSelf(res);
    const { otherUserId } = req.params;

    // 404 (not 403): the frontend treats 403 as a dead session and logs out.
    if (!isObjectId(otherUserId) || !(await canChat(self, otherUserId))) {
        throw appError({ message: 'Conversation not found', statusCode: 404 });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const before = typeof req.query.before === 'string' ? req.query.before : undefined;

    res.status(200).json(await fetchMessages(self.id, otherUserId, { before, limit }));
};

// GET /chat/ice-servers
export const getIceServers = (req: Request, res: Response) => {
    res.status(200).json({ iceServers: resolveIceServers() });
};
