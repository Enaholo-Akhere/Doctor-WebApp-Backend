"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizedUser = void 0;
var generateTokens_1 = require("@utils/generateTokens");
var handledError_1 = require("@utils/handledError");
var logger_1 = require("@utils/logger");
var sanitizedUser = function (req, res, next) {
    try {
        var authHeader = req.get('authorization');
        if (!authHeader)
            throw new Error('token not found');
        if (req.method === 'OPTIONS') {
            return next();
        }
        var token = authHeader.split(' ')[1];
        var _a = (0, generateTokens_1.verifyToken)(token), decoded = _a.decoded, expired = _a.expired, message = _a.message;
        if (!decoded || expired) {
            throw new Error(message !== null && message !== void 0 ? message : 'access token expired');
        }
        var id = decoded.id;
        res.locals.auth = { id: id };
        next();
    }
    catch (error) {
        logger_1.winston_logger.error(error.message, error.stack);
        next((0, handledError_1.handleError)(error));
    }
};
exports.sanitizedUser = sanitizedUser;
//# sourceMappingURL=sanitizedUser.js.map