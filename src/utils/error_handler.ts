import { winston_exceptions, winston_logger } from "./logger";

const uncaughtException = () => {
    process.on('uncaughtException', (error: Error) => {
        winston_logger.error('Uncaught Exception found: ', error);
        winston_exceptions.error(error.message, error.stack);
        process.exit(1);
    });

    process.on('unhandledRejection', (error: Error) => {
        winston_logger.error('Unhandled Rejection found: ', error);
        winston_exceptions.error(error.message, error.stack);
        process.exit(1);
    });
}

export default uncaughtException;