
import { winston_logger } from "@utils/logger";
import axios from "axios";
import Doctor from "models/DoctorSchema";
import User from "models/UserSchema";
import Booking from 'models/BookingSchema';
import { detectPaymentProvider } from "@utils/paymentProvider";



export const initialBookingService = async ({ amount, userId, ip, doctorId }: { ip: string, doctorId: string, userId: string, amount: string, name: string, email: string }) => {
    const secK = process.env.FLUTTER_SECRET_KEY;
    const DEV_CLIENT_URL = process.env.DEV_CLIENT_URL
    const PROD_CLIENT_URL = process.env.PROD_CLIENT_URL
    const baseUrl = process.env.NODE_ENV === 'production' ? PROD_CLIENT_URL : DEV_CLIENT_URL
    const redirectUrl = `${baseUrl}/payment-success-fl?doctorId=${doctorId}`


    try {
        const { currency, exchangeRate, countryCode, provider } = await detectPaymentProvider(ip);

        const [user, doctor] = await Promise.all([
            User.findById(userId),
            Doctor.findById(doctorId)
        ]);


        // const userAppointments = new Set(user?.appointments?.map(String));
        // const hasBooked = doctor?.appointments?.some((appt) => userAppointments.has(String(appt)));

        // if (hasBooked) throw new Error('You have booked this doctor already')

        const price = exchangeRate * Number(doctor?.ticketPrice);

        const paymentDetail = {
            baseAmount: Number(doctor?.ticketPrice),
            baseCurrency: 'USD',
            customerCurrency: currency,
            exchangeRate,
            ipAddress: ip,
            amountPaid: price
        }

        const userExist = user && doctor;

        if (!userExist) throw new Error('User not found!');

        const tx_ref = `tx-${Date.now()}`;

        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            {
                tx_ref,
                amount: price,
                currency: currency,
                redirect_url: redirectUrl,
                customer: { email: user.email, name: user.name, phone: user.phone },
                customizations: {
                    title: 'CareConnect Payment',
                    description: 'Appointment booking payment',
                },
                meta: {
                    doctorId: doctor?.toObject()._id.toString(),
                    userId: user?.toObject()._id.toString(),
                    ticketPrice: amount,
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${secK}`,
                },
            }
        );
        const booking = new Booking({
            doctor: doctor?._id,
            user: user?._id,
            ticketPrice: doctor?.ticketPrice,
            isPaid: false,
            status: 'pending',
            paymentPlatform: 'flw',
            sessionId: tx_ref,
            paymentDetail
        });

        await booking.save();

        return { data: response.data }
    } catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message };
    }
};


export const verifyBookingFlutterwaveService = async ({ transactionId, userId, doctorId }: { transactionId: string, userId: string, doctorId: string }) => {

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


        const [user, doctor] = await Promise.all([
            User.findById(userId),
            Doctor.findById(doctorId)
        ])

        const userExist = user && doctor;

        if (!userExist) throw new Error('User not found!');

        if (!userExist) throw new Error('User not found!');

        const booking = new Booking({
            doctor: doctor?._id,
            user: user?._id,
            ticketPrice: doctor?.ticketPrice,
            isPaid: true,
            status: 'approved',
            paymentPlatform: 'flw',
            sessionId: data.tx_ref,
        });

        await booking.save();

        return { data }
    }
    catch (error: any) {
        winston_logger.info(error.message, error.stack);
        return { message: error.message, error }
    }
}