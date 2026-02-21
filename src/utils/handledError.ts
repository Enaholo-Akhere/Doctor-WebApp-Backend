// utils/handleDbError.ts
import { appError } from "./appError";

export const handleDbError = (err: any) => {
    console.log('error from HandledError', err)
    if (
        err.name === "MongoNetworkError" ||
        err.name === "MongoServerSelectionError" ||
        err.message?.includes("ECONNREFUSED") ||
        err.message?.includes("ETIMEDOUT") ||
        err.message?.includes("ENOTFOUND")
    ) {
        return appError({
            message: "Network error, Please try again shortly.",
            statusCode: 503,
            extras: { originalError: err } // optional, for logs
        });
    } else if (err.message === 'token not found') {
        return appError({
            message: "Unauthorized. Token not found.",
            statusCode: 403
        });
    }
    return appError({ message: "Something went wrong. Please try again.", statusCode: 500 });
};