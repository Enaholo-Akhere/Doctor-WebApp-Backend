import mongoose from "mongoose"
import { log, winston_logger } from "@utils/logger"
import _ from "lodash"
import Doctor from "models/DoctorSchema"
import { DoctorSchemaInterface } from "types"
import Booking from "models/BookingSchema"
import escapeStringRegexp from "escape-string-regexp"
import { isObjectIdString, uniqueDoctorSlug } from "@utils/doctorSlug"

/**
 * Fields never sent by the public, unauthenticated doctor endpoints. Email
 * and phone are contact details for the platform, not for anyone browsing.
 * Doctors still see their own via /doctors/profile/me.
 */
const PUBLIC_DOCTOR_EXCLUDE = ['-password', '-__v', '-refreshedToken', '-email', '-phone', '-verificationDocuments', '-approvalReview', '-licenceReminderSentAt'];

interface GetDoctorServiceResult {
    data: DoctorSchemaInterface[] | DoctorSchemaInterface;
    message: string;
    error?: any;
}

interface GetDoctorById { id: string, body: DoctorSchemaInterface }

export const getDoctorService = async (search?: string): Promise<Partial<GetDoctorServiceResult>> => {
    const escapedName = search ? escapeStringRegexp(String(search)) : '';
    const escapedSpec = search ? escapeStringRegexp(String(search)) : '';


    try {
        let doctor: DoctorSchemaInterface[];

        if (search) {
            // Only verified doctors are listed or bookable.
            doctor = await Doctor.find({
                isApproved: 'approved',
                deletedAt: null,
                $or: [
                    { name: { $regex: escapedName, $options: 'i' } },
                    { specialization: { $regex: escapedSpec, $options: 'i' } },
                ]
            }).select(PUBLIC_DOCTOR_EXCLUDE);
        } else {
            doctor = await Doctor.find({ isApproved: 'approved', deletedAt: null }).select(PUBLIC_DOCTOR_EXCLUDE);
        }

        return { data: doctor, message: 'successful' };
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        return { error, message: error.message, data: [] };
    }
}

/** Public profile, looked up by id or by slug (/doctors/:idOrSlug). */
export const getDoctorByIdService = async (idOrSlug: string): Promise<Partial<GetDoctorServiceResult>> => {

    try {
        // Unverified doctors' profiles aren't public.
        const filter = { isApproved: 'approved', deletedAt: null, ...(isObjectIdString(idOrSlug) ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() }) }
        const doctor = await Doctor.findOne(filter).populate('reviews').select(PUBLIC_DOCTOR_EXCLUDE)

        if (!doctor) throw new Error('doctor not found')

        return { data: doctor, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, { stack: error.stack })
        return { error, message: error.message }
    }
}

export const updateDoctorService = async ({ id, userData }: { id: string, userData: Partial<DoctorSchemaInterface> }): Promise<Partial<GetDoctorServiceResult>> => {


    // Only profile fields a doctor may edit; never role, email, password, approval or rating.
    const parseList = (value: unknown) => (typeof value === 'string' ? JSON.parse(value || '[]') : value);
    const allowedFields: Record<string, unknown> = _.pick(userData, [
        'name', 'phone', 'gender', 'photo', 'specialization', 'bio', 'about', 'ticketPrice',
    ]);
    for (const key of ['qualifications', 'experiences', 'timeSlots'] as const) {
        if (userData[key] !== undefined) allowedFields[key] = parseList(userData[key]);
    }

    try {
        // Keep the profile URL in step with the name and specialty.
        if (allowedFields.name !== undefined || allowedFields.specialization !== undefined) {
            const current = await Doctor.findById(id, { name: 1, specialization: 1 }).lean<{ name: string, specialization?: string }>()
            if (current) {
                allowedFields.slug = await uniqueDoctorSlug(
                    Doctor,
                    String(allowedFields.name ?? current.name),
                    (allowedFields.specialization ?? current.specialization) as string | undefined,
                    id,
                )
            }
        }

        const updatedDoctor = await Doctor.findByIdAndUpdate(id, allowedFields, { new: true, runValidators: true }).select(['-password', '-__v', '-refreshedToken'])

        if (!updatedDoctor) throw new Error("doctor not found")

        return { data: updatedDoctor, message: 'doctor updated successfully' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

export const deleteDoctorService = async (id: string): Promise<Partial<GetDoctorServiceResult>> => {
    try {
        const deleteDoctor = await Doctor.findByIdAndDelete(id)

        if (!deleteDoctor) throw new Error('doctor not found')

        return { message: 'doctor successfully deleted' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

export const getDoctorProfileService = async (doctorId: string) => {
    try {
        const doctor = await Doctor.findById(doctorId).select(['-password', '-__v', '-refreshedToken']).populate({
            path: 'appointments',
            populate: [
                { path: 'doctor', select: 'name photo specialization averageRating status timeSlots' },
                // The doctor's own patients: contact + health summary for care.
                { path: 'user', select: 'name email photo phone gender bloodType genotype dateOfBirth heightCm weightKg allergies chronicConditions medications' },
            ]
        }).populate({ path: 'reviews', options: { sort: { createdAt: -1 } } });

        if (!doctor) throw new Error('doctor not found')
        return { data: doctor, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

/** Doctor confirms or declines one of their own bookings. */
export const updateBookingStatusService = async (doctorId: string, bookingId: string, status: 'approved' | 'cancelled') => {
    try {
        if (!mongoose.isValidObjectId(bookingId)) throw new Error('booking not found')

        const booking = await Booking.findOneAndUpdate(
            { _id: bookingId, doctor: doctorId },
            { status },
            { new: true, runValidators: true }
        ).populate([
            { path: 'doctor', select: 'name photo specialization averageRating status timeSlots' },
            { path: 'user', select: 'name email photo phone gender bloodType genotype dateOfBirth heightCm weightKg allergies chronicConditions medications' },
        ])

        if (!booking) throw new Error('booking not found')
        return { data: booking, message: status === 'approved' ? 'Appointment confirmed' : 'Appointment declined' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

/**
 * Gives every doctor without a slug one. Runs at startup; a no-op once all
 * doctors have slugs. Never throws: a failure here mustn't stop the server.
 */
export const ensureDoctorSlugs = async (): Promise<number> => {
    try {
        const missing = await Doctor.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] }, { name: 1, specialization: 1 })
        for (const doctor of missing) {
            const slug = await uniqueDoctorSlug(Doctor, doctor.name, doctor.specialization, doctor._id)
            await Doctor.updateOne({ _id: doctor._id }, { $set: { slug } })
        }
        if (missing.length) log(`Added profile slugs to ${missing.length} doctor(s)`)
        return missing.length
    }
    catch (error: any) {
        winston_logger.error(`ensureDoctorSlugs failed: ${error.message}`, { stack: error.stack })
        return 0
    }
}
