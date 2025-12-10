import { verifyToken } from "@utils/generateTokens";
import { log, winston_logger } from "@utils/logger";
import { NextFunction, Request, Response } from "express";
import { generateAccessToken } from "@utils/generateTokens";
import jwt from "jsonwebtoken";

interface decodedDataInterface {
    name: string;
    email: string;
    id: string;
}
export const sanitizedUser = async (req: Request, res: Response, next: NextFunction) => {
    const userToken = req.get('authorization')?.split(' ')[1];
    const userRefreshedToken = req.cookies.refreshedToken

    try {
        if (!userToken?.length) throw new Error('token not found')
        if (!userRefreshedToken) throw new Error('refreshed token not found')

        const { decoded, message, expired } = verifyToken(userToken as string)
        const { decoded: refDecoded, message: refMessage, expired: refExpired } = verifyToken(userRefreshedToken as string)


        if (message === 'jwt expired' || message === 'jwt malformed' && !refExpired) {

            const { name, email, id } = refDecoded as decodedDataInterface
            const { token: newToken, error } = generateAccessToken({ user: { name, email, id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions })
            const { token: newRefreshedToken, error: refError } = generateAccessToken({ user: { name, email, id }, options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions })

            res.locals.auth = { token: newToken, refreshedToken: newRefreshedToken, id }
            next()
        }

        if (!expired && !refExpired) {
            const { id } = decoded as decodedDataInterface
            res.locals.auth = { token: userToken, refreshedToken: userRefreshedToken, id }
            next()
        }

        if (expired && refExpired) {

            res.locals.auth = { token: '', refreshedToken: '' }

            throw new Error('session expired, please re-login')
        }

        if (message === 'jwt malformed' && refMessage === 'jwt expired') {

            throw new Error(refMessage)
        }

    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        res.status(400).json({ status: false, message: error.message });
        return
    }
}   