import mongoose, { Schema, Types } from 'mongoose';

export type ChatRole = 'patient' | 'doctor';
export type MessageType = 'text' | 'call' | 'file' | 'voice';
export type CallType = 'audio' | 'video';
export type CallLogStatus = 'completed' | 'missed' | 'rejected';

export interface CallLog {
    callType: CallType;
    status: CallLogStatus;
    durationSec: number;
}

export interface Attachment {
    url: string;
    publicId: string;
    resourceType: 'image' | 'video' | 'raw';
    name: string;
    mimeType: string;
    size: number;
    /** Voice notes only. */
    durationSec?: number;
    width?: number;
    height?: number;
}

export interface IMessage {
    _id: Types.ObjectId;
    roomId: string;
    senderId: string;
    senderName: string;
    senderRole: ChatRole;
    recipientId: string;
    content: string;
    type: MessageType;
    call?: CallLog;
    attachment?: Attachment;
    readBy: string[];
    createdAt: Date;
    updatedAt: Date;
}

export const MESSAGE_MAX_LENGTH = 2000;

const CallLogSchema = new Schema<CallLog>(
    {
        callType: { type: String, enum: ['audio', 'video'], required: true },
        status: { type: String, enum: ['completed', 'missed', 'rejected'], required: true },
        durationSec: { type: Number, default: 0 },
    },
    { _id: false }
);

const AttachmentSchema = new Schema<Attachment>(
    {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        resourceType: { type: String, enum: ['image', 'video', 'raw'], required: true },
        name: { type: String, required: true, maxlength: 255 },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        durationSec: Number,
        width: Number,
        height: Number,
    },
    { _id: false }
);

const MessageSchema = new Schema<IMessage>(
    {
        roomId: { type: String, required: true },
        senderId: { type: String, required: true },
        senderName: { type: String, required: true },
        senderRole: { type: String, enum: ['patient', 'doctor'], required: true },
        recipientId: { type: String, required: true },
        // Required for text; optional caption for files, empty for voice notes.
        content: {
            type: String,
            trim: true,
            maxlength: MESSAGE_MAX_LENGTH,
            default: '',
            required: function (this: IMessage) {
                return this.type === 'text';
            },
        },
        type: { type: String, enum: ['text', 'call', 'file', 'voice'], default: 'text' },
        call: { type: CallLogSchema, required: false },
        attachment: { type: AttachmentSchema, required: false },
        readBy: { type: [String], default: [] },
    },
    { timestamps: true }
);

// History is paginated newest-first by _id within a room.
MessageSchema.index({ roomId: 1, _id: -1 });

const Message = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
