import { verifyToken } from "@utils/generateTokens";
import { handleError } from "@utils/handledError";
import { winston_logger } from "@utils/logger";
import { NextFunction, Request, Response } from "express";
import { decodedDataInterface } from "types";
import { AUDIENCE } from "config/constant";
import User from "models/UserSchema";
import Doctor from "models/DoctorSchema";
import jwt from 'jsonwebtoken';


export const sanitizedUser = async (req: Request, res: Response, next: NextFunction) => {

    try {

        const authHeader = req.get('authorization');
        if (!authHeader) throw new Error('token not found');

        if (req.method === 'OPTIONS') {
            return next();
        }

        const token = authHeader.split(' ')[1];

        const unVerified = jwt.decode(token, { complete: true });

        if (!unVerified) {
            throw new Error('Invalid token');
        }

        const { sub, aud } = unVerified.payload as jwt.JwtPayload;

        const validAudiences = Object.values(AUDIENCE);

        if (!validAudiences.includes(aud)) {
            throw new Error('Invalid token audience');
        }

        const { decoded, expired, message } = verifyToken(token, aud as string);

        if (message.includes('jwt audience invalid')) {
            throw new Error('Invalid token')
        }

        if (!decoded || expired) {
            throw new Error(message ?? 'access token expired');
        }

        res.locals.auth = { id: sub, audience: aud as string };
        next();
    } catch (error: any) {
        winston_logger.error(error.message, error.stack);
        next(handleError(error));
    }
};

