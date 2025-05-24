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
        res.status(400).json({ message: error.errors[0].message, status: false, data: {} });
    }
}
export default validate;