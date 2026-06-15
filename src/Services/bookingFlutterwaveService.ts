import { winston_logger } from "@utils/logger";
import axios from "axios";
import Doctor from "models/DoctorSchema";
import User from "models/UserSchema";
import Booking from 'models/BookingSchema';
import { sendDoctorBookingEmail, sendPatientBookingEmail } from "@utils/message/nodemailer";


export const initialBookingService = async ({ amount, email, name, userId, doctorId }: { doctorId: string, userId: string, amount: string, name: string, email: string }) => {
    const secK = process.env.FLUTTER_SECRET_KEY;
    const DEV_CLIENT_URL = process.env.DEV_CLIENT_URL
    const PROD_CLIENT_URL = process.env.PROD_CLIENT_URL
    const baseUrl = process.env.NODE_ENV === 'production' ? PROD_CLIENT_URL : DEV_CLIENT_URL
    const redirectUrl = `${baseUrl}/payment-success-fl?doctorId=${doctorId}`

    try {

        const [user, doctor] = await Promise.all([
            User.findById(userId),
            Doctor.findById(doctorId)
        ]);

        const userAppointments = new Set(user?.appointments?.map(String));
        const hasBooked = doctor?.appointments?.some((appt) => userAppointments.has(String(appt)));

        if (hasBooked) throw new Error('You have booked this doctor already')

        const userExist = user && doctor;

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


        return { data: response.data }
    } catch (error: any) {
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

        // console.log('flutter verify data line 76', data);

        const [user, doctor] = await Promise.all([
            User.findById(userId),
            Doctor.findById(doctorId)
        ])

        const userExist = user && doctor;

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

        const [docAppointment, userAppointment] = await Promise.all([
            Doctor.findByIdAndUpdate(doctor._id, {
                $push: { appointments: booking._id }
            }),

            User.findByIdAndUpdate(user._id, {
                $push: { appointments: booking._id }
            })

        ])

        if (!docAppointment || !userAppointment) {
            throw new Error('Failed to update appointments');
        };

        if (docAppointment && userAppointment) {

            const bookedOn = booking.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
            const bookingDetail = {
                patientName: user.name,
                doctorName: doctor.name,
                ticketPrice: doctor.ticketPrice,
                patientEmail: user.email,
                doctorEmail: doctor.email,
                bookingRef: booking._id.toString().slice(8).toUpperCase(),
                bookedOn,
            }

            await sendPatientBookingEmail(bookingDetail);

            await sendDoctorBookingEmail(bookingDetail);
        }

        return { data }
    }
    catch (error: any) {
        winston_logger.info(error.message, error.stack);
        return { message: error.message, error }
    }
}