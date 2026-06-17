"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var authController_1 = require("../Controllers/authController");
var zod_schemas_1 = require("../DTO_Validations/zod_schemas");
var zod_validate_1 = __importDefault(require("../DTO_Validations/zod_validate"));
var express_1 = __importDefault(require("express"));
var cloudStorageMulter_1 = require("../config/cloudStorageMulter");
var validateImage_1 = require("../Middleware/validateImage");
var asyncHandler_1 = require("../utils/asyncHandler");
var multerErrorHandler_1 = require("../Middleware/multerErrorHandler");
var sanitized_1 = require("../Middleware/sanitized");
var geolocationController_1 = require("../Controllers/geolocationController");
var router = express_1.default.Router();
router.post('/register', [cloudStorageMulter_1.upload.single('photo'), multerErrorHandler_1.multerErrorHandler, validateImage_1.validateImage, (0, zod_validate_1.default)(zod_schemas_1.registerUserSchema)], (0, asyncHandler_1.asyncHandler)(authController_1.register));
router.post('/login', (0, zod_validate_1.default)(zod_schemas_1.loginUserSchema), authController_1.login);
router.post('/forgot-password', (0, zod_validate_1.default)(zod_schemas_1.forgotPasswordSchema), authController_1.forgotPassword);
router.post('/set-password', (0, zod_validate_1.default)(zod_schemas_1.setPasswordSchema), authController_1.setPassword);
router.post('/verify-email', (0, zod_validate_1.default)(zod_schemas_1.verifyEmailSchema), authController_1.verifyEmail);
router.put('/logout', sanitized_1.sanitizedUser, authController_1.logout);
router.get('/geolocation', geolocationController_1.geolocation);
router.post('/refresh-token/:id', authController_1.refreshToken);
exports.default = router;
//# sourceMappingURL=auth.js.map