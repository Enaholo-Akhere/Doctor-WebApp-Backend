// middlewares/validateAvatar.ts
import { validateAvatarFile } from "@utils/validateAvatarFile";
import { Request, Response, NextFunction } from "express";

export const validateAvatar = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateAvatarFile(req.file);
        next();
    } catch (err) {
        next(err); // ✅ forward ONLY
    }
};