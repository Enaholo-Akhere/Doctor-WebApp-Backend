import mongoose from 'mongoose';

/**
 * Daily AI chat question counters. One row per (key, UTC day).
 *   key: "user:<userId>" | "guest:<uuid>" | "ip:<salted hash>"
 * No message content, emails or raw IPs are ever stored here.
 */
export interface IAiChatUsage {
    key: string;
    day: string; // YYYY-MM-DD (UTC)
    count: number;
    createdAt: Date;
    updatedAt: Date;
}

const AI_CHAT_USAGE_TTL_SECONDS = 7 * 24 * 60 * 60;

const AiChatUsageSchema = new mongoose.Schema<IAiChatUsage>(
    {
        key: { type: String, required: true },
        day: { type: String, required: true },
        count: { type: Number, required: true, default: 0, min: 0 },
    },
    { timestamps: true, collection: 'ai_chat_usage' }
);

AiChatUsageSchema.index({ key: 1, day: 1 }, { unique: true });
// MongoDB deletes rows 7 days after creation (built-in TTL scheduler).
AiChatUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: AI_CHAT_USAGE_TTL_SECONDS });

const AiChatUsage = mongoose.model<IAiChatUsage>('AiChatUsage', AiChatUsageSchema);

export default AiChatUsage;
