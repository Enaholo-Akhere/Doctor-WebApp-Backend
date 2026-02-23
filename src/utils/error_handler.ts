import { winston_exceptions, winston_logger } from "./logger";

const uncaughtException = () => {
    process.on('uncaughtException', (error: Error) => {
        winston_logger.error('Uncaught Exception found: ', error);
        winston_exceptions.error(error.message, error.stack);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason: Error, promise) => {
        winston_logger.error('Unhandled Rejection found: ', reason);
        winston_exceptions.error(reason.message, reason.stack);
        process.exit(1);
    });
}

export default uncaughtException;