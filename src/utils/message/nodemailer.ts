import nodemailer from 'nodemailer';
import { mailOptions, decodedData, forgotPassword, BookingCompleteInterface, } from 'types';
import { verifyEmailTemplate } from './emailTemplate';
import dotenv from 'dotenv';
import { winston_logger } from '@utils/logger';
import { doctorBookingTemplate } from './doctorBookingTemplate';
import { patientBookingTemplate } from './patientBookingTemplate';
import { passwordResetTemplate } from './passwordResetEmail';
import { passwordChangeSuccessTemplate } from './passwordSuccessfulTemplate';
dotenv.config();

// const transporter = nodemailer.createTransport({
//     service: process.env.E_SERVICE,
//     auth: {
//         user: process.env.AUTH_EMAIL,
//         pass: process.env.AUTH_PASSWORD,
//     },
// });

const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 587,
    secure: true,
    auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
    },
});


const sendVerificationEmail = async (data: decodedData, token: string) => {

    const mailOptions = <mailOptions>{
        from: `CareConnect <${process.env.AUTH_EMAIL}>`,
        to: data.email,
        subject: 'Verify Your Email',
        html: verifyEmailTemplate(data, token),
    };
    try {
        const sent = await transporter.sendMail(mailOptions);

        if (!sent.messageId.length) throw new Error('message not sent');

        return { sent }

    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error }
    }
};


const sendResetPasswordEmail = async (respData: { email: string; token: string; id: string }) => {
    const mailOptions = <mailOptions>{
        from: `CareConnect <${process.env.AUTH_EMAIL}>`,
        to: respData.email,
        subject: 'Reset Your Password',
        html: passwordResetTemplate(respData.token, respData.id),
    };
    try {
        const sent = await transporter.sendMail(mailOptions);
        if (!sent.messageId.length) throw new Error('message not sent');

        console.log('reset password messenger', sent)
        return { sent }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error }
    };
};

const sendResetPasswordSuccessfulEmail = async (respData: { name: string, email: string }) => {
    const mailOptions = <mailOptions>{
        from: `CareConnect <${process.env.AUTH_EMAIL}>`,
        to: respData.email,
        subject: 'Your CareConnect Password Has Been Changed',
        html: passwordChangeSuccessTemplate(respData.name),
    };
    try {
        const sent = await transporter.sendMail(mailOptions);
        if (!sent.messageId.length) throw new Error('message not sent');

        return { sent }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error }
    };
};

const sendPatientBookingEmail = async (respData: BookingCompleteInterface) => {
    const mailOptions = <mailOptions>{
        from: `CareConnect <${process.env.AUTH_EMAIL}>`,
        to: respData.patientEmail,
        subject: 'Your Booking Confirmation',
        html: patientBookingTemplate(respData),
    };
    try {
        const sent = await transporter.sendMail(mailOptions);
        if (!sent.messageId.length) throw new Error('message not sent');

        return { sent }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error }
    };
}

const sendDoctorBookingEmail = async (respData: BookingCompleteInterface) => {
    const mailOptions = <mailOptions>{
        from: `CareConnect <${process.env.AUTH_EMAIL}>`,
        to: respData.doctorEmail,
        subject: 'New Booking Alert',
        html: doctorBookingTemplate(respData),
    };
    try {
        const sent = await transporter.sendMail(mailOptions);
        if (!sent.messageId.length) throw new Error('message not sent');

        return { sent };
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error }
    };
}


export { sendVerificationEmail, sendResetPasswordEmail, sendPatientBookingEmail, sendDoctorBookingEmail, sendResetPasswordSuccessfulEmail }