import { z } from 'zod';
import { winston_logger } from '@utils/logger';
import { IMessage, MESSAGE_MAX_LENGTH } from 'models/messages';
import { markRead, saveMessage, isObjectId } from 'Services/chatService';
import { canAccessPeer, NOT_ALLOWED } from './access';
import { presence } from './presence';
import { AppServer, AppSocket, fail, safeAck, userRoom } from './types';

const objectId = z.string().refine(isObjectId, 'Invalid user id');
const peerSchema = z.object({ otherUserId: objectId });
const sendSchema = z.object({
    otherUserId: objectId,
    content: z.string().trim().min(1, 'Message is empty').max(MESSAGE_MAX_LENGTH, 'Message is too long'),
    clientId: z.string().max(64).optional(),
});

/** Delivers a persisted message to every tab of both participants. */
export const emitNewMessage = (io: AppServer, message: IMessage, clientId?: string) => {
    io.to([userRoom(message.senderId), userRoom(message.recipientId)]).emit('message:new', { message, clientId });
};

export const registerChatHandlers = (io: AppServer, socket: AppSocket) => {
    const me = socket.data.user;

    // Validates access when a conversation is opened and reports presence.
    socket.on('chat:open', async (payload, ack) => {
        const reply = safeAck<{ online: boolean }>(ack);
        const parsed = peerSchema.safeParse(payload);
        if (!parsed.success) return reply(fail('Invalid request'));

        try {
            const { otherUserId } = parsed.data;
            if (!(await canAccessPeer(socket, otherUserId))) return reply(fail(NOT_ALLOWED));
            reply({ ok: true, online: presence.isOnline(otherUserId) });
        } catch (error: any) {
            winston_logger.error(error.message, error.stack);
            reply(fail('Could not open conversation'));
        }
    });

    socket.on('message:send', async (payload, ack) => {
        const reply = safeAck<{ message: IMessage }>(ack);
        const parsed = sendSchema.safeParse(payload);
        if (!parsed.success) return reply(fail(parsed.error.issues[0]?.message ?? 'Invalid message'));

        try {
            const { otherUserId, content, clientId } = parsed.data;
            if (!(await canAccessPeer(socket, otherUserId))) return reply(fail(NOT_ALLOWED));

            const message = await saveMessage({ sender: me, recipientId: otherUserId, content });
            emitNewMessage(io, message, clientId);
            reply({ ok: true, message });
        } catch (error: any) {
            winston_logger.error(error.message, error.stack);
            reply(fail('Failed to send message'));
        }
    });

    socket.on('message:read', async (payload) => {
        const parsed = peerSchema.safeParse(payload);
        if (!parsed.success) return;

        try {
            const { otherUserId } = parsed.data;
            if (!(await canAccessPeer(socket, otherUserId))) return;

            const { roomId } = await markRead(me, otherUserId);
            // Sender gets read receipts; my other tabs clear their unread badge.
            io.to([userRoom(otherUserId), userRoom(me.id)]).emit('message:read', { roomId, readerId: me.id });
        } catch (error: any) {
            winston_logger.error(error.message, error.stack);
        }
    });

    // Typing is high-frequency: only relay to peers already verified (cached).
    const relayTyping = (isTyping: boolean) => (payload: unknown) => {
        const parsed = peerSchema.safeParse(payload);
        if (!parsed.success || !socket.data.contacts.has(parsed.data.otherUserId)) return;
        socket.to(userRoom(parsed.data.otherUserId)).emit('typing', { userId: me.id, isTyping });
    };

    socket.on('typing:start', relayTyping(true));
    socket.on('typing:stop', relayTyping(false));
};
