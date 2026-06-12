import { handleError } from "@utils/handledError";
import { NextFunction, Request, Response } from "express";
import { bookingSessionService } from "Services/bookingService";
import Booking from "models/BookingSchema";
import Doctor from "models/DoctorSchema";
import User from "models/UserSchema";
import { winston_logger } from "@utils/logger";
import Stripe from "stripe";
import { sendDoctorBookingEmail, sendPatientBookingEmail } from "@utils/message/nodemailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
});


// ─── Create Checkout Session ──────────────────────────────────────────────────
export const bookingSessionController = async (req: Request, res: Response, next: NextFunction) => {
    const doctorId = req.params.doctorId;
    const { id: userId, role } = res.locals.auth;

    if (role !== 'patient') {
        res.status(400).json({ status: 'failed', message: 'Only patients can book appointments' });
        return;
    }
    const { message, error, url, sessionId } = await bookingSessionService({ doctorId, userId });

    if (error) return next(handleError(error));

    res.status(200).json({ message, url, sessionId });
};


// ─── Stripe Webhook ───────────────────────────────────────────────────────────
export const stripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        res.status(400).send('Missing stripe-signature header');
        return;
    }

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        winston_logger.error('Webhook signature error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;

        if (session.payment_status === 'paid') {
            try {
                // ✅ Mark booking as paid
                const booking = await Booking.findOneAndUpdate(
                    { stripeSessionId: session.id },
                    { isPaid: true, status: 'approved' },
                    { new: true }
                ).populate([
                    { path: 'doctor', select: 'name _id email' },
                    { path: 'user', select: 'name email _id' },
                ]);

                if (!booking) {
                    winston_logger.error('No booking found for session:', session.id);
                    res.status(404).json({ message: 'Booking not found' });
                    return;
                }

                // ✅ Add booking to user and doctor's appointments
                const [docAppointment, userAppointment] = await Promise.all([
                    Doctor.findByIdAndUpdate(booking.doctor._id, {
                        $push: { appointments: booking._id }
                    }),

                    User.findByIdAndUpdate(booking.user._id, {
                        $push: { appointments: booking._id }
                    })

                ])

                if (!docAppointment || !userAppointment) {
                    winston_logger.error('Failed to update doctor or user appointments for booking:', booking._id);
                    res.status(500).json({ message: 'Failed to update appointments' });
                    return;
                };

                if (docAppointment && userAppointment) {

                    const bookedOn = booking.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
                    const bookingDetail = {
                        patientName: booking.user.name,
                        doctorName: booking.doctor.name,
                        ticketPrice: booking.ticketPrice,
                        patientEmail: booking.user.email,
                        doctorEmail: booking.doctor.email,
                        bookingRef: booking.user._id.toString().slice(8).toUpperCase(),
                        bookedOn,
                    }

                    await sendPatientBookingEmail(bookingDetail);

                    await sendDoctorBookingEmail(bookingDetail);


                    winston_logger.info(`Booking ${booking._id} marked as paid and approved. Doctor: ${booking.doctor.name}, User: ${booking.user.name}`);
                }

                winston_logger.info(`Booking confirmed}`);

            } catch (error: any) {
                winston_logger.error('Webhook handler error:', error.message);
                res.status(500).json({ message: error.message });
                return;
            }
        }
    }

    res.json({ received: true });
};

// ─── Get Booking by Stripe Session ID ────────────────────────────────────────
export const getBookingBySession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sessionId } = req.params;

        const booking = await Booking.findOne({ stripeSessionId: sessionId })
            .populate({ path: 'doctor', select: 'name photo specialization' })
            .populate({ path: 'user', select: 'name email photo' });

        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        res.status(200).json({ message: 'Booking fetched', booking });

    } catch (error: any) {
        next(handleError(error));
    }
};