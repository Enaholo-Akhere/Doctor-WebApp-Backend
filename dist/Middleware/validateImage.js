"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateImage = void 0;
var validateAvatarFile_1 = require("@utils/validateAvatarFile");
var validateImage = function (req, res, next) {
    try {
        var photo = typeof req.body.photo === "string"
            ? JSON.parse(req.body.photo)
            : req.body.photo;
        if ((photo === null || photo === void 0 ? void 0 : photo.imageUrl) &&
            photo.imageUrl.startsWith("https://res.cloudinary.com")) {
            res.locals.photo = photo;
            return next();
        }
        // fallback to uploaded file
        (0, validateAvatarFile_1.validateAvatarFile)(req.file);
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.validateImage = validateImage;
//# sourceMappingURL=validateImage.js.map