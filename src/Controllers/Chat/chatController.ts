import { Request, Response } from 'express';
import { appError } from '@utils/appError';
import {
    canChat,
    getChatProfile,
    getMessages as fetchMessages,
    isChatRole,
    isObjectId,
    listConversations,
    saveMessage,
} from 'Services/chatService';
import { AttachmentKind, isAllowedMime, MAX_VOICE_SECONDS, uploadAttachment } from 'Services/chatAttachmentService';
import { emitNewMessage } from 'Starters/sockets/chatHandlers';
import { AppServer } from 'Starters/sockets/types';
import { getRoomId } from 'utils/roomId';
import { presence } from 'Starters/sockets/presence';
import { getIceServers as resolveIceServers } from 'config/iceServers';
import { ChatRole, MESSAGE_MAX_LENGTH } from 'models/messages';

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

// POST /chat/:otherUserId/attachments  (multipart: file, kind=file|voice, durationSec?, caption?, clientId?)
export const sendAttachment = async (req: Request, res: Response) => {
    const self = chatSelf(res);
    const { otherUserId } = req.params;

    if (!isObjectId(otherUserId) || !(await canChat(self, otherUserId))) {
        throw appError({ message: 'Conversation not found', statusCode: 404 });
    }

    const file = req.file;
    if (!file) throw appError({ message: 'No file was uploaded', statusCode: 400 });

    const kind: AttachmentKind = req.body.kind === 'voice' ? 'voice' : 'file';
    if (!isAllowedMime(file.mimetype, kind)) {
        throw appError({ message: "This file type isn't supported", statusCode: 400 });
    }

    const caption = kind === 'file' && typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
    if (caption.length > MESSAGE_MAX_LENGTH) throw appError({ message: 'Caption is too long', statusCode: 400 });

    const rawDuration = Number(req.body.durationSec);
    const durationSec = Number.isFinite(rawDuration) ? Math.min(Math.max(rawDuration, 0), MAX_VOICE_SECONDS) : undefined;
    const clientId =
        typeof req.body.clientId === 'string' && req.body.clientId.length <= 64 ? req.body.clientId : undefined;

    const profile = await getChatProfile(self.id, self.role);
    const attachment = await uploadAttachment(file, { roomId: getRoomId(self.id, otherUserId), kind, durationSec });

    const message = await saveMessage({
        sender: { id: self.id, name: profile?.name ?? 'User', role: self.role },
        recipientId: otherUserId,
        content: caption,
        type: kind,
        attachment,
    });

    emitNewMessage(req.app.get('io') as AppServer, message, clientId);
    res.status(201).json({ message, clientId });
};
