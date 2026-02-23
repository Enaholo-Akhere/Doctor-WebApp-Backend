// middlewares/validateImage.ts
import { Request, Response, NextFunction } from "express";
import { validateAvatarFile } from "@utils/validateAvatarFile";

export const validateImage = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const photo =
            typeof req.body.photo === "string"
                ? JSON.parse(req.body.photo)
                : req.body.photo;

        if (
            photo?.imageUrl &&
            photo.imageUrl.startsWith("https://res.cloudinary.com")
        ) {
            res.locals.photo = photo;
            return next();
        }

        // fallback to uploaded file
        validateAvatarFile(req.file);

        next();
    } catch (err) {
        next(err); //
    }
};