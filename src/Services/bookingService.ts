import User from "models/UserSchema";
import Booking from "models/BookingSchema";
import Doctor from "models/DoctorSchema";
import Stripe from "stripe";
import { winston_logger } from "@utils/logger";

interface BookingInterface {
    doctorId: string;
    userId: string;
}

export const bookingSessionService = async ({ doctorId, userId }: BookingInterface) => {
    const stripeKey: string = process.env.STRIPE_SECRET_KEY || "";
    const devUrl: string = process.env.DEV_CLIENT_URL || "";
    const prodUrl: string = process.env.PROD_CLIENT_URL || "";
    const clientUrl = process.env.NODE_ENV === 'production' ? prodUrl : devUrl;
    const cancelUrl = `${clientUrl}/doctor/${doctorId}`;

    try {
        const [doctor, user] = await Promise.all([
            Doctor.findById(doctorId),
            User.findById(userId)
        ]);

        if (!doctor || !user) {
            throw new Error('Doctor or user not found');
        }

        const stripe = new Stripe(stripeKey);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            success_url: `${clientUrl}/payment-success-st?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl,
            customer_email: user.email,
            client_reference_id: doctorId,
            metadata: {
                userId: userId.toString(),
                doctorId
            },
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: doctor.ticketPrice * 100,
                        product_data: {
                            name: `Appointment with Dr. ${doctor.name}`,
                            description: doctor.bio || 'Medical consultation',
                            images: doctor.photo?.imageUrl ? [doctor.photo.imageUrl] : [],
                        },
                    },
                    quantity: 1,
                },
            ],
        });

        // ✅ Save booking as UNPAID — webhook marks it paid
        const booking = new Booking({
            doctor: doctor._id,
            user: user._id,
            ticketPrice: doctor.ticketPrice,
            stripeSessionId: session.id,
            isPaid: false,
            status: 'pending',
        });

        await booking.save();

        // ✅ Only return url and id — not the full session object
        return {
            message: 'Checkout session created',
            url: session.url,
            sessionId: session.id,
        };

    } catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { message: error.message, error, url: null };
    }
};