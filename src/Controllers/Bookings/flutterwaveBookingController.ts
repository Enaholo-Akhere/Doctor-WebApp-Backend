import { NextFunction, Request, Response } from 'express';
import { initialBookingService, verifyBookingFlutterwaveService } from 'Services/bookingFlutterwaveService';
import { handleError } from '@utils/handledError';
import Booking from 'models/BookingSchema';

export const flutterInitialPayment = async (req: Request, res: Response, next: NextFunction) => {
    const { amount, email, name } = req.body;
    const { doctorId } = req.params;
    const { id: userId } = res.locals.auth;

    const { message, error, data } = await initialBookingService({ amount, email, name, userId, doctorId });

    if (error) {
        next(handleError(error))
        return;
    };

    res.status(200).json({ data, message });
    return;

};

export const verifyFlutterwavePayment = async (req: Request, res: Response, next: NextFunction) => {
    const transactionId = req.query.transactionId as string;
    const { doctorId } = req.params;
    const { id: userId } = res.locals.auth;

    const { data, message, error } = await verifyBookingFlutterwaveService({ transactionId, userId, doctorId });

    if (error) {
        next(handleError(error));
        return;
    }

    res.status(200).json({
        data: {
            amount: data.amount,
            currency: data.currency,
            tx_ref: data.tx_ref,
            transaction_id: data.id,
            status: data.status,
            created_at: data.created_at,
        },
        message,
        status: true,
    });
    return
};
console.log('webhook key', process.env.FLUTTER_SECRET_WEBHOOK_KEY);
export const flutterwaveWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.headers['verif-hash'];

        if (!signature || signature !== process.env.FLUTTER_SECRET_WEBHOOK_KEY) {
            console.log("❌ Invalid signature");
            res.status(401).end();
            return;
        }

        const payload = req.body;

        console.log(" WEBHOOK RECEIVED:", JSON.stringify(payload, null, 2));

        const data = payload.data;

        if (data?.status === 'successful') {
            await Booking.findOneAndUpdate(
                { sessionId: data.tx_ref },
                {
                    isPaid: true,
                    status: 'approved',
                },
                { new: true }
            );

        }

        return res.status(200).end();
    } catch (err) {
        console.error("Webhook error:", err);
        res.status(500).end();
        return;
    }
};