import { NextFunction, Request, Response } from "express";
import { deleteUserService, getMyAppointmentsService, getUserByIdService, getUserProfileService, getUserService, updateUserService } from "Services/userService";
import { UserSchemaInterface } from "types";
import { handleError } from "@utils/handledError";


export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {

    const { error, data, message } = await getUserService()

    if (error) {
        next(handleError(error))
    }

    res.status(200).json({ status: true, message, data })


}

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    const { data, message, error } = await getUserByIdService(id)

    if (error) {
        next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const body: UserSchemaInterface = req.body
    const { id } = req.params
    const { photo } = res.locals;

    let userData: Partial<UserSchemaInterface> = {}

    if (req.file) {
        userData = { ...body, photo: { imageUrl: req.file?.path, publicId: req?.file?.filename } }

    }

    if (!req.file) {
        userData = { ...body, photo }
    }

    const { data, message, error } = await updateUserService({ id, body: userData as UserSchemaInterface })

    if (error) {
        next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    if (!id) res.status(404).json({ message: 'user ID not found', status: false })
    const { message, error } = await deleteUserService(id)

    if (error) {
        next(handleError(error))
    }

    res.status(200).json({ message, status: true })

}

export const getMyAppointments = async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.auth.id


    const { data, message, error } = await getMyAppointmentsService(userId);

    if (error) {
        next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}


export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.auth.id

    const { data, message, error } = await getUserProfileService(userId);

    if (error) {
        next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}

