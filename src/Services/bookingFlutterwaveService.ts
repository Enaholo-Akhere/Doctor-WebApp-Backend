import { winston_logger } from "@utils/logger";
import axios from "axios";
import Booking from 'models/BookingSchema';
import Doctor from "models/DoctorSchema";
import User from "models/UserSchema";

export const initialBookingService = async ({ amount, email, name, id }: { id: string, amount: string, name: string, email: string }) => {
    const secK = process.env.FLUTTER_SECRET_KEY;
    const DEV_CLIENT_URL = process.env.DEV_CLIENT_URL
    const PROD_CLIENT_URL = process.env.PROD_CLIENT_URL
    const baseUrl = process.env.NODE_ENV === 'production' ? PROD_CLIENT_URL : DEV_CLIENT_URL
    const redirectUrl = `${baseUrl}/payment-success-fl`
    console.log('initial booking')

    try {

        const [user, doctor] = await Promise.all([
            User.findById(id),
            Doctor.findById(id)
        ])

        const userExist = user || doctor;

        if (!userExist) throw new Error('User not found!');

        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            {
                tx_ref: `tx-${Date.now()}`,
                amount,
                currency: 'NGN',
                redirect_url: redirectUrl,
                customer: { email, name },
                customizations: {
                    title: 'CareConnect Payment',
                    description: 'Appointment booking payment',
                },
                meta: {
                    doctorId: doctor?.toObject()._id.toString(),
                    userId: user?.toObject()._id.toString()
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${secK}`,
                },
            }
        );

        console.log('response', response.data)

        const booking = new Booking({
            doctor: doctor?._id,
            user: user?._id,
            ticketPrice: doctor?.ticketPrice,
            isPaid: false,
            status: 'pending',
            paymentPlatform: 'flt',
            sessionId: ''
        });

        await booking.save();

        return { data: response.data.data }
    } catch (error: any) {
        return { error, message: error.message };
    }
};


export const bookingFlutterwaveService = async ({ transactionId, userId }: { transactionId: string, userId: string }) => {

    try {
        const response = await axios.get(
            `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTER_SECRET_KEY}`,
                },
            }
        );


        if (!response.data.data) throw new Error('could not get user transaction')

        const data = response.data.data;

        // Verify this transaction belongs to the requesting user
        const booking = await Booking.findOne({ tx_ref: data.tx_ref, userId });
        if (!booking) {
            throw new Error('Not authorized')
        }


        return { data }
    }
    catch (error: any) {
        winston_logger.info(error.message, error.stack);
        return { message: error.message, error }
    }
}