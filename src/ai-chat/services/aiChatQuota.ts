import AiChatUsage from 'ai-chat/models/aiChatUsage.model';
import type { AiChatIdentity } from 'ai-chat/middleware/aiChatIdentity';

/** Free answered health questions per UTC day (guests and users without an active booking). */
export const aiChatDailyLimit = () => Number(process.env.AI_CHAT_DAILY_LIMIT) || 3;

/**
 * Per-IP ceiling for guests, so clearing cookies doesn't reset the quota.
 * Higher than the per-guest limit because many people can share one IP
 * (mobile carriers, offices, campuses).
 */
export const aiChatGuestIpDailyLimit = () => Number(process.env.AI_CHAT_GUEST_IP_DAILY_LIMIT) || 10;

export const utcDay = (now: Date) => now.toISOString().slice(0, 10);

export const nextUtcMidnight = (now: Date) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

export interface AiChatQuotaKey {
    key: string;
    limit: number;
}

/** The counters a caller is limited by. A guest is limited by both their cookie and their IP hash. */
export const quotaKeysFor = (identity: AiChatIdentity): AiChatQuotaKey[] => {
    if (identity.kind === 'user') return [{ key: `user:${identity.userId}`, limit: aiChatDailyLimit() }];
    return [
        { key: `guest:${identity.guestId}`, limit: aiChatDailyLimit() },
        { key: `ip:${identity.ipHash}`, limit: aiChatGuestIpDailyLimit() },
    ];
};

const isDuplicateKey = (e: unknown) => (e as { code?: number })?.code === 11000;

/**
 * A per-request view of the quota. The day is fixed when the request starts
 * so a refund always hits the same counter as the reservation, even across
 * midnight.
 */
export class AiChatQuota {
    readonly day: string;
    readonly resetsAt: Date;
    private reserved: AiChatQuotaKey[] = [];

    constructor(
        private keys: AiChatQuotaKey[],
        now: Date = new Date()
    ) {
        this.day = utcDay(now);
        this.resetsAt = nextUtcMidnight(now);
    }

    /** Questions left today: the tightest of the caller's counters. */
    async remaining(): Promise<number> {
        const rows = await AiChatUsage.find({ day: this.day, key: { $in: this.keys.map((k) => k.key) } })
            .select('key count')
            .lean();
        const counts = new Map(rows.map((r) => [r.key, r.count]));
        return Math.max(0, Math.min(...this.keys.map((k) => k.limit - (counts.get(k.key) ?? 0))));
    }

    /**
     * Atomically take one question from every counter, or none.
     * The filter only matches while count < limit; at the limit the upsert
     * collides with the existing row (E11000), which means "no slot left".
     */
    async reserve(): Promise<boolean> {
        const taken: AiChatQuotaKey[] = [];
        for (const k of this.keys) {
            try {
                await AiChatUsage.findOneAndUpdate(
                    { key: k.key, day: this.day, count: { $lt: k.limit } },
                    { $inc: { count: 1 } },
                    { upsert: true, new: true }
                );
                taken.push(k);
            } catch (e) {
                if (!isDuplicateKey(e)) {
                    await this.release(taken);
                    throw e;
                }
                await this.release(taken);
                return false;
            }
        }
        this.reserved = taken;
        return true;
    }

    /** Give back a reserved question (the answer failed). */
    async refund(): Promise<void> {
        await this.release(this.reserved);
        this.reserved = [];
    }

    private async release(keys: AiChatQuotaKey[]) {
        await Promise.all(
            keys.map((k) => AiChatUsage.updateOne({ key: k.key, day: this.day, count: { $gt: 0 } }, { $inc: { count: -1 } }))
        );
    }
}
