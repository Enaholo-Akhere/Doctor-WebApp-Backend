import { log } from "@utils/logger";
import { Request, Response } from "express";
import { deleteDoctorService, getDoctorByIdService, getDoctorService, updateDoctorService } from "Services/doctorService";
import { DoctorSchemaInterface } from "types";


export const getAllDoctors = async (req: Request, res: Response) => {

    const query = req.query;
    const { name, specialization } = query as { name: string, specialization: string }

    const { token, refreshedToken } = res.locals.auth

    const { error, data, message } = await getDoctorService({ name, specialization })

    if (error) res.status(404).json({ status: false, data: {}, message })

    const MAX_AGE = Number(process.env.MAX_AGE)
    res.cookie('refreshedToken', refreshedToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: MAX_AGE
    })
    res.status(200).json({ status: true, message, data, token })


}

export const getDoctorById = async (req: Request, res: Response) => {
    const { id } = req.params

    const { token, refreshedToken } = res.locals.auth

    const { data, message, error } = await getDoctorByIdService(id)

    if (error) res.status(500).json({ message, status: false, data: {} })

    const MAX_AGE = Number(process.env.MAX_AGE)
    res.cookie('refreshedToken', refreshedToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: MAX_AGE
    })

    res.status(200).json({ message, status: true, data, token })
}

export const updateDoctor = async (req: Request, res: Response) => {
    const body: DoctorSchemaInterface = req.body
    const { id } = req.params
    const { token, refreshedToken } = res.locals.auth

    const { data, message, error } = await updateDoctorService({ id, body })

    if (error) res.status(500).json({ data: {}, message, status: false })

    const MAX_AGE = Number(process.env.MAX_AGE)
    res.cookie('refreshedToken', refreshedToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: MAX_AGE
    })

    res.status(200).json({ message, status: true, data, token })
}

export const deleteDoctor = async (req: Request, res: Response) => {
    const { id } = req.params

    if (!id) res.status(404).json({ message: 'user ID not found', status: false })
    const { message, error } = await deleteDoctorService(id)

    if (error) res.status(500).json({ message, status: false })

    res.cookie('refreshedToken', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1000 * 0
    })

    res.status(200).json({ message, status: true, token: '' })

}



