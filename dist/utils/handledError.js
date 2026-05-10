"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = void 0;
var appError_1 = require("./appError");
var handleError = function (err) {
    var _a, _b, _c;
    if (err.name === "MongoNetworkError" ||
        err.name === "MongoServerSelectionError" ||
        ((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes("ECONNREFUSED")) ||
        ((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes("ETIMEDOUT")) ||
        ((_c = err.message) === null || _c === void 0 ? void 0 : _c.includes("ENOTFOUND"))) {
        return (0, appError_1.appError)({
            message: "Network error, please try again shortly.",
            statusCode: 503,
            extras: { originalError: err }
        });
    }
    else if (err.message === 'token not found') {
        return (0, appError_1.appError)({
            message: "Unauthorized. Token not found.",
            statusCode: 403
        });
    }
    else if (err.message === 'jwt expired' || err.message === 'jwt malformed') {
        return (0, appError_1.appError)({
            message: "Unauthorized. Access token expired.",
            statusCode: 401
        });
    }
    console.error('Unhandled error:', err.message);
    return (0, appError_1.appError)({ message: err.message, statusCode: 500 });
};
exports.handleError = handleError;
//# sourceMappingURL=handledError.js.map