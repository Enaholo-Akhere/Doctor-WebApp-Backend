"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerErrorHandler = void 0;
var multer_1 = __importDefault(require("multer"));
var appError_1 = require("@utils/appError");
var multerErrorHandler = function (err, req, res, next) {
    if (err instanceof multer_1.default.MulterError) {
        return next((0, appError_1.appError)({
            message: err.message,
            statusCode: 400,
        }));
    }
    next(err);
};
exports.multerErrorHandler = multerErrorHandler;
//# sourceMappingURL=multerErrorHandler.js.map