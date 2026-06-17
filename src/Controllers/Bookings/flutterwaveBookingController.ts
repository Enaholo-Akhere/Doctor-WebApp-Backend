import { NextFunction, Request, Response } from 'express';
import { initialBookingService, verifyBookingFlutterwaveService } from 'Services/bookingFlutterwaveService';
import { handleError } from '@utils/handledError';
import Booking from 'models/BookingSchema';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import { sendDoctorBookingEmail, sendPatientBookingEmail } from '@utils/message/nodemailer';
import { localIPUtils } from '@utils/localIp';
import { winston_logger } from '@utils/logger';
import { BookingCompleteInterface, BookSchemaInterface } from 'types';

export const flutterInitialPayment = async (req: Request, res: Response, next: NextFunction) => {
    const { amount, email, name } = req.body;
    const { doctorId } = req.params;
    const { id: userId } = res.locals.auth;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        req.ip ||
        "";

    const { message, error, data } = await initialBookingService({ amount, email, name, userId, doctorId, ip });

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


export const flutterwaveWebhook = async (req: Request, res: Response) => {

    console.log('raw body:', req.body);
    console.log('headers:', req.headers);
    try {
        const signature = req.headers['verif-hash'];

        console.log('signature:', signature);
        console.log('expected:', process.env.FLUTTER_SECRET_WEBHOOK_KEY);
        console.log('match:', signature === process.env.FLUTTER_SECRET_WEBHOOK_KEY);

        if (!signature || signature !== process.env.FLUTTER_SECRET_WEBHOOK_KEY) {
            res.status(401).end();
            return;
        }

        const payload = req.body;
        console.error("Webhook payload:", payload);


        if (payload?.status === 'successful') {
            const booking = await Booking.findOneAndUpdate(
                { sessionId: payload.txRef },
                {
                    isPaid: true,
                    status: 'approved',
                },
                { new: true }
            ).populate([
                { path: 'doctor', select: 'name _id email ticketPrice' },
                { path: 'user', select: 'name email _id' },
            ]);

            if (!booking) throw new Error('booking not found');

            const [docAppointment, userAppointment] = await Promise.all([
                Doctor.findByIdAndUpdate(booking.doctor._id, {
                    $push: { appointments: booking._id }
                }),

                User.findByIdAndUpdate(booking.user._id, {
                    $push: { appointments: booking._id }
                })

            ])

            if (!docAppointment || !userAppointment) {
                throw new Error('Failed to update appointments');
            };

            if (docAppointment && userAppointment) {

                const bookedOn = booking.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
                const bookingDetail: BookingCompleteInterface = {
                    patientName: booking.user.name,
                    doctorName: booking.doctor.name,
                    ticketPrice: booking.doctor.ticketPrice,
                    patientEmail: booking.user.email,
                    doctorEmail: booking.doctor.email,
                    bookingRef: booking._id.toString().slice(8).toUpperCase(),
                    bookedOn,
                    paymentDetail: {
                        customerCurrency: booking.paymentDetail.customerCurrency,
                        baseCurrency: booking.paymentDetail.baseCurrency,
                        amountPaid: booking.paymentDetail.amountPaid,
                        baseAmount: booking.paymentDetail.baseAmount
                    }
                }

                console.log('booking detail')

                await sendPatientBookingEmail(bookingDetail);

                await sendDoctorBookingEmail(bookingDetail);
            }

            console.log('new booking', booking)
        }
        // tx - 1781563509356
        res.status(200).end();
        return;

    } catch (error: any) {
        winston_logger.error(error.message, error.stack)
        res.status(500).end();
        return;
    }
};