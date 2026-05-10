"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var authController_1 = require("Controllers/authController");
var zod_schemas_1 = require("DTO_Validations/zod_schemas");
var zod_validate_1 = __importDefault(require("DTO_Validations/zod_validate"));
var express_1 = __importDefault(require("express"));
var cloudStorageMulter_1 = require("config/cloudStorageMulter");
var validateImage_1 = require("Middleware/validateImage");
var asyncHandler_1 = require("@utils/asyncHandler");
var multerErrorHandler_1 = require("Middleware/multerErrorHandler");
// import { sanitizedUser } from 'Middleware/sanitized';
var router = express_1.default.Router();
router.post('/register', [cloudStorageMulter_1.upload.single('photo'), multerErrorHandler_1.multerErrorHandler, validateImage_1.validateImage, (0, zod_validate_1.default)(zod_schemas_1.registerUserSchema)], (0, asyncHandler_1.asyncHandler)(authController_1.register));
router.post('/login', (0, zod_validate_1.default)(zod_schemas_1.loginUserSchema), authController_1.login);
router.post('/verify-email', (0, zod_validate_1.default)(zod_schemas_1.verifyEmailSchema), authController_1.verifyEmail);
router.post('/refresh-token/:id', authController_1.refreshToken);
exports.default = router;
//# sourceMappingURL=auth.js.map