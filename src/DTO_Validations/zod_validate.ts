import { appError } from "@utils/appError";
import { Response, Request, NextFunction } from "express";
import { AnyZodObject } from "zod";

const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
        })
        next();
    }
    catch (error: any) {
        next(appError({
            message: error.errors?.[0]?.message || "Validation failed",
            statusCode: 400,
        }))
    }
}
export default validate;