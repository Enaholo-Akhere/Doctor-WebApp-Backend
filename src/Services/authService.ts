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


export const registerService = async (body: UserSchemaInterface) => {

    const { email, password, photo, name, role, gender, phone, bloodType } = body

    try {

        let user = null;
        if (role === 'patient') {
            user = await User.findOne({ email })
        } else if (role === 'doctor') {
            user = await Doctor.findOne({ email })
        }
        if (user) throw new Error('User with email already exits')

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt)

        if (role === 'patient') {
            const newUser = new User({
                email,
                password: hashedPassword,
                photo,
                name,
                role,
                gender,
                verified: false,
                phone,
                bloodType
            })
            await newUser.save()

            return { data: newUser, message: 'User created successfully', }
        }

        if (role === 'doctor') {
            const newDoctor = new Doctor({
                email,
                password: hashedPassword,
                photo,
                name,
                role,
                gender,
                verified: false,
                phone,
                bloodType
            })
            await newDoctor.save()

            return { data: newDoctor, message: 'Doctor created successfully' }
        }

    }
    catch (error: any) {
        return { error, message: error.message }
    }

}

export const loginServices = async ({ email, password }: { email: string, password: string }) => {

    try {

        const [userPatient, userDoctor] = await Promise.all([
            User.findOne({ email }),
            Doctor.findOne({ email }),
        ])

        const userExist = userPatient || userDoctor;

        if (!userExist) throw new Error('Invalid email or password');

        let audience: string | undefined;

        if (userPatient) audience = AUDIENCE.PATIENT;
        if (userDoctor) audience = AUDIENCE.DOCTOR;

        const { token, error } = generateAccessToken({ user: { id: userExist?.toObject()._id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions, audience });
        const { token: refreshedToken, error: RefTokenError } = generateAccessToken({ user: { id: userExist?.toObject()._id }, options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions, audience })

        const [updatedUser, updatedDoctor] = await Promise.all([
            User.findByIdAndUpdate(userExist._id, { refreshedToken }, { new: true }).select('-password -__v -refreshedToken'),
            Doctor.findByIdAndUpdate(userExist._id, { refreshedToken }, { new: true }).select('-password -__v -refreshedToken')
        ])

        const updatedUserDoctor = updatedUser || updatedDoctor;
        const tokenError = error || RefTokenError

        if (error || RefTokenError) throw new Error(tokenError);

        const comPass = await bcrypt.compare(password, userExist.password);

        if (!comPass) throw new Error('Invalid email or password');

        if (!updatedUserDoctor || !updatedUserDoctor?.verified) {
            throw new Error('Please verify your email to login');
        }

        return { data: updatedUserDoctor, message: 'Login Successful', token, refreshedToken }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message, data: {} }
    }
}

export const verifyEmailService = async (id: string | QueryString.ParsedQs | (string | QueryString.ParsedQs)[] | undefined, token: string | QueryString.ParsedQs | (string | QueryString.ParsedQs)[] | undefined) => {

    try {
        let user: any;
        let doctor: any;

        [user, doctor] = await Promise.all([
            Users.findById(id),
            Doctor.findById(id)
        ]);

        if (!user && !doctor) {
            throw new Error('user not found')
        }

        let audience;

        if (user) audience = AUDIENCE.PATIENT;
        if (doctor) audience = AUDIENCE.DOCTOR;

        const { decoded, expired, message } = verifyToken(token as string, audience);

        if (message === 'jwt expired') {
            await Promise.all([
                Users.findByIdAndDelete(id),
                Doctor.findByIdAndDelete(id)
            ]);
            throw new Error('verification link expired')
        }

        else {

            if (message === 'jwt expired') {
                await Promise.all([
                    Users.findByIdAndDelete(id),
                    Doctor.findByIdAndDelete(id)
                ]);
                throw new Error('verification link expired')
            };
            [user, doctor] = await Promise.all([
                Users.findByIdAndUpdate(id, { verified: true }, { new: true }),
                Doctor.findByIdAndUpdate(id, { verified: true }, { new: true })
            ]);
        }

        return { message: 'Email verified successfully' }
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

        let audience: string | undefined;

        if (user?._id.toString() === id) audience = AUDIENCE.PATIENT;
        if (doctor?._id.toString() === id) audience = AUDIENCE.DOCTOR;

        const { decoded, expired, message } = verifyToken(refreshedToken, audience);

        if (!decoded || expired) {
            throw new Error(message ?? 'refresh token expired');
        }

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
            Doctor.findOne({ email })
        ]);

        const userExist = user || doctor;

        if (!userExist) {
            throw new Error('User not found');
        }

        const { token, error } = generateAccessToken({ user: { id: userExist?.toObject()._id }, options: { expiresIn: "30m" } as jwt.SignOptions });

        if (error) throw new Error(error);

        const resetPassword = new PasswordSchema({
            token,
            userId: userExist?.toObject()._id
        })

        const savedRestPassword = await resetPassword.save()

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
        const userId = requestedPassChange?.toObject()?.userId.toString();
        console.log('id', userId);
        console.log('sub', sub);


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