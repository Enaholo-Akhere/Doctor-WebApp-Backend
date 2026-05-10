import { handleError } from "@utils/handledError";
import { NextFunction, Request, Response } from "express";
import { deleteDoctorService, getDoctorByIdService, getDoctorProfileService, getDoctorService, updateDoctorService } from "Services/doctorService";
import { DoctorSchemaInterface } from "types";
// import { UpdateDoctorInput } from "DTO_Validations/zod_schemas";


export const getAllDoctors = async (req: Request, res: Response, next: NextFunction) => {

    const { search }: { search?: string } = req.query;

    const { error, data, message } = await getDoctorService(search)

    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ status: true, message, data })
}

export const getDoctorById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    const { data, message, error } = await getDoctorByIdService(id)

    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}

export const updateDoctor = async (req: Request, res: Response, next: NextFunction) => {
    const body: DoctorSchemaInterface = req.body
    const { id } = req.params;
    const { photo } = res.locals;


    let userData: Partial<DoctorSchemaInterface> = {}

    if (req.file) {
        userData = { ...body, photo: { imageUrl: req.file?.path, publicId: req?.file?.filename } }

    }

    if (!req.file) {
        userData = { ...body, photo }
    }

    const { data, message, error } = await updateDoctorService({ id, userData })

    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}

export const deleteDoctor = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    if (!id) res.status(404).json({ message: 'user ID not found', status: false })
    const { message, error } = await deleteDoctorService(id)

    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true })

}

export const getDoctorProfile = async (req: Request, res: Response, next: NextFunction) => {
    const doctorId = res.locals.auth.id

    const { data, message, error, appointments } = await getDoctorProfileService(doctorId)
    if (error) {
        console.log('error', error)
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true, data, appointments })
}




