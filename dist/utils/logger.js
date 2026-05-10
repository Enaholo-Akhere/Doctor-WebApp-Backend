"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.winston_exceptions = exports.winston_logger = exports.log = void 0;
var winston_1 = require("winston");
var log = function (message) {
    var newError = new globalThis.Error("".concat(message));
    console.log({ LOG: newError.message });
};
exports.log = log;
exports.winston_logger = (0, winston_1.createLogger)({
    transports: [
        new winston_1.transports.Console({
            level: "info",
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.colorize({ all: true }), winston_1.format.json()),
        }),
        new winston_1.transports.File({
            filename: 'info-logger.log',
            level: 'info',
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.colorize({ all: true }), winston_1.format.json()),
        })
    ]
});
exports.winston_exceptions = (0, winston_1.createLogger)({
    transports: [
        new winston_1.transports.File({
            level: 'info',
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.colorize({ all: true }), winston_1.format.json()),
            filename: 'uncaught-exception.log',
        })
    ]
});
//# sourceMappingURL=logger.js.map