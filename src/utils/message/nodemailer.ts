import nodemailer from 'nodemailer';
import { mailOptions, decodedData, forgotPassword, BookingCompleteInterface, } from 'types';
import { verifyEmailTemplate } from './emailTemplate';
import { forgotPasswordTemplate } from './forgotPasswordTemplate';
import dotenv from 'dotenv';
import { winston_logger } from '@utils/logger';
import { doctorBookingTemplate } from './doctorBookingTemplate';
import { patientBookingTemplate } from './patientBookingTemplate';
import { passwordResetTemplate } from './passwordResetEmail';
import { passwordChangeSuccessTemplate } from './passwordSuccessfulTemplate';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: process.env.E_SERVICE,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD,
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
        const resp = await transporter.sendMail(mailOptions);
        return resp;

    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
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
        await transporter.sendMail(mailOptions);
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
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
        await transporter.sendMail(mailOptions);
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
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
        await transporter.sendMail(mailOptions);
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
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
        await transporter.sendMail(mailOptions);
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
    };
}


export { sendVerificationEmail, sendResetPasswordEmail, sendPatientBookingEmail, sendDoctorBookingEmail, sendResetPasswordSuccessfulEmail }