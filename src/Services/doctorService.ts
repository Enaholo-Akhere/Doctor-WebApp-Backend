import { log, winston_logger } from "@utils/logger"
import _ from "lodash"
import Doctor from "models/DoctorSchema"
import { DoctorSchemaInterface } from "types"



interface GetDoctorServiceResult {
    data: DoctorSchemaInterface[] | DoctorSchemaInterface;
    message: string;
    error?: any;
}

interface GetDoctorById { id: string, body: DoctorSchemaInterface }

export const getDoctorService = async ({ name, specialization }: { name: string, specialization: string }): Promise<Partial<GetDoctorServiceResult>> => {
    log(`Queries, ${specialization} ${name}`)
    try {
        let doctor: DoctorSchemaInterface[];

        if (name || specialization) {
            doctor = await Doctor.find({
                isApproved: 'pending',
                $or: [
                    { name: { $regex: name, $options: 'i' } },
                    { specialization: { $regex: specialization, $options: 'i' } },
                ]
            });
        } else {
            doctor = await Doctor.find().select(['-password', '-__v']);
        }

        if (!doctor.length) throw new Error('cannot get doctors');

        return { data: doctor, message: 'successful' };
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
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

export const updateDoctorService = async ({ id, body }: GetDoctorById): Promise<Partial<GetDoctorServiceResult>> => {

    try {


        const updatedDoctor = await Doctor.findByIdAndUpdate(id, body, { new: true, runValidators: true }).select(['-password', '-__v'])

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
        return { error }
    }
}