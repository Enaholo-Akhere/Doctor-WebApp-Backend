import { log, winston_logger } from "@utils/logger"
import _ from "lodash"
import { UserSchemaInterface, DoctorSchemaInterface } from "types"
import Users from "models/UserSchema"
import BookingSchema from "models/BookingSchema"
import Doctors from "models/DoctorSchema"
import PushSubscription from "models/PushSubscriptionSchema"

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
        const users = await Users.find().select(['-password', '-__v', '-refreshedToken'])
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

        const user = await Users.findById(id).select(['-password', '-__v', '-refreshedToken'])

        if (!user) throw new Error('user not found')

        return { data: user, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, { stack: error.stack })
        return { error, message: error.message }
    }
}

export const updateUserService = async ({ id, body }: UpdateUser): Promise<Partial<GetUserServiceResult>> => {

    const allowedFields = [
        "name",
        "phone",
        "photo",
        "bloodType",
        "gender"
    ];

    const userData = _.pick(body, allowedFields);

    try {

        const updatedUser = await Users.findByIdAndUpdate(id, userData, { new: true, runValidators: true }).select(['-password', '-__v', '-refreshedToken'])
        if (!updatedUser) throw new Error("user not found")

        return { data: updatedUser, message: 'user updated successfully' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

const HEALTH_FIELDS = [
    "dateOfBirth",
    "address",
    "heightCm",
    "weightKg",
    "bloodType",
    "genotype",
    "allergies",
    "chronicConditions",
    "medications",
    "emergencyContact",
] as const;

/** Updates only the health-profile fields; empty values clear the field. */
export const updateHealthProfileService = async (id: string, body: Record<string, unknown>): Promise<Partial<GetUserServiceResult>> => {
    const picked = _.pick(body, HEALTH_FIELDS);
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};

    for (const [key, value] of Object.entries(picked)) {
        if (value === '' || value === null) $unset[key] = 1;
        else if (Array.isArray(value)) $set[key] = _.uniqBy(value.map((v) => String(v).trim()).filter(Boolean), (v) => v.toLowerCase());
        else $set[key] = value;
    }

    try {
        const updatedUser = await Users.findByIdAndUpdate(
            id,
            { ...(Object.keys($set).length && { $set }), ...(Object.keys($unset).length && { $unset }) },
            { new: true, runValidators: true }
        ).select(['-password', '-__v', '-refreshedToken'])

        if (!updatedUser) throw new Error("user not found")

        return { data: updatedUser, message: 'health profile updated' }
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

        await PushSubscription.deleteMany({ userId: String(id) }).catch(() => undefined)

        return { message: 'user successfully deleted' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error }
    }
}

export const getUserProfileService = async (id: string) => {
    try {
        const user = await Users.findById(id).select(['-password', '-__v', '-refreshedToken']).populate({
            path: 'appointments',
            populate: [
                { path: 'doctor', select: 'name photo specialization averageRating totalRating hospital status timeSlots' },
                { path: 'user', select: 'name email photo' },
            ]
        });

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

        const doctors = await Doctors.find({ _id: { $in: doctorIds } }).select(['-password', '-__v', '-refreshedToken']);

        return { data: doctors, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}