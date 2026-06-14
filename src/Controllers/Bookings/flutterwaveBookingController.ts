import { NextFunction, Request, Response } from 'express';
// import Flutterwave from 'flutterwave-node-v3';
import axios from 'axios';
import { bookingFlutterwaveService, initialBookingService } from 'Services/bookingFlutterwaveService';
import { handleError } from '@utils/handledError';

export const flutterInitialPayment = async (req: Request, res: Response, next: NextFunction) => {
    const { amount, email, name } = req.body;
    const { id } = res.locals.auth;
    console.log('id', id);

    const { data, message, error } = await initialBookingService({ amount, email, name, id });

    if (error) {
        next(handleError(error))
    }

    res.status(200).json({ data, message });
    return;

};

export const verifyFlutterwavePayment = async (req: Request, res: Response, next: NextFunction) => {
    const transactionId = req.query.transactionId as string;
    const { id: userId } = res.locals.auth;

    const { data, message, error } = await bookingFlutterwaveService({ transactionId, userId });

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
        }
    });
    return
};
// const pbk = process.env.FLUTTER_PUBLIC_KEY;
// const secK = process.env.FLUTTER_SECRETE_KEY;


// const flw = new Flutterwave(pbk, secK);
