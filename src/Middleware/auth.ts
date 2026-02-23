import Users from "models/UserSchema";
import Doctors from "models/DoctorSchema";
import { NextFunction, Request, Response } from "express";
import { winston_logger } from "@utils/logger";
import { handleError } from "@utils/handledError";

export const restrict = (roles: string[]) => async (req: Request, res: Response, next: NextFunction) => {
    const { id } = res.locals.auth;

    try {
        const [userData, doctorData] = await Promise.all([
            Users.findById(id),
            Doctors.findById(id)
        ])

        const data = userData || doctorData;

        const role = data?.toObject().role;
        if (!role || !roles.includes(role)) {
            throw new Error("Access denied: insufficient permission");
        }

        next()
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        next(handleError(error))
    }
}