import { verifyToken } from "@utils/generateTokens";
import { handleError } from "@utils/handledError";
import { winston_logger } from "@utils/logger";
import { NextFunction, Request, Response } from "express";
import { decodedDataInterface } from "types";



export const sanitizedUser = (req: Request, res: Response, next: NextFunction) => {

    try {
        const authHeader = req.get('authorization');
        if (!authHeader) throw new Error('token not found');

        if (req.method === 'OPTIONS') {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const { decoded, expired, message } = verifyToken(token);

        if (!decoded || expired) {
            throw new Error(message ?? 'access token expired');
        }

        const { id } = decoded as decodedDataInterface;
        res.locals.auth = { id };
        next();
    } catch (error: any) {
        winston_logger.error(error.message, error.stack);
        next(handleError(error))
    }
};
