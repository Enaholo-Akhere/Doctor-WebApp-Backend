import { NextFunction, Request, Response } from "express";
import { deleteAccount, forgotPasswordService, loginServices, logoutService, refreshedTokenService, registerService, resendVerificationService, setPasswordService } from "Services/authService";
import { decodedData, UserSchemaInterface } from "types";
import { sendResetPasswordEmail, sendResetPasswordSuccessfulEmail, sendVerificationEmail } from "@utils/message/nodemailer";
import { verifyEmailService } from "Services/authService";
import { handleError } from "@utils/handledError";
import jwt from 'jsonwebtoken';


interface UserAuthInterface {
    message: string,
    error: any,
    data?: UserSchemaInterface
    token: string
    refreshedToken: string
}


export const register = async (req: Request<{}, {}, UserSchemaInterface>, res: Response) => {

    const body: UserSchemaInterface = req.body

    // validateImage accepts either an uploaded file or an existing Cloudinary photo.
    const photo = req.file
        ? { imageUrl: req.file.path, publicId: req.file.filename }
        : res.locals.photo;

    if (!photo?.imageUrl) {
        res.status(400).json({ message: 'Profile image is required', status: false, data: {} });
        return;
    }

    const result = await registerService({ ...body, photo });

    const { data, error, token } = result as unknown as { data: decodedData, error: any, token: string };

    if (error) {
        res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Registration failed. Please try again.', status: false, data: {} });
        return;
    }

    const { error: mailError } = await sendVerificationEmail(data, token);

    if (mailError) {
        // Without the email the account can never be verified, so undo it and let them retry.
        await deleteAccount(String(data._id));
        res.status(502).json({ message: "We couldn't send your verification email. Please try again in a moment.", status: false, data: {} });
        return;
    }

    res.status(201).json({ message: `Account created. We sent a verification link to ${data.email}.`, status: true, data: { email: data.email } });
}

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    const { message, error } = await resendVerificationService(req.body.email);

    if (error) {
        next(error.statusCode ? error : handleError(error));
        return;
    }
    res.status(200).json({ message, status: true });
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
    const body: UserSchemaInterface = req.body

    if (!body) {
        res.status(400).json({ message: 'Please input all fields', status: false, data: {} })
        return;
    }

    const { data, error, message, token, refreshedToken } = await loginServices(body)

    if (error) {
        next(handleError(error));
        return;
    }
    const MAX_AGE = Number(process.env.MAX_AGE);

    if (data) {
        res.cookie('refreshedToken', refreshedToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: MAX_AGE
        })

        res.status(200).json({ message, status: true, data, token });
        return
    }



}

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { id, token } = req.query;

    const { message, error } = await verifyEmailService(id, token);

    if (error) {
        next(error.statusCode ? error : handleError(error))
        return;
    }
    res.status(200).json({ message, status: true })
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = res.locals.auth;

    if (!id) {
        res.status(400).json({ message: 'User ID not found', status: false });
        return;
    }

    const { error, message, } = await logoutService(id);

    if (error) {
        next(handleError(error));
        return;
    }
    res.clearCookie('refreshedToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
    });

    res.status(200).json({ message, status: true });
}

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    const refreshedToken = req.cookies?.refreshedToken;

    if (!refreshedToken) {
        res.status(403).json({
            status: false,
            message: 'Refresh token not found',
            token: null
        });
        return;
    }

    const unVerified = jwt.decode(refreshedToken, { complete: true });

    if (!unVerified) {
        res.status(403).json({ status: false, message: 'Invalid token', token: null });
        return;
    }

    const { sub } = unVerified.payload as jwt.JwtPayload;

    if (!sub || typeof sub !== 'string') {
        res.status(403).json({ status: false, message: 'Invalid token subject', token: null });
        return;
    }

    const { token, error, message } = await refreshedTokenService(refreshedToken, sub);

    if (error) {
        next(handleError(error))
        return;
    }
    res.status(200).json({
        status: true,
        token,
        message
    });
    return;
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const { message, error, token, id } = await forgotPasswordService(email) as unknown as { message: string, error: any, token: string, id: string };

    if (error) {
        next(handleError(error))
        return;
    };

    await sendResetPasswordEmail({ email, token, id });

    res.status(200).json({ message, status: true });
    return;

}

export const setPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { password } = req.body;
    const { token, id } = req.query as { token: string, id: string };
    const { message, error, data } = await setPasswordService(password, id, token);

    if (error) {
        next(handleError(error))
        return;
    };

    if (data) {
        await sendResetPasswordSuccessfulEmail({ email: data.email, name: data?.toObject().name });
        res.status(200).json({ message, status: true });
        return;
    }

}