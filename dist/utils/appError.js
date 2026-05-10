"use strict";
// utils/appError.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.appError = void 0;
var appError = function (_a) {
    var message = _a.message, statusCode = _a.statusCode, extras = _a.extras;
    var error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    if (extras) {
        Object.assign(error, extras);
    }
    Error.captureStackTrace(error, exports.appError);
    return error;
};
exports.appError = appError;
//# sourceMappingURL=appError.js.map