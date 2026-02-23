import { appError } from "./appError";

export const handleError = (err: any) => {
    if (
        err.name === "MongoNetworkError" ||
        err.name === "MongoServerSelectionError" ||
        err.message?.includes("ECONNREFUSED") ||
        err.message?.includes("ETIMEDOUT") ||
        err.message?.includes("ENOTFOUND")
    ) {
        return appError({
            message: "Network error, please try again shortly.",
            statusCode: 503,
            extras: { originalError: err }
        });
    } else if (err.message === 'token not found') {
        return appError({
            message: "Unauthorized. Token not found.",
            statusCode: 403
        });
    } else if (err.message === 'jwt expired') {
        return appError({
            message: "Unauthorized. Access token expired.",
            statusCode: 401
        });
    }


    return appError({ message: err.message, statusCode: 500 });
};