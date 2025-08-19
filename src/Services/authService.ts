import { refreshStore } from './../utils/generateTokens';
import jwt from 'jsonwebtoken';
import { log, winston_logger } from "@utils/logger"
import Doctor from "models/DoctorSchema";
import User from "models/UserSchema";
import { UserSchemaInterface } from "types"
import bcrypt from "bcryptjs"
import { generateAccessToken } from "@utils/generateTokens";
import _ from 'lodash'

export const registerService = async (body: UserSchemaInterface) => {

    const { email, password, photo, name, role, gender } = body




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
        winston_logger.error(error.message, error.stack)
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

        const data = _.omit(userExist.toObject(), ['password'])

        return { data, message: 'Login Successful', token, refreshedToken }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message, data: {} }
    }
}