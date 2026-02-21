import { Request, Response, NextFunction } from 'express';

const validateAvatar = (file?: Express.Multer.File) => {
    if (!file) {
        throw new Error("Profile image is required");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
        throw new Error("Invalid image type");
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        throw new Error("Image too large");
    }
};


export const validateImage = (req: Request, res: Response, next: NextFunction) => {

    try {

        validateAvatar(req.file);
        next()
    } catch (err: any) {
        console.log('validation error', err);
        res.status(400).json({
            message: err.message || "Validation failed",
        });
    }
};