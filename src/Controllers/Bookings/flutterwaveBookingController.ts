import { NextFunction, Request, Response } from 'express';
import { initialBookingService, verifyBookingFlutterwaveService } from 'Services/bookingFlutterwaveService';
import { handleError } from '@utils/handledError';
import Booking from 'models/BookingSchema';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import { sendDoctorBookingEmail, sendPatientBookingEmail } from '@utils/message/nodemailer';

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

        const payload = req.body;
        const data = payload.data;

export const flutterwaveWebhook = async (req: Request, res: Response) => {
    console.log('i got here, flutterwave webhook line 50')
    try {
        const signature = req.headers['verif-hash'];

        if (!signature || signature !== process.env.FLUTTER_SECRET_WEBHOOK_KEY) {
            res.status(401).end();
            return;
        }

        const payload = req.body;


        // Also search without the sessionId filter to see all recent bookings

        if (payload?.status === 'successful') {
            const booking = await Booking.findOneAndUpdate(
                { sessionId: payload.txRef },
                {
                    isPaid: true,
                    status: 'approved',
                },
                { new: true }
            ).populate([
                { path: 'doctor', select: 'name _id email' },
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
                const bookingDetail = {
                    patientName: booking.user.name,
                    doctorName: booking.doctor.name,
                    ticketPrice: booking.doctor.ticketPrice,
                    patientEmail: booking.user.email,
                    doctorEmail: booking.doctor.email,
                    bookingRef: booking._id.toString().slice(8).toUpperCase(),
                    bookedOn,
                }

                await sendPatientBookingEmail(bookingDetail);

                await sendDoctorBookingEmail(bookingDetail);
            }

            console.log('new booking', booking)
        }
        // tx - 1781563509356
        res.status(200).end();
        return;

    } catch (err: any) {
        console.error("Webhook error:", err.message);
        res.status(500).end();
        return;
    }
};