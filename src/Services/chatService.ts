import Booking from 'models/BookingSchema';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import Message, { CallLog, ChatRole, IMessage, MessageType } from 'models/messages';
import Conversation from 'models/ConversationSchema';
import { getRoomId } from 'utils/roomId';

/**
 * Chat domain rules, shared by the REST controllers and socket handlers.
 *
 * Core rule: a patient and a doctor may chat (and call) only if the patient
 * has a paid, approved booking with that doctor. "Paid & approved" is the
 * state the Stripe / Flutterwave webhooks set once payment succeeds.
 */

export interface ChatUser {
    id: string;
    name: string;
    role: ChatRole;
}

export interface ChatPeer {
    _id: string;
    name: string;
    photo: string | null;
    role: ChatRole;
    specialization?: string;
}

export interface ConversationSummary {
    roomId: string;
    peer: ChatPeer;
    lastMessage: { content: string; type: MessageType; senderId: string; createdAt: Date } | null;
    unreadCount: number;
    online: boolean;
}

const PAID_BOOKING = { isPaid: true, status: 'approved' } as const;
const OBJECT_ID = /^[a-f\d]{24}$/i;

export const isChatRole = (role: unknown): role is ChatRole =>
    role === 'patient' || role === 'doctor';

export const isObjectId = (id: unknown): id is string =>
    typeof id === 'string' && OBJECT_ID.test(id);

export const peerRoleOf = (role: ChatRole): ChatRole =>
    role === 'patient' ? 'doctor' : 'patient';

const participants = (selfId: string, selfRole: ChatRole, otherId: string) =>
    selfRole === 'patient'
        ? { patientId: selfId, doctorId: otherId }
        : { patientId: otherId, doctorId: selfId };

/** True if `self` and `other` are a patient/doctor pair with a paid booking. */
export const canChat = async (self: { id: string; role: ChatRole }, otherId: unknown): Promise<boolean> => {
    if (!isObjectId(otherId) || otherId === self.id) return false;
    const { patientId, doctorId } = participants(self.id, self.role, otherId);
    return Boolean(await Booking.exists({ user: patientId, doctor: doctorId, ...PAID_BOOKING }));
};

/** Ids of everyone `self` is allowed to chat with. */
export const getContactIds = async (self: { id: string; role: ChatRole }): Promise<string[]> => {
    const ids =
        self.role === 'patient'
            ? await Booking.distinct('doctor', { user: self.id, ...PAID_BOOKING })
            : await Booking.distinct('user', { doctor: self.id, ...PAID_BOOKING });
    return ids.map(String);
};

export const listConversations = async (
    self: { id: string; role: ChatRole },
    isOnline: (userId: string) => boolean
): Promise<ConversationSummary[]> => {
    const contactIds = await getContactIds(self);
    if (!contactIds.length) return [];

    const roomIds = contactIds.map((id) => getRoomId(self.id, id));
    const peerQuery =
        self.role === 'patient'
            ? Doctor.find({ _id: { $in: contactIds } }).select('name photo specialization').lean()
            : User.find({ _id: { $in: contactIds } }).select('name photo').lean();

    const [peers, conversations] = await Promise.all([
        peerQuery,
        Conversation.find({ roomId: { $in: roomIds } }).lean(),
    ]);

    const byRoom = new Map(conversations.map((c) => [c.roomId, c]));
    const peerRole = peerRoleOf(self.role);

    return (peers as Array<{ _id: unknown; name: string; photo?: { imageUrl?: string }; specialization?: string }>)
        .map((p): ConversationSummary => {
            const peerId = String(p._id);
            const roomId = getRoomId(self.id, peerId);
            const conv = byRoom.get(roomId);
            return {
                roomId,
                peer: {
                    _id: peerId,
                    name: p.name,
                    photo: p.photo?.imageUrl ?? null,
                    role: peerRole,
                    ...(p.specialization && { specialization: p.specialization }),
                },
                lastMessage: conv?.lastMessage?.createdAt ? conv.lastMessage : null,
                unreadCount: conv?.unread?.[self.role] ?? 0,
                online: isOnline(peerId),
            };
        })
        .sort((a, b) => {
            const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return bt - at || a.peer.name.localeCompare(b.peer.name);
        });
};

/** Cursor-paginated history, oldest-first within the page. */
export const getMessages = async (
    selfId: string,
    otherId: string,
    { before, limit }: { before?: string; limit: number }
) => {
    const roomId = getRoomId(selfId, otherId);
    const filter: Record<string, unknown> = { roomId };
    if (before && isObjectId(before)) filter._id = { $lt: before };

    const docs = await Message.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
    const hasMore = docs.length > limit;
    const page = docs.slice(0, limit).reverse();

    return {
        roomId,
        messages: page,
        nextCursor: hasMore && page.length ? String(page[0]._id) : null,
    };
};

/** Persists a message and updates the conversation summary atomically-ish. */
export const saveMessage = async ({
    sender,
    recipientId,
    content,
    type = 'text',
    call,
    countAsUnread = true,
}: {
    sender: ChatUser;
    recipientId: string;
    content: string;
    type?: MessageType;
    call?: CallLog;
    countAsUnread?: boolean;
}): Promise<IMessage> => {
    const roomId = getRoomId(sender.id, recipientId);
    const { patientId, doctorId } = participants(sender.id, sender.role, recipientId);

    const message = await Message.create({
        roomId,
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        recipientId,
        content,
        type,
        call,
        readBy: [sender.id],
    });

    await Conversation.updateOne(
        { roomId },
        {
            $setOnInsert: { patient: patientId, doctor: doctorId },
            $set: {
                lastMessage: {
                    content: message.content,
                    type: message.type,
                    senderId: sender.id,
                    createdAt: message.createdAt,
                },
            },
            ...(countAsUnread && { $inc: { [`unread.${peerRoleOf(sender.role)}`]: 1 } }),
        },
        // Defaults off so they can't collide with the $inc path on insert.
        { upsert: true, setDefaultsOnInsert: false }
    );

    return message.toObject();
};

/** Marks everything `otherId` sent to `self` as read. */
export const markRead = async (self: { id: string; role: ChatRole }, otherId: string) => {
    const roomId = getRoomId(self.id, otherId);
    const [result] = await Promise.all([
        Message.updateMany(
            { roomId, senderId: otherId, readBy: { $ne: self.id } },
            { $addToSet: { readBy: self.id } }
        ),
        Conversation.updateOne({ roomId }, { $set: { [`unread.${self.role}`]: 0 } }),
    ]);
    return { roomId, updated: result.modifiedCount };
};

/** Public profile used for incoming-call screens. */
export const getChatProfile = async (id: string, role: ChatRole): Promise<ChatPeer | null> => {
    const doc =
        role === 'doctor'
            ? await Doctor.findById(id).select('name photo specialization').lean()
            : await User.findById(id).select('name photo').lean();
    if (!doc) return null;
    const d = doc as { name: string; photo?: { imageUrl?: string }; specialization?: string };
    return {
        _id: id,
        name: d.name,
        photo: d.photo?.imageUrl ?? null,
        role,
        ...(d.specialization && { specialization: d.specialization }),
    };
};
