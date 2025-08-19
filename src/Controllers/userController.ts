import { log } from "@utils/logger";
import { Request, Response } from "express";
import { deleteUserService, getUserByIdService, getUserService, updateUserService } from "Services/userService";
import { UserSchemaInterface } from "types";


export const getAllUsers = async (req: Request, res: Response) => {

    const { token, refreshedToken } = res.locals.auth

    const { error, data, message } = await getUserService()

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

export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params

    const { token, refreshedToken } = res.locals.auth

    const { data, message, error } = await getUserByIdService(id)

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

export const updateUser = async (req: Request, res: Response) => {
    const body: UserSchemaInterface = req.body
    const { id } = req.params
    const { token, refreshedToken } = res.locals.auth

    const { data, message, error } = await updateUserService({ id, body })

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

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params

    if (!id) res.status(404).json({ message: 'user ID not found', status: false })
    const { message, error } = await deleteUserService(id)

    if (error) res.status(500).json({ message, status: false })

    res.cookie('refreshedToken', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 1000 * 0
    })

    res.status(200).json({ message, status: true, token: '' })

}



