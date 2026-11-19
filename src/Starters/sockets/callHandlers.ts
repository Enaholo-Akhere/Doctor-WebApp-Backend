import { randomUUID } from 'crypto';
import { z } from 'zod';
import { winston_logger } from '@utils/logger';
import { CallLogStatus, CallType } from 'models/messages';
import { ChatPeer, getChatProfile, isObjectId, saveMessage } from 'Services/chatService';
import { hasSubscriptions, sendToUser } from 'Services/pushService';
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
 *
 * Calls end only when a participant hangs up (button, closing the tab,
 * logging out). Media doesn't depend on the signalling socket, so when a
 * participant's socket drops mid-call (network blip, mobile handover) the call
 * is held and the client re-binds with `call:resume`. RECONNECT_GRACE_MS is
 * only a safety net for devices that vanish for good (crash, dead battery),
 * so the other side isn't left on a dead call with a permanently busy line.
 */

const RING_TIMEOUT_MS = 30_000;
/** Longer when the callee is woken by push: they need time to tap and load the site. */
const PUSH_RING_TIMEOUT_MS = 45_000;
const RECONNECT_GRACE_MS = 120_000;

type Side = 'caller' | 'callee';

interface ActiveCall {
    id: string;
    callType: CallType;
    status: 'ringing' | 'active';
    caller: SocketUser & { socketId: string };
    callee: SocketUser & { socketId?: string };
    answeredAt?: number;
    ringTimer?: NodeJS.Timeout;
    /** Caller profile, re-sent to callee sockets that connect while it rings. */
    from: ChatPeer;
    /** Callee was offline and woken via Web Push. */
    pushed?: boolean;
    /** Pending hang-up per side while that side's socket is reconnecting. */
    graceTimers: Partial<Record<Side, NodeJS.Timeout>>;
}

const clearGrace = (call: ActiveCall, side?: Side) => {
    const sides: Side[] = side ? [side] : ['caller', 'callee'];
    sides.forEach((s) => {
        clearTimeout(call.graceTimers[s]);
        delete call.graceTimers[s];
    });
};

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

const chatUrlFor = (calleeRole: string, callerId: string) =>
    `${calleeRole === 'doctor' ? '/dashboard/chat' : '/users/chat'}?with=${callerId}`;

/**
 * A callee socket that connects while a call is ringing (e.g. opened from the
 * push notification, or a second tab) gets the incoming call too.
 */
export const resendRingingCall = (socket: AppSocket) => {
    const call = calls.get(callByUser.get(socket.data.user.id) ?? '');
    if (call?.status === 'ringing' && call.callee.id === socket.data.user.id) {
        socket.emit('call:incoming', { callId: call.id, callType: call.callType, from: call.from });
    }
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
        clearGrace(call);
        callByUser.delete(call.caller.id);
        callByUser.delete(call.callee.id);

        // Ringing callees may have several tabs ringing; reach them all.
        const calleeTarget = call.callee.socketId ?? userRoom(call.callee.id);
        io.to([call.caller.socketId, calleeTarget]).emit('call:ended', { callId: call.id, reason });

        // Replace the "incoming call" push on the callee's devices with a missed-call notice.
        if (call.pushed && !call.answeredAt && (reason === 'missed' || reason === 'cancelled')) {
            const label = call.callType === 'video' ? 'video' : 'voice';
            void sendToUser(call.callee.id, {
                type: 'call-missed',
                title: `Missed ${label} call`,
                body: `${call.from.name} tried to call you`,
                tag: `call-${call.id}`,
                url: chatUrlFor(call.callee.role, call.caller.id),
                icon: call.from.photo ?? undefined,
                callId: call.id,
            }, { ttl: 24 * 60 * 60, urgency: 'normal' }).catch(() => undefined);
        }

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
        const reply = safeAck<{ callId: string; notified?: boolean }>(ack);
        const parsed = inviteSchema.safeParse(payload);
        if (!parsed.success) return reply(fail('Invalid call request'));
        const { otherUserId, callType } = parsed.data;

        try {
            if (!(await canAccessPeer(socket, otherUserId))) return reply(fail(NOT_ALLOWED));
            // A call I dropped out of (e.g. reloaded mid-call) is abandoned once I start a new one.
            const mine = calls.get(callByUser.get(me.id) ?? '');
            if (mine && mine.graceTimers[mine.caller.id === me.id ? 'caller' : 'callee']) {
                await endCall(mine, 'disconnected');
            }
            if (callByUser.has(me.id)) return reply(fail('You are already in a call'));
            if (callByUser.has(otherUserId)) return reply(fail('They are on another call'));

            // Offline callees can still be reached if one of their devices accepted push.
            const online = presence.isOnline(otherUserId);
            if (!online && !(await hasSubscriptions(otherUserId))) {
                return reply(fail('They are offline right now'));
            }

            const callerProfile: ChatPeer = (await getChatProfile(me.id, me.role)) ?? {
                _id: me.id,
                name: me.name,
                photo: null,
                role: me.role,
            };
            const calleeRole = me.role === 'patient' ? 'doctor' : 'patient';
            // Re-check after the await: another invite may have raced us.
            if (callByUser.has(me.id) || callByUser.has(otherUserId)) return reply(fail('Line is busy, try again'));

            const call: ActiveCall = {
                id: randomUUID(),
                callType,
                status: 'ringing',
                caller: { ...me, socketId: socket.id },
                callee: { id: otherUserId, name: '', role: calleeRole },
                graceTimers: {},
                from: callerProfile,
                pushed: !online,
            };
            calls.set(call.id, call);
            callByUser.set(me.id, call.id);
            callByUser.set(otherUserId, call.id);
            call.ringTimer = setTimeout(() => void endCall(call, 'missed'), online ? RING_TIMEOUT_MS : PUSH_RING_TIMEOUT_MS);

            if (online) {
                io.to(userRoom(otherUserId)).emit('call:incoming', { callId: call.id, callType, from: callerProfile });
            } else {
                const delivered = await sendToUser(
                    otherUserId,
                    {
                        type: 'call',
                        title: `Incoming ${callType === 'video' ? 'video' : 'voice'} call`,
                        body: `${callerProfile.name} is calling you on CareConnect`,
                        tag: `call-${call.id}`,
                        url: chatUrlFor(calleeRole, me.id),
                        icon: callerProfile.photo ?? undefined,
                        callId: call.id,
                    },
                    { ttl: Math.round(PUSH_RING_TIMEOUT_MS / 1000) }
                );
                // Every subscription was dead: they really are unreachable.
                if (!delivered && calls.has(call.id)) {
                    calls.delete(call.id);
                    clearTimeout(call.ringTimer);
                    callByUser.delete(me.id);
                    callByUser.delete(otherUserId);
                    return reply(fail('They are offline right now'));
                }
            }
            reply({ ok: true, callId: call.id, notified: !online });
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

    socket.on('call:resume', (payload, ack) => {
        const reply = safeAck(ack);
        const parsed = callIdSchema.safeParse(payload);
        if (!parsed.success) return reply(fail('Invalid request'));

        const call = findCall(parsed.data.callId);
        if (!call || call.status !== 'active') return reply(fail('This call has ended'));

        const side: Side = call.caller.id === me.id ? 'caller' : 'callee';
        clearGrace(call, side);
        call[side].socketId = socket.id;
        reply({ ok: true });
    });

    socket.on('disconnect', () => {
        const callId = callByUser.get(me.id);
        const call = callId ? calls.get(callId) : undefined;
        if (!call) return;

        // Only the socket actually in the call matters; other tabs don't.
        const side: Side | null =
            socket.id === call.caller.socketId ? 'caller' : socket.id === call.callee.socketId ? 'callee' : null;
        if (!side) return;

        // A ringing call can't be resumed meaningfully; end it straight away.
        if (call.status !== 'active') return void endCall(call, 'disconnected');

        clearGrace(call, side);
        call.graceTimers[side] = setTimeout(() => void endCall(call, 'disconnected'), RECONNECT_GRACE_MS);
    });
};
