import { log } from "@utils/logger";
import { NextFunction, Request, Response } from "express";
import { deleteUserService, getMyAppointmentsService, getUserByIdService, getUserProfileService, getUserService, updateUserService } from "Services/userService";
import { UserSchemaInterface } from "types";
import { handleDbError } from "@utils/handledError";


export const getAllUsers = async (req: Request, res: Response) => {


    const { error, data, message } = await getUserService()

    if (error) res.status(404).json({ status: false, data: {}, message })


    res.status(200).json({ status: true, message, data })


}

export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params

    const { data, message, error } = await getUserByIdService(id)

    if (error) res.status(500).json({ message, status: false, data: {} })

    res.status(200).json({ message, status: true, data })
}

export const updateUser = async (req: Request, res: Response) => {
    const body: UserSchemaInterface = req.body
    const { id } = req.params

    const { data, message, error } = await updateUserService({ id, body })

    if (error) res.status(500).json({ data: {}, message, status: false })


    res.status(200).json({ message, status: true, data })
}

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params

    if (!id) res.status(404).json({ message: 'user ID not found', status: false })
    const { message, error } = await deleteUserService(id)

    if (error) res.status(500).json({ message, status: false })

    res.status(200).json({ message, status: true })

}

export const getMyAppointments = async (req: Request, res: Response) => {
    const userId = res.locals.auth.id
    console.log('userId', userId)


    const { data, message, error } = await getMyAppointmentsService(userId)

    if (error) res.status(500).json({ message, status: false, data: {} })

    res.status(200).json({ message, status: true, data })
}


export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.auth.id

    const { data, message, error } = await getUserProfileService(userId);

    if (error) {
        console.log('error get my profile line 74', error)
        next(handleDbError(error))
    }

    // if (error) res.status(500).json({ message, status: false, data: {} })

    res.status(200).json({ message, status: true, data })
}

