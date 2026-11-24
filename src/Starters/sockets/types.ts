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

    /** Doctor asks to record; the patient is prompted for consent. */
    'call:record-request': (p: { callId: string }, ack: Ack) => void;
    /** Patient's answer to a recording request. */
    'call:record-consent': (p: { callId: string; accept: boolean }, ack: Ack) => void;
    /** Either participant stops (or cancels) the recording. */
    'call:record-stop': (p: { callId: string }) => void;
}

export interface RecordingNotice {
    version: string;
    text: string;
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

    'call:record-consent-request': (p: { callId: string; doctorName: string; notice: RecordingNotice }) => void;
    'call:record-declined': (p: { callId: string }) => void;
    'call:record-started': (p: { callId: string; consultationId: string }) => void;
    'call:record-stopped': (p: { callId: string; consultationId: string | null; by: 'doctor' | 'patient' | 'system' }) => void;
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
