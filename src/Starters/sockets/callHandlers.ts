import { randomUUID } from 'crypto';
import { z } from 'zod';
import { winston_logger } from '@utils/logger';
import { CallLogStatus, CallType } from 'models/messages';
import { getChatProfile, isObjectId, saveMessage } from 'Services/chatService';
import { canAccessPeer, NOT_ALLOWED } from './access';
import { emitNewMessage } from './chatHandlers';
import { presence } from './presence';
import { AppServer, AppSocket, CallEndReason, SocketUser, fail, safeAck, userRoom } from './types';

/**
 * WebRTC call signalling. The server never touches media: it brokers the
 * invite/accept/reject/end lifecycle and relays SDP + ICE between the two
 * sockets in the call. Media flows peer-to-peer (or via TURN).
 *
 * Lifecycle: invite -> (ringing, 30s timeout) -> accept | reject | cancel
 *            accept -> caller sends offer -> callee answers -> ICE -> media
 */

const RING_TIMEOUT_MS = 30_000;

interface ActiveCall {
    id: string;
    callType: CallType;
    status: 'ringing' | 'active';
    caller: SocketUser & { socketId: string };
    callee: SocketUser & { socketId?: string };
    answeredAt?: number;
    ringTimer?: NodeJS.Timeout;
}

const calls = new Map<string, ActiveCall>();
const callByUser = new Map<string, string>();

const callIdSchema = z.object({ callId: z.string().uuid() });
const inviteSchema = z.object({
    otherUserId: z.string().refine(isObjectId, 'Invalid user id'),
    callType: z.enum(['audio', 'video']),
});
const signalSchema = z
    .object({
        callId: z.string().uuid(),
        description: z
            .object({ type: z.enum(['offer', 'answer']), sdp: z.string().max(100_000) })
            .optional(),
        candidate: z
            .object({
                candidate: z.string().max(2_000),
                sdpMid: z.string().nullish(),
                sdpMLineIndex: z.number().int().nullish(),
                usernameFragment: z.string().nullish(),
            })
            .optional(),
    })
    .refine((p) => Boolean(p.description) !== Boolean(p.candidate), 'Exactly one of description/candidate');

const CALL_LOG_TEXT: Record<CallLogStatus, Record<CallType, string>> = {
    completed: { audio: 'Voice call', video: 'Video call' },
    missed: { audio: 'Missed voice call', video: 'Missed video call' },
    rejected: { audio: 'Declined voice call', video: 'Declined video call' },
};

const callLogFor = (call: ActiveCall, reason: CallEndReason) => {
    const wasAnswered = Boolean(call.answeredAt);
    const status: CallLogStatus = reason === 'rejected' ? 'rejected' : wasAnswered ? 'completed' : 'missed';
    const durationSec = wasAnswered ? Math.round((Date.now() - call.answeredAt!) / 1000) : 0;
    return { status, durationSec, content: CALL_LOG_TEXT[status][call.callType] };
};

export const registerCallHandlers = (io: AppServer, socket: AppSocket) => {
    const me = socket.data.user;

    const endCall = async (call: ActiveCall, reason: CallEndReason) => {
        if (!calls.delete(call.id)) return; // already ended
        clearTimeout(call.ringTimer);
        callByUser.delete(call.caller.id);
        callByUser.delete(call.callee.id);

        // Ringing callees may have several tabs ringing; reach them all.
        const calleeTarget = call.callee.socketId ?? userRoom(call.callee.id);
        io.to([call.caller.socketId, calleeTarget]).emit('call:ended', { callId: call.id, reason });

        try {
            const log = callLogFor(call, reason);
            const message = await saveMessage({
                sender: { id: call.caller.id, name: call.caller.name, role: call.caller.role },
                recipientId: call.callee.id,
                content: log.content,
                type: 'call',
                call: { callType: call.callType, status: log.status, durationSec: log.durationSec },
                countAsUnread: log.status === 'missed',
            });
            emitNewMessage(io, message);
        } catch (error: any) {
            winston_logger.error(error.message, error.stack);
        }
    };

    /** The call this socket may act on, if `callId` is one it's part of. */
    const findCall = (callId: string) => {
        const call = calls.get(callId);
        if (!call) return null;
        const isParticipant = call.caller.id === me.id || call.callee.id === me.id;
        return isParticipant ? call : null;
    };

    socket.on('call:invite', async (payload, ack) => {
        const reply = safeAck<{ callId: string }>(ack);
        const parsed = inviteSchema.safeParse(payload);
        if (!parsed.success) return reply(fail('Invalid call request'));
        const { otherUserId, callType } = parsed.data;

        try {
            if (!(await canAccessPeer(socket, otherUserId))) return reply(fail(NOT_ALLOWED));
            if (callByUser.has(me.id)) return reply(fail('You are already in a call'));
            if (!presence.isOnline(otherUserId)) return reply(fail('They are offline right now'));
            if (callByUser.has(otherUserId)) return reply(fail('They are on another call'));

            const callerProfile = await getChatProfile(me.id, me.role);
            const calleeRole = me.role === 'patient' ? 'doctor' : 'patient';
            // Re-check after the await: another invite may have raced us.
            if (callByUser.has(me.id) || callByUser.has(otherUserId)) return reply(fail('Line is busy, try again'));

            const call: ActiveCall = {
                id: randomUUID(),
                callType,
                status: 'ringing',
                caller: { ...me, socketId: socket.id },
                callee: { id: otherUserId, name: '', role: calleeRole },
            };
            calls.set(call.id, call);
            callByUser.set(me.id, call.id);
            callByUser.set(otherUserId, call.id);
            call.ringTimer = setTimeout(() => void endCall(call, 'missed'), RING_TIMEOUT_MS);

            io.to(userRoom(otherUserId)).emit('call:incoming', {
                callId: call.id,
                callType,
                from: callerProfile ?? { _id: me.id, name: me.name, photo: null, role: me.role },
            });
            reply({ ok: true, callId: call.id });
        } catch (error: any) {
            winston_logger.error(error.message, error.stack);
            reply(fail('Could not start the call'));
        }
    });

    socket.on('call:accept', (payload, ack) => {
        const reply = safeAck(ack);
        const parsed = callIdSchema.safeParse(payload);
        if (!parsed.success) return reply(fail('Invalid request'));

        const call = findCall(parsed.data.callId);
        if (!call || call.callee.id !== me.id) return reply(fail('This call is no longer available'));
        if (call.status !== 'ringing') return reply(fail('Call already answered'));

        clearTimeout(call.ringTimer);
        call.status = 'active';
        call.answeredAt = Date.now();
        call.callee = { ...call.callee, name: me.name, socketId: socket.id };

        io.to(call.caller.socketId).emit('call:accepted', { callId: call.id });
        socket.to(userRoom(me.id)).emit('call:dismissed', { callId: call.id }); // stop other tabs ringing
        reply({ ok: true });
    });

    socket.on('call:reject', (payload) => {
        const parsed = callIdSchema.safeParse(payload);
        if (!parsed.success) return;
        const call = findCall(parsed.data.callId);
        if (!call || call.callee.id !== me.id || call.status !== 'ringing') return;
        socket.to(userRoom(me.id)).emit('call:dismissed', { callId: call.id });
        void endCall(call, 'rejected');
    });

    socket.on('call:end', (payload) => {
        const parsed = callIdSchema.safeParse(payload);
        if (!parsed.success) return;
        const call = findCall(parsed.data.callId);
        if (!call) return;
        void endCall(call, call.status === 'ringing' ? 'cancelled' : 'ended');
    });

    // Relay SDP/ICE strictly between the two sockets in an active call.
    socket.on('call:signal', (payload) => {
        const parsed = signalSchema.safeParse(payload);
        if (!parsed.success) return;
        const call = calls.get(parsed.data.callId);
        if (!call || call.status !== 'active') return;

        const target =
            socket.id === call.caller.socketId
                ? call.callee.socketId
                : socket.id === call.callee.socketId
                  ? call.caller.socketId
                  : undefined;
        if (target) io.to(target).emit('call:signal', parsed.data);
    });

    socket.on('disconnect', () => {
        const callId = callByUser.get(me.id);
        const call = callId ? calls.get(callId) : undefined;
        if (!call) return;
        // Only the socket actually in the call ends it; other tabs don't.
        if (socket.id === call.caller.socketId || socket.id === call.callee.socketId) {
            void endCall(call, 'disconnected');
        }
    });
};
