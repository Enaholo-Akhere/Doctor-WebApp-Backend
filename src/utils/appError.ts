interface AppError {
    message: string;
    statusCode: number;
    extras?: Record<string, any>;
}
export const appError = (
    { message,
        statusCode,
        extras }: AppError) => {
    const error: any = new Error(message);

    error.statusCode = statusCode;
    error.isOperational = true;

    if (extras) {
        Object.assign(error, extras);
    }
    Error.captureStackTrace(error, appError);

    return error;
};