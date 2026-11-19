import { Server, Socket } from 'socket.io';
import { CallType, ChatRole, IMessage } from 'models/messages';
import { ChatPeer } from 'Services/chatService';

/**
 * Socket.IO event contract. Keep in sync with the frontend copy in
 * `Frontend/src/library/socket/events.ts`.
 */

export interface SocketUser {
    id: string;
    name: string;
    role: ChatRole;
}

export interface SocketData {
    user: SocketUser;
    /** Peers this user may talk to (paid bookings). Lazily extended. */
    contacts: Set<string>;
}

export type AckResponse<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };
export type Ack<T extends object = object> = (res: AckResponse<T>) => void;

export type CallEndReason = 'ended' | 'rejected' | 'missed' | 'cancelled' | 'failed' | 'disconnected';

export interface SessionDescription {
    type: 'offer' | 'answer';
    sdp: string;
}

export interface IceCandidate {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
}

export interface SignalPayload {
    callId: string;
    description?: SessionDescription;
    candidate?: IceCandidate;
}

export interface ClientToServerEvents {
    'chat:open': (p: { otherUserId: string }, ack: Ack<{ online: boolean }>) => void;
    'message:send': (p: { otherUserId: string; content: string; clientId?: string }, ack: Ack<{ message: IMessage }>) => void;
    'message:read': (p: { otherUserId: string }) => void;
    'typing:start': (p: { otherUserId: string }) => void;
    'typing:stop': (p: { otherUserId: string }) => void;

    'call:invite': (
        p: { otherUserId: string; callType: CallType },
        ack: Ack<{ callId: string; notified?: boolean }>
    ) => void;
    'call:accept': (p: { callId: string }, ack: Ack) => void;
    'call:reject': (p: { callId: string }) => void;
    'call:end': (p: { callId: string }) => void;
    'call:signal': (p: SignalPayload) => void;
    /** Re-binds an active call to this socket after a reconnect. */
    'call:resume': (p: { callId: string }, ack: Ack) => void;
}

export interface ServerToClientEvents {
    'message:new': (p: { message: IMessage; clientId?: string }) => void;
    'message:read': (p: { roomId: string; readerId: string }) => void;
    typing: (p: { userId: string; isTyping: boolean }) => void;
    'presence:update': (p: { userId: string; online: boolean }) => void;

    'call:incoming': (p: { callId: string; callType: CallType; from: ChatPeer }) => void;
    'call:accepted': (p: { callId: string }) => void;
    /** Call was answered/declined on another tab/device of the same user. */
    'call:dismissed': (p: { callId: string }) => void;
    'call:ended': (p: { callId: string; reason: CallEndReason }) => void;
    'call:signal': (p: SignalPayload) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/** Every socket of a user joins this room, so emits reach all their tabs. */
export const userRoom = (userId: string) => `user:${userId}`;

export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** Clients may omit the ack callback; never call undefined. */
export const safeAck = <T extends object>(ack: unknown): Ack<T> =>
    typeof ack === 'function' ? (ack as Ack<T>) : () => undefined;
