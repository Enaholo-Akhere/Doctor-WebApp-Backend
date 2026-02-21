import { Request, Response } from "express";
import { loginServices, refreshedTokenService, registerService } from "Services/authService";
import { decodedData, UserSchemaInterface } from "types";
import { sendVerificationEmail } from "@utils/message/nodemailer";
import { verifyEmailService } from "Services/authService";


interface UserAuthInterface {
    message: string,
    error: any,
    data?: UserSchemaInterface
    token: string
    refreshedToken: string
}


export const register = async (req: Request<{}, {}, UserSchemaInterface>, res: Response) => {

    const body: UserSchemaInterface = req.body

    if (!req.file) {
        res.status(400).json({
            message: 'Profile image is required',
        });
    }
    const imageUrl = req.file?.path;       // Cloudinary URL
    const publicId = req?.file?.filename;

    const bodyWithImage = { ...body, photo: { imageUrl, publicId } };


    const result = await registerService(bodyWithImage) as Partial<UserAuthInterface>;
    if (!result) {
        res.status(500).json({ message: "Registration failed", status: false, data: {} });
    }

    const { data, message, error, token, refreshedToken } = result as unknown as { data: decodedData, message: string, error: any, token: string, refreshedToken: string };

    if (error) {
        res.status(500).json({ message, status: false, data: {} });
    }

    await sendVerificationEmail(data, token);

    res.status(200).json({ message, status: true, data: {} });
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

export const verifyEmail = async (req: Request, res: Response) => {
    const { id, token } = req.query;
    const { message, error } = await verifyEmailService(id, token)
    console.log('Verification result:', message);

    if (error) {
        res.status(500).json({ message: error.message })
    }
    res.status(200).json({ message })
}

export const refreshToken = async (req: Request, res: Response) => {
    const refreshedToken = req.cookies?.refreshedToken;

    if (!refreshedToken) {
        res.status(401).json({
            status: false,
            message: 'Refresh token not found',
            token: null
        });
    }

    const { token, error, message } = await refreshedTokenService(refreshedToken);

    if (error) {
        res.status(401).json({
            status: false,
            message,
            token: null
        });
    }

    res.status(200).json({
        status: true,
        token,
        message
    });
};