import mongoose, { Document, Schema } from 'mongoose';
import { IMessage } from 'types';

const MessageSchema = new Schema<IMessage>({
    roomId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['patient', 'doctor'], required: true },
    content: { type: String, required: true, trim: true },
    readBy: { type: [String], default: [] },
},
    { timestamps: true });


MessageSchema.index({ roomId: 1, createdAt: -1 });

const Message = mongoose.model<IMessage>('Message', MessageSchema);

export default Message