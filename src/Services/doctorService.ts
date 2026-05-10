import { log, winston_logger } from "@utils/logger"
import _ from "lodash"
import Doctor from "models/DoctorSchema"
import { DoctorSchemaInterface } from "types"
import Booking from "models/BookingSchema"
import escapeStringRegexp from "escape-string-regexp"
import path from "path"


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
            doctor = await Doctor.find({
                isApproved: 'pending',
                $or: [
                    { name: { $regex: escapedName, $options: 'i' } },
                    { specialization: { $regex: escapedSpec, $options: 'i' } },
                ]
            }).select(['-password', '-__v']);
        } else {
            doctor = await Doctor.find().select(['-password', '-__v']);
        }

        if (!doctor.length) throw new Error('doctor not found');

        return { data: doctor, message: 'successful' };
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        console.log('error message', error.message);
        return { error, message: error.message, data: [] };
    }
}

export const getDoctorByIdService = async (id: string): Promise<Partial<GetDoctorServiceResult>> => {

    try {

        const doctor = await Doctor.findById(id).populate('reviews').select(['-password', '-__v'])

        if (!doctor) throw new Error('doctor not found')

        return { data: doctor, message: 'successful' }
    }
    catch (error: any) {
        winston_logger.error(error.message, { stack: error.stack })
        return { error, message: error.message }
    }
}

export const updateDoctorService = async ({ id, userData }: { id: string, userData: Partial<DoctorSchemaInterface> }): Promise<Partial<GetDoctorServiceResult>> => {


    const allowedFields = {
        ...userData,
        qualifications: JSON.parse(userData.qualifications as any || '[]'),
        experiences: JSON.parse(userData.experiences as any || '[]'),
        timeSlots: JSON.parse(userData.timeSlots as any || '[]'),
    }


    try {

        const updatedDoctor = await Doctor.findByIdAndUpdate(id, allowedFields, { new: true, runValidators: true }).select(['-password', '-__v'])

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
        const doctor = await Doctor.findById(doctorId).select(['-password', '-__v']);
        const appointments = await Booking.find({ doctor: doctorId })

        if (!doctor) throw new Error('doctor not found')
        return { data: doctor, message: 'successful', appointments }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}