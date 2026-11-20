import mongoose from 'mongoose';

/**
 * AI assistant conversation history for SIGNED-IN patients only.
 * Guest messages are never stored. Separate from the real-time chat's
 * `messages` collection.
 */
export interface IAiChatMessage {
    userId: mongoose.Types.ObjectId;
    role: 'user' | 'assistant';
    content: string;
    /** Assistant replies: answer | emergency | refusal | greeting. */
    type?: string;
    /** Assistant answers: trusted references and buttons shown under the reply. */
    sources?: { title: string; url: string; publisher: string }[];
    actions?: { type: string; label: string; url: string }[];
    createdAt: Date;
    updatedAt: Date;
}

const AiChatMessageSchema = new mongoose.Schema<IAiChatMessage>(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        type: { type: String },
        sources: { type: [{ _id: false, title: String, url: String, publisher: String }], default: undefined },
        actions: { type: [{ _id: false, type: { type: String }, label: String, url: String }], default: undefined },
    },
    { timestamps: true, collection: 'ai_chat_messages' }
);

AiChatMessageSchema.index({ userId: 1, createdAt: -1 });

const AiChatMessage = mongoose.model<IAiChatMessage>('AiChatMessage', AiChatMessageSchema);

export default AiChatMessage;
