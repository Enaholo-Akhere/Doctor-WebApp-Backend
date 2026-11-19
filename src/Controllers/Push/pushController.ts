import { Request, Response } from 'express';
import { z } from 'zod';
import { appError } from '@utils/appError';
import { getPushPublicKey, removeSubscription, saveSubscription } from 'Services/pushService';

const subscriptionSchema = z.object({
    endpoint: z.string().url().max(2000).startsWith('https://'),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

const userIdOf = (res: Response) => String(res.locals.auth?.id ?? '');

// GET /push/public-key  -> { publicKey: string | null } (null = push disabled on the server)
export const getPublicKey = (req: Request, res: Response) => {
    res.status(200).json({ publicKey: getPushPublicKey() });
};

// POST /push/subscribe  body: PushSubscriptionJSON
export const subscribe = async (req: Request, res: Response) => {
    if (!getPushPublicKey()) throw appError({ message: 'Push notifications are not enabled', statusCode: 400 });
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) throw appError({ message: 'Invalid push subscription', statusCode: 400 });
    await saveSubscription(userIdOf(res), parsed.data, req.get('user-agent'));
    res.status(201).json({ ok: true });
};

// POST /push/unsubscribe  body: { endpoint }
export const unsubscribe = async (req: Request, res: Response) => {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
    if (endpoint) await removeSubscription(userIdOf(res), endpoint);
    res.status(200).json({ ok: true });
};
