import { log, winston_logger } from "@utils/logger"
import _ from "lodash"
import { UserSchemaInterface, DoctorSchemaInterface } from "types"
import Users from "models/UserSchema"
import BookingSchema from "models/BookingSchema"
import Doctors from "models/DoctorSchema"

interface GetUserServiceResult {
    data: UserSchemaInterface[] | UserSchemaInterface;
    message: string;
    error?: any;
}

interface GetDoctorServiceResult {
    data: DoctorSchemaInterface[];
    message: string;
    error?: any;
}

interface UpdateUser { id: string, body: UserSchemaInterface }


export const getUserService = async () => {
    try {
        const users = await Users.find().select(['-password', '-__v'])
        if (!users) throw new Error('cannot get users')

        return { data: users, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message, data: {} }
    }

}

export const getUserByIdService = async (id: string): Promise<Partial<GetUserServiceResult>> => {

    try {

        const user = await Users.findById(id).select(['-password', '-__v'])

        if (!user) throw new Error('user not found')

        return { data: user, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, { stack: error.stack })
        return { error, message: error.message }
    }
}

export const updateUserService = async ({ id, body }: UpdateUser): Promise<Partial<GetUserServiceResult>> => {

    const userData = { ...body, photo: body?.photo }

    try {

        const updatedUser = await Users.findByIdAndUpdate(id, userData, { new: true, runValidators: true }).select(['-password', '-__v'])
        if (!updatedUser) throw new Error("user not found")

        return { data: updatedUser, message: 'user updated successfully' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

export const deleteUserService = async (id: string): Promise<Partial<GetUserServiceResult>> => {
    try {
        const deleteUser = await Users.findByIdAndDelete(id)

        if (!deleteUser) throw new Error('user not found')

        return { message: 'user successfully deleted' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error }
    }
}

export const getUserProfileService = async (id: string) => {
    try {
        const user = await Users.findById(id).select(['-password', '-__v'])

        if (!user) throw new Error('user not found')
        return { data: user, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

export const getMyAppointmentsService = async (id: string): Promise<Partial<GetDoctorServiceResult>> => {
    try {
        const bookings = await BookingSchema.find({ user: id });

        const doctorIds = bookings.map(booking => booking.doctor.id);

        const doctors = await Doctors.find({ _id: { $in: doctorIds } }).select(['-password', '-__v']);

        return { data: doctors, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}