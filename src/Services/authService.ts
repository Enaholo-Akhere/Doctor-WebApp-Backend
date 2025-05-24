import { log, winston_logger } from "@utils/logger"
import Doctor from "models/DoctorSchema";
import User from "models/UserSchema";
import { UserSchemaInterface } from "types"
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken } from "@utils/generateTokens";


export const registerService = async (body: UserSchemaInterface) => {
    log(JSON.stringify(body))
    const { email, password, photo, name, role, gender } = body

    const token = generateAccessToken({ email, name })
    const refreshedToken = generateRefreshToken({ email, name })
    log(`Token, ${token}`)
    log(`RefreshedToken, ${refreshedToken}`)

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
                token,
                refreshedToken
            })
            await newUser.save()
            return { data: newUser, message: 'User created successfully' }
        }

        if (role === 'doctor') {
            const newDoctor = new Doctor({
                email,
                password: hashedPassword,
                photo,
                name,
                role,
                gender
            })
            await newDoctor.save()
            return { data: newDoctor, message: 'Doctor created successfully' }
        }

    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }

}