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
            statusCode: 401
        });
    } else if (err.message === 'jwt expired' || err.message === 'jwt malformed') {
        return appError({
            message: "Unauthorized. Access token expired.",
            statusCode: 401
        });
    } else if (err.message === 'Invalid email or password') {
        return appError({
            message: "Invalid email or password.",
            statusCode: 400
        });
    } else if (err.message === "Please click the reset link sent to your email") {
        return appError({
            message: err.message,
            statusCode: 200,
        });
    } else if (err.message === 'Refreshed token not found') {
        return appError({
            message: "Cannot verify user",
            statusCode: 403,
        });
    }
    console.error('Handled error:', err.message, 'error stack', err.stack);

    return appError({ message: err.message, statusCode: 500 });
};