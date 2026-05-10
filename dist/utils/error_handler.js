"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logger_1 = require("./logger");
var uncaughtException = function () {
    process.on('uncaughtException', function (error) {
        logger_1.winston_logger.error('Uncaught Exception found: ', error);
        logger_1.winston_exceptions.error(error.message, error.stack);
        process.exit(1);
    });
    process.on('unhandledRejection', function (reason, promise) {
        logger_1.winston_logger.error('Unhandled Rejection found: ', reason);
        logger_1.winston_exceptions.error(reason.message, reason.stack);
        process.exit(1);
    });
};
exports.default = uncaughtException;
//# sourceMappingURL=error_handler.js.map