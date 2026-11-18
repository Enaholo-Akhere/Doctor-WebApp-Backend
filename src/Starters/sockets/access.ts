import { canChat } from 'Services/chatService';
import { AppSocket } from './types';

export const NOT_ALLOWED = 'You can only chat with a doctor after booking an appointment';

/**
 * Checks the booking rule for this socket's user, caching positives on the
 * socket so per-message / per-signal checks don't hit the database.
 * A cache miss re-checks the DB, so a booking paid after connecting works.
 */
export const canAccessPeer = async (socket: AppSocket, otherId: string): Promise<boolean> => {
    if (socket.data.contacts.has(otherId)) return true;
    const allowed = await canChat(socket.data.user, otherId);
    if (allowed) socket.data.contacts.add(otherId);
    return allowed;
};
