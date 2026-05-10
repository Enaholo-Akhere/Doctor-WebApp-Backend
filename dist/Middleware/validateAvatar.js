"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAvatar = void 0;
var validateAvatarFile_1 = require("@utils/validateAvatarFile");
var validateAvatar = function (req, res, next) {
    try {
        (0, validateAvatarFile_1.validateAvatarFile)(req.file);
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.validateAvatar = validateAvatar;
//# sourceMappingURL=validateAvatar.js.map