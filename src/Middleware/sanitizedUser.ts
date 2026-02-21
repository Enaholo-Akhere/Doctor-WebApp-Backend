import { verifyToken } from "@utils/generateTokens";
import { handleDbError } from "@utils/handledError";
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
            console.log('Token verification failed:', message);
            throw new Error(message ?? 'access token expired');
        }

        const { id } = decoded as decodedDataInterface;
        res.locals.auth = { id };
        next();
    } catch (error: any) {
        winston_logger.error(error.message, error.stack);
        next(handleDbError(error))
        // res.status(401).json({
        //     status: false,
        //     message: error.message,
        // });
    }
};
