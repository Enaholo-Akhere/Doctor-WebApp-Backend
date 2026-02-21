// middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Credentials", "true");
    // MongoDB Atlas connection error
    if (
        err.name === "MongoServerSelectionError" ||
        err.message === "DB_CONNECTION_FAILED"
    ) {
        res.status(503).json({
            success: false,
            message: "Service temporarily unavailable. Please try again later.",
        });
    }

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal server error",
    });
};