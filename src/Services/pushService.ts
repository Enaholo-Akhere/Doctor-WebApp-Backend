import webpush from 'web-push';
import { winston_logger } from '@utils/logger';
import PushSubscription from 'models/PushSubscriptionSchema';

/**
 * Web Push: wakes a user's devices when they aren't connected (site closed,
 * phone locked). Disabled unless VAPID keys are configured:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or https: URL)
 * Generate keys with: npx web-push generate-vapid-keys
 */

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || process.env.PROD_CLIENT_URL || 'mailto:admin@example.com';

export const isPushConfigured = Boolean(publicKey && privateKey);
if (isPushConfigured) webpush.setVapidDetails(subject, publicKey!, privateKey!);

export const getPushPublicKey = () => (isPushConfigured ? publicKey! : null);

export interface PushPayload {
    type: 'call' | 'call-missed' | 'booking';
    title: string;
    body: string;
    /** Same tag replaces the previous notification (ringing -> missed). */
    tag: string;
    url: string;
    icon?: string;
    callId?: string;
}

export const saveSubscription = async (
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string
) => {
    await PushSubscription.updateOne(
        { endpoint: sub.endpoint },
        { $set: { userId, keys: sub.keys, userAgent: userAgent?.slice(0, 300) } },
        { upsert: true }
    );
};

export const removeSubscription = (userId: string, endpoint: string) =>
    PushSubscription.deleteOne({ userId, endpoint });

export const hasSubscriptions = async (userId: string) =>
    isPushConfigured && Boolean(await PushSubscription.exists({ userId }));

/** Sends to every device of `userId`; prunes subscriptions the push service rejects. Returns delivered count. */
export const sendToUser = async (
    userId: string,
    payload: PushPayload,
    { ttl = 60, urgency = 'high' as webpush.Urgency } = {}
): Promise<number> => {
    if (!isPushConfigured) return 0;
    const subs = await PushSubscription.find({ userId }).lean();
    const results = await Promise.all(
        subs.map(async (s) => {
            try {
                await webpush.sendNotification(
                    { endpoint: s.endpoint, keys: s.keys },
                    JSON.stringify(payload),
                    { TTL: ttl, urgency, topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) }
                );
                return true;
            } catch (error: any) {
                // 404/410: the browser unsubscribed or the subscription expired.
                if (error?.statusCode === 404 || error?.statusCode === 410) {
                    await PushSubscription.deleteOne({ _id: s._id }).catch(() => undefined);
                } else {
                    winston_logger.error(`web push failed: ${error?.statusCode ?? ''} ${error?.message ?? error}`);
                }
                return false;
            }
        })
    );
    return results.filter(Boolean).length;
};
