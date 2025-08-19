import Users from "models/UserSchema";
import Doctors from "models/DoctorSchema";
import { NextFunction, Request, Response } from "express";
import { winston_logger } from "@utils/logger";

export const restrict = (roles: string[]) => async (req: Request, res: Response, next: NextFunction) => {
    const { id } = res.locals.auth

    try {
        const [userData, doctorData] = await Promise.all([
            Users.findById(id),
            Doctors.findById(id)
        ])

        const data = userData || doctorData;

        const role = data?.toObject().role;
        if (!role || !roles.includes(role)) {
            throw new Error("Access denied: insufficient permissions");
        }

        next()
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        res.status(403).json({ message: error.message, status: 'failed' })
    }
}