// middlewares/multerErrorHandler.ts
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { appError } from "@utils/appError";

export const multerErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof multer.MulterError) {
        return next(
            appError({
                message: err.message,
                statusCode: 400,
            })
        );
    }

    next(err);
};