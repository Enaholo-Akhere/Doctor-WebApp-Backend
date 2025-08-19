import { Request, Response } from "express";
import { loginServices, registerService } from "Services/authService";
import { UserSchemaInterface } from "types";


interface UserAuthInterface {
    message: string,
    error: any,
    data?: UserSchemaInterface
    token: string
    refreshedToken: string
}


export const register = async (req: Request<{}, {}, UserSchemaInterface>, res: Response) => {

    const body: UserSchemaInterface = req.body

    // if (!body) {
    //     res.status(400).json({ message: "Please provide all fields", status: false, data: {} });
    // }

    const result = await registerService(body) as Partial<UserAuthInterface>;
    if (!result) {
        res.status(500).json({ message: "Registration failed", status: false, data: {} });
    }
    const { data, message, error, token, refreshedToken } = result;


    if (error) {
        res.status(500).json({ message, status: false, data: {} });
    }

    if (data) {
        const MAX_AGE = Number(process.env.MAX_AGE)
        res.cookie('refreshedToken', refreshedToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: MAX_AGE
        })
        res.status(200).json({ message, status: true, data, token });
    }

}

export const login = async (req: Request, res: Response) => {
    const body: UserSchemaInterface = req.body

    if (!body) res.status(400).json({ message: 'Please input all fields', status: false, data: {} })

    const { data, error, message, token, refreshedToken } = await loginServices(body)

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