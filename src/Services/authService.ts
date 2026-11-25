import jwt from 'jsonwebtoken';
import { log, winston_logger } from "@utils/logger"
import Doctor from "models/DoctorSchema";
import User from "models/UserSchema";
import { UserSchemaInterface } from "types"
import bcrypt from "bcryptjs"
import { generateAccessToken } from "@utils/generateTokens";
import _, { truncate } from 'lodash'
import QueryString from "qs"
import { verifyToken } from "@utils/generateTokens"
import Users from "models/UserSchema"
import { AUDIENCE } from 'config/constant';
import PasswordSchema from "models/ResetPasswordSchema";
import mongoose from 'mongoose';
import { appError } from '@utils/appError';
import { sendVerificationEmail } from '@utils/message/nodemailer';


export const registerService = async (body: UserSchemaInterface) => {

    const { email, password, photo, name, role, gender, phone, bloodType } = body

    try {

        // Login looks an email up in both collections, so it must be unique across both.
        const [existingPatient, existingDoctor] = await Promise.all([User.findOne({ email }), Doctor.findOne({ email })]);
        if (existingPatient || existingDoctor) {
            throw appError({ message: 'An account with this email already exists', statusCode: 409 });
        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt)

        const fields = { email, password: hashedPassword, photo, name, role, gender, verified: false, phone, bloodType };
        const account = role === 'doctor' ? await new Doctor(fields).save() : await new User(fields).save();

        const { token, error } = createVerificationToken(String(account._id), role);
        if (error || !token) {
            await deleteAccount(String(account._id));
            throw new Error('Could not create a verification link');
        }

        return { data: account, token, message: role === 'doctor' ? 'Doctor created successfully' : 'User created successfully' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }

}

/** Removes an account that was created but never got its verification email. */
export const deleteAccount = async (id: string) => {
    await Promise.all([User.findByIdAndDelete(id), Doctor.findByIdAndDelete(id)]);
}

/** Email links get their own audience so they can't be used as access tokens, and vice versa. */
const verificationAudience = (role?: string) =>
    `${role === 'doctor' ? AUDIENCE.DOCTOR : AUDIENCE.PATIENT}:email-verify`;

export const createVerificationToken = (id: string, role?: string) =>
    generateAccessToken({
        user: { id },
        options: { expiresIn: process.env.VERIFY_TOKEN_EXPIRY || '24h' } as jwt.SignOptions,
        audience: verificationAudience(role),
    });

export const loginServices = async ({ email, password }: { email: string, password: string }) => {

    try {

        const [userPatient, userDoctor] = await Promise.all([
            User.findOne({ email }),
            Doctor.findOne({ email }),
        ])

        const userExist = userPatient || userDoctor;

        if (!userExist) throw new Error('Invalid email or password');

        // Every check happens before any token is issued or saved, so a failed attempt changes nothing.
        const comPass = await bcrypt.compare(password, userExist.password);

        if (!comPass) throw new Error('Invalid email or password');

        if (userExist.deletedAt) throw new Error('This account has been deactivated');

        if (!userExist.verified) throw new Error('Please verify your email to login');

        let audience: string | undefined;

        if (userPatient) audience = AUDIENCE.PATIENT;
        if (userDoctor) audience = AUDIENCE.DOCTOR;

        const id = String(userExist._id);
        const { token, error } = generateAccessToken({ user: { id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions, audience });
        const { token: refreshedToken, error: RefTokenError } = generateAccessToken({ user: { id }, options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions, audience })

        const tokenError = error || RefTokenError

        if (tokenError) throw new Error(tokenError);

        const select = '-password -__v -refreshedToken';
        const updatedUserDoctor = userPatient
            ? await User.findByIdAndUpdate(id, { refreshedToken }, { new: true }).select(select)
            : await Doctor.findByIdAndUpdate(id, { refreshedToken }, { new: true }).select(select);

        return { data: updatedUserDoctor, message: 'Login Successful', token, refreshedToken }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message, data: {} }
    }
}

const INVALID_LINK = 'This verification link is invalid. Request a new one below.';

export const verifyEmailService = async (id: unknown, token: unknown) => {
    try {
        if (typeof id !== 'string' || !mongoose.isValidObjectId(id) || typeof token !== 'string' || !token) {
            throw appError({ message: INVALID_LINK, statusCode: 400 });
        }

        const [user, doctor] = await Promise.all([User.findById(id), Doctor.findById(id)]);
        const account = user || doctor;

        if (!account) throw appError({ message: 'We could not find this account. Please sign up again.', statusCode: 404 });

        // Clicking the link twice (or React running the effect twice) is not an error.
        if (account.verified) return { message: 'Your email is already verified. You can log in.' };

        const { decoded, message } = verifyToken(token, verificationAudience(doctor ? 'doctor' : 'patient'));

        if (message === 'jwt expired') {
            throw appError({ message: 'This verification link has expired. Request a new one below.', statusCode: 410 });
        }
        if (message !== 'token active' || (decoded as jwt.JwtPayload).sub !== id) {
            throw appError({ message: INVALID_LINK, statusCode: 400 });
        }

        if (doctor) await Doctor.updateOne({ _id: id }, { verified: true });
        else await User.updateOne({ _id: id }, { verified: true });

        return { message: 'Email verified successfully' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

export const RESEND_MESSAGE = "If an unverified account exists for that email, we've sent a new verification link.";

export const resendVerificationService = async (email: string) => {
    try {
        const [user, doctor] = await Promise.all([User.findOne({ email }), Doctor.findOne({ email })]);
        const account = user || doctor;

        // Same answer whether or not the account exists, so this can't be used to probe for emails.
        if (!account || account.verified || account.deletedAt) return { message: RESEND_MESSAGE };

        const { token, error } = createVerificationToken(String(account._id), doctor ? 'doctor' : 'patient');
        if (error || !token) throw new Error('Could not create a verification link');

        const { error: mailError } = await sendVerificationEmail(
            { name: account.name, email: account.email, _id: String(account._id) },
            token,
        );
        if (mailError) {
            throw appError({ message: "We couldn't send the email right now. Please try again shortly.", statusCode: 502 });
        }

        return { message: RESEND_MESSAGE }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

export const refreshedTokenService = async (refreshedToken: string, id: string) => {

    try {

        const [user, doctor] = await Promise.all([
            User.findById(id),
            Doctor.findById(id)
        ]);

        const account = user || doctor;

        // Logging out (or an admin deactivating the account) clears the stored token,
        // which ends every session for the account.
        if (!account?.refreshedToken) throw new Error('Refreshed token not found');
        if (account.deletedAt) throw new Error('This account has been deactivated');

        const audience = doctor ? AUDIENCE.DOCTOR : AUDIENCE.PATIENT;

        const { decoded, expired } = verifyToken(refreshedToken, audience);

        if (expired) throw new Error('refresh token expired');

        // Only a token we signed, for this same account, can mint a new access token.
        if (!decoded || (decoded as jwt.JwtPayload).sub !== id) throw new Error('refresh token invalid');

        const { token, error } = generateAccessToken({ user: { id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions, audience });

        if (error) throw new Error(error);

        return {
            token,
            error: null,
            message: 'Token refreshed successfully'
        };
    } catch (error: any) {

        winston_logger.error(error.message, error.stack);
        return {
            token: null,
            error,
            message: error.message
        };
    }
};

export const forgotPasswordService = async (email: string) => {
    try {
        const [user, doctor] = await Promise.all([
            User.findOne({ email }),
            Doctor.findOne({ email }),
        ]);

        const userExist = user || doctor;

        if (!userExist) {
            throw new Error('User not found');
        }
        const passReqAlready = await PasswordSchema.findOne({ userId: userExist._id });

        if (passReqAlready) {
            const { expired } = verifyToken(passReqAlready.token);

            if (!expired) throw new Error('Please click the reset link sent to your email');

            if (expired) {
                await PasswordSchema.findOneAndDelete({ userId: userExist._id });
            }
        };

        const { token, error } = generateAccessToken({ user: { id: userExist?.toObject()._id }, options: { expiresIn: "30m" } as jwt.SignOptions });


        if (error) throw new Error(error);

        const resetPassword = new PasswordSchema({
            token,
            userId: userExist?.toObject()._id,
        })

        const savedRestPassword = await resetPassword.save();

        return { message: 'Password reset link sent successfully', token: savedRestPassword?.toObject().token, id: savedRestPassword?.toObject()._id };

    } catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message };
    }
};

export const setPasswordService = async (newPassword: string, id: string, token: string) => {
    try {
        const requestedPassChange = await PasswordSchema.findById(id);
        const { decoded, expired, message } = verifyToken(token as string);

        if (!decoded || expired) {
            await PasswordSchema.findByIdAndDelete(id);
            throw new Error(message ?? 'Invalid or expired token');
        }

        const { sub } = decoded as jwt.JwtPayload

        if (sub !== requestedPassChange?.toObject()?.userId.toString()) {
            throw new Error('token compromise')
        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const [doctor, user] = await Promise.all([
            Doctor.findByIdAndUpdate({ _id: requestedPassChange?.userId }, { password: hashedPassword }, { new: true }).select('-password -refreshedToken'),
            Users.findByIdAndUpdate({ _id: requestedPassChange?.userId }, { password: hashedPassword }, { new: true }).select('-password -refreshedToken'),

        ])

        const changedPass = doctor || user;

        if (changedPass) {
            await PasswordSchema.findByIdAndDelete(id);

        }

        if (!changedPass) throw new Error('could not change password');

        return { message: 'password changed successfully', data: changedPass }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message }
    }
}

export const logoutService = async (id: string) => {

    try {
        const [updatedUser, updatedDoctor] = await Promise.all([
            User.findByIdAndUpdate(id, { $unset: { refreshedToken: 1 } }, { new: true }).select('-password -__v '),
            Doctor.findByIdAndUpdate(id, { $unset: { refreshedToken: 1 } }, { new: true }).select('-password -__v ')
        ]);

        const updatedUserDoctor = updatedUser || updatedDoctor;

        if (!updatedUserDoctor) throw new Error('user not found');

        return { message: 'Logged out successfully' };

    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message }
    }
}