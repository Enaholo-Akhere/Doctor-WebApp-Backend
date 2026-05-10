"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAvatarFile = void 0;
// utils/validateAvatarFile.ts
var appError_1 = require("@utils/appError");
var validateAvatarFile = function (file) {
    if (!file) {
        throw (0, appError_1.appError)({
            message: "Profile image is required",
            statusCode: 400,
        });
    }
    var allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
        throw (0, appError_1.appError)({
            message: "Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.",
            statusCode: 400,
        });
    }
    var maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        throw (0, appError_1.appError)({
            message: "Image too large. Maximum size is 2MB.",
            statusCode: 400,
        });
    }
};
exports.validateAvatarFile = validateAvatarFile;
//# sourceMappingURL=validateUserFile.js.map