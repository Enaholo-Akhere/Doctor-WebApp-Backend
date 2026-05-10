"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateImage = void 0;
var validateAvatar = function (file) {
    if (!file) {
        throw new Error("Profile image is required");
    }
    var allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
        throw new Error("Invalid image type");
    }
    var maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        throw new Error("Image too large");
    }
};
var validateImage = function (req, res, next) {
    try {
        validateAvatar(req.file);
        next();
    }
    catch (err) {
        console.log('validation error', err);
        res.status(400).json({
            message: err.message || "Validation failed",
        });
    }
};
exports.validateImage = validateImage;
//# sourceMappingURL=validate-user-file.js.map