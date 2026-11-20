import mongoose from 'mongoose';

/**
 * Which version of the AI chat privacy notice a caller accepted, and when.
 *   key: "user:<userId>" | "guest:<uuid>"
 * Guest rows expire with the guest cookie (30 days).
 */
export interface IAiChatConsent {
    key: string;
    version: string;
    acceptedAt: Date;
    /** Set for guests only: when the row may be deleted. */
    expiresAt?: Date;
}

const AiChatConsentSchema = new mongoose.Schema<IAiChatConsent>(
    {
        key: { type: String, required: true, unique: true },
        version: { type: String, required: true },
        acceptedAt: { type: Date, required: true },
        expiresAt: { type: Date },
    },
    { collection: 'ai_chat_consent' }
);

// Guest consent rows are removed by MongoDB once expiresAt passes.
AiChatConsentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AiChatConsent = mongoose.model<IAiChatConsent>('AiChatConsent', AiChatConsentSchema);

export default AiChatConsent;
