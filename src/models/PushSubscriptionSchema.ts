import mongoose, { Schema, Types } from 'mongoose';

/** A browser/device that asked to be woken for incoming calls (Web Push). */
export interface IPushSubscription {
    _id: Types.ObjectId;
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
    {
        userId: { type: String, required: true, index: true },
        // One row per browser: re-subscribing (or another user logging in on the
        // same browser) re-points the endpoint instead of duplicating it.
        endpoint: { type: String, required: true, unique: true },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
        },
        userAgent: String,
    },
    { timestamps: true }
);

const PushSubscription = mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;
