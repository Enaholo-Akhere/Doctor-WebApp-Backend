import mongoose, { Schema, Types } from 'mongoose';
import { MessageType } from './messages';

/**
 * One document per patient–doctor pair. Holds the denormalised data the
 * conversation list needs (last message, unread counts) so listing never has
 * to aggregate over the messages collection.
 */
export interface IConversation {
    _id: Types.ObjectId;
    roomId: string;
    patient: Types.ObjectId;
    doctor: Types.ObjectId;
    lastMessage?: {
        content: string;
        type: MessageType;
        senderId: string;
        createdAt: Date;
    };
    // Unread counts keyed by role: a conversation has exactly one of each.
    unread?: { patient?: number; doctor?: number };
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
    {
        roomId: { type: String, required: true, unique: true },
        patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
        lastMessage: {
            content: String,
            type: { type: String, enum: ['text', 'call', 'file', 'voice'] },
            senderId: String,
            createdAt: Date,
        },
        unread: {
            patient: Number,
            doctor: Number,
        },
    },
    { timestamps: true }
);

const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation;
