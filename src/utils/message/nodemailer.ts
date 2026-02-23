import nodemailer from 'nodemailer';
import { mailOptions, decodedData, forgotPassword } from 'types';
import { verifyEmailTemplate } from './emailTemplate';
import { forgotPasswordTemplate } from './forgotPasswordTemplate';
import dotenv from 'dotenv';
import { winston_logger } from '@utils/logger';
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
        from: process.env.AUTH_EMAIL,
        to: data.email,
        subject: 'Verify Your Email',
        html: verifyEmailTemplate(data, token),
    };
    try {
        await transporter.sendMail(mailOptions);
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
    }
}


const sendForgotPasswordEmail = async (respData: forgotPassword) => {
    const mailOptions = <mailOptions>{
        from: process.env.AUTH_EMAIL,
        to: respData.email,
        subject: 'Reset Your Password',
        html: forgotPasswordTemplate(respData),
    };
    try {
        await transporter.sendMail(mailOptions);
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
    };
};


export { sendVerificationEmail, sendForgotPasswordEmail }