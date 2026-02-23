import { refreshStore } from './../utils/generateTokens';
import jwt from 'jsonwebtoken';
import { log, winston_logger } from "@utils/logger"
import Doctor from "models/DoctorSchema";
import User from "models/UserSchema";
import { decodedDataInterface, UserSchemaInterface } from "types"
import bcrypt from "bcryptjs"
import { generateAccessToken } from "@utils/generateTokens";
import _ from 'lodash'
import QueryString from "qs"
import { updateDoctor } from 'Controllers/doctorController';
import { verifyToken } from "@utils/generateTokens"
import Users from "models/UserSchema"

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

        // Hash the password
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

            const { token, error } = generateAccessToken({ user: { name: newUser.toObject().name, email: newUser.toObject().email, id: newUser.toObject()._id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions })
            const { token: refreshedToken, error: RefTokenError } = generateAccessToken({ user: { name: newUser.toObject().name, email: newUser.toObject().email, id: newUser.toObject()._id }, options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions })

            const tokenError = error || RefTokenError

            if (error || RefTokenError) throw new Error(tokenError);

            const data = _.omit(newUser.toObject(), ['password'])
            return { data, message: 'User created successfully', token, refreshedToken }
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

            const { token, error } = generateAccessToken({ user: { name: newDoctor.toObject().name, email: newDoctor.toObject().email, id: newDoctor.toObject()._id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions })
            const { token: refreshedToken, error: RefTokenError } = generateAccessToken({ user: { name: newDoctor.toObject().name, email: newDoctor.toObject().email, id: newDoctor.toObject()._id }, options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions })

            const tokenError = error || RefTokenError

            if (error || RefTokenError) throw new Error(tokenError);

            const data = _.omit(newDoctor.toObject(), ['password'])

            return { data, message: 'Doctor created successfully', token, refreshedToken }
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

        const userExist = userPatient || userDoctor

        const { token, error } = generateAccessToken({ user: { name: userExist?.toObject().name, email: userExist?.toObject().email, id: userExist?.toObject()._id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions });
        const { token: refreshedToken, error: RefTokenError } = generateAccessToken({ user: { name: userExist?.toObject().name, email: userExist?.toObject().email, id: userExist?.toObject()._id }, options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions })

        const tokenError = error || RefTokenError

        if (error || RefTokenError) throw new Error(tokenError);

        if (!userExist) throw new Error('Invalid email or password');

        const comPass = await bcrypt.compare(password, userExist.password);

        if (!comPass) throw new Error('Invalid email or password');

        const data = _.omit(userExist.toObject(), ['password']);

        if (!data.verified) {
            throw new Error('Please verify your email to login');
        }

        return { data, message: 'Login Successful', token, refreshedToken }
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

        const { decoded, expired, message } = verifyToken(token as string)
        if (message === 'jwt expired') {
            await Promise.all([
                Users.findByIdAndDelete(id),
                Doctor.findByIdAndDelete(id)
            ]);
            throw new Error('verification link expired')
        }


        [user, doctor] = await Promise.all([
            Users.findById(id),
            Doctor.findById(id)
        ]);

        if (!user && !doctor) {
            throw new Error('user not found')
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

export const refreshedTokenService = async (refreshedToken: string) => {
    try {
        const { decoded, expired, message } = verifyToken(refreshedToken);

        if (!decoded || expired) {
            throw new Error(message ?? 'refresh token expired');
        }

        const { name, email, id } = decoded as decodedDataInterface;

        const { token, error } = generateAccessToken({ user: { name, email, id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions });


        if (error) throw error;

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

