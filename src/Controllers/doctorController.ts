import { log } from "@utils/logger";
import { Request, Response } from "express";
import { deleteDoctorService, getDoctorByIdService, getDoctorProfileService, getDoctorService, updateDoctorService } from "Services/doctorService";
import { DoctorSchemaInterface } from "types";


export const getAllDoctors = async (req: Request, res: Response) => {

    const query = req.query;
    const { name, specialization } = query as { name: string, specialization: string }

    const { error, data, message } = await getDoctorService({ name, specialization })

    if (error) res.status(404).json({ status: false, data: {}, message })


    res.status(200).json({ status: true, message, data })


}

export const getDoctorById = async (req: Request, res: Response) => {
    const { id } = req.params

    const { token, refreshedToken } = res.locals.auth

    const { data, message, error } = await getDoctorByIdService(id)

    if (error) res.status(500).json({ message, status: false, data: {} })

    res.status(200).json({ message, status: true, data })
}

export const updateDoctor = async (req: Request, res: Response) => {
    const body: DoctorSchemaInterface = req.body
    const { id } = req.params;

    const { data, message, error } = await updateDoctorService({ id, body })

    if (error) res.status(500).json({ data: {}, message, status: false })

    res.status(200).json({ message, status: true, data })
}

export const deleteDoctor = async (req: Request, res: Response) => {
    const { id } = req.params

    if (!id) res.status(404).json({ message: 'user ID not found', status: false })
    const { message, error } = await deleteDoctorService(id)

    if (error) res.status(500).json({ message, status: false })


    res.status(200).json({ message, status: true })

}

export const getDoctorProfile = async (req: Request, res: Response) => {
    const doctorId = res.locals.auth.id
    console.log('doctorId', doctorId)

    const { data, message, error, appointments } = await getDoctorProfileService(doctorId)
    if (error) res.status(500).json({ message, status: false, data: {} })

    res.status(200).json({ message, status: true, data, appointments })
}




