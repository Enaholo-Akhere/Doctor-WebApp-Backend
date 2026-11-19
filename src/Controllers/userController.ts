import { NextFunction, Request, Response } from "express";
import { updateHealthProfileService, deleteUserService, getMyAppointmentsService, getUserByIdService, getUserProfileService, getUserService, updateUserService } from "Services/userService";
import { UserSchemaInterface } from "types";
import { handleError } from "@utils/handledError";


export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {

    const { error, data, message } = await getUserService()

    if (error) {
        next(handleError(error))
        return
    }

    res.status(200).json({ status: true, message, data })


}

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    const { data, message, error } = await getUserByIdService(id)

    if (error) {
        next(handleError(error))
        return
    }

    res.status(200).json({ message, status: true, data })
}

/** Patients may only touch their own record. 404 (not 403) so the frontend doesn't treat it as a dead session. */
const isOwner = (req: Request, res: Response) => String(res.locals.auth?.id) === String(req.params.id)

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const body: UserSchemaInterface = req.body
    const { id } = req.params

    if (!isOwner(req, res)) {
        res.status(404).json({ message: 'user not found', status: false })
        return
    }
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
        return
    }

    res.status(200).json({ message, status: true, data })
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    if (!id || !isOwner(req, res)) {
        res.status(404).json({ message: 'user not found', status: false })
        return
    }
    const { message, error } = await deleteUserService(id)

    if (error) {
        next(handleError(error))
        return
    }

    res.status(200).json({ message, status: true })

}

export const getMyAppointments = async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.auth.id


    const { data, message, error } = await getMyAppointmentsService(userId);

    if (error) {
        next(handleError(error))
        return
    }

    res.status(200).json({ message, status: true, data })
}


export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.auth.id

    const { data, message, error } = await getUserProfileService(userId);

    if (error) {
        next(handleError(error))
        return
    }

    res.status(200).json({ message, status: true, data })
}



export const updateMyHealthProfile = async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.auth.id

    const { data, message, error } = await updateHealthProfileService(userId, req.body)

    if (error) {
        next(handleError(error))
        return
    }

    res.status(200).json({ message, status: true, data })
}

export const deleteMyAccount = async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.auth.id

    const { message, error } = await deleteUserService(userId)

    if (error) {
        next(handleError(error))
        return
    }

    res.clearCookie('refreshedToken', { httpOnly: true, secure: true, sameSite: 'strict' })
    res.status(200).json({ message, status: true })
}
