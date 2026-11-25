import { appError } from "./appError";

// Token failures that aren't expiry: answer 401 rather than falling through to a 500.
const INVALID_TOKEN_MESSAGES = new Set([
    'Invalid token',
    'invalid token',
    'invalid signature',
    'jwt signature is required',
    'jwt must be provided',
    'invalid algorithm',
    'refresh token invalid',
]);

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
    } else if (err.message === 'This account has been deactivated') {
        return appError({
            message: "This account has been deactivated. Contact support if you think this is a mistake.",
            statusCode: 401,
        });
    } else if (INVALID_TOKEN_MESSAGES.has(err.message)) {
        return appError({
            message: "Unauthorized. Invalid token.",
            statusCode: 401
        });
    } else if (err.message === 'Please verify your email to login') {
        return appError({
            message: "Please verify your email to log in. Check your inbox for the link, or request a new one.",
            statusCode: 403,
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