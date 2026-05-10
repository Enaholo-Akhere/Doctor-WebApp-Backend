"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var userController_1 = require("Controllers/userController");
var sanitized_1 = require("Middleware/sanitized");
var zod_validate_1 = __importDefault(require("DTO_Validations/zod_validate"));
var zod_schemas_1 = require("DTO_Validations/zod_schemas");
var auth_1 = require("Middleware/auth");
var cloudStorageMulter_1 = require("config/cloudStorageMulter");
var validateImage_1 = require("Middleware/validateImage");
var asyncHandler_1 = require("@utils/asyncHandler");
var multerErrorHandler_1 = require("Middleware/multerErrorHandler");
var router = express_1.default.Router();
router.get('/', [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['admin'])], userController_1.getAllUsers);
router.get('/:id', [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['patient'])], userController_1.getUserById);
router.put('/:id', [cloudStorageMulter_1.upload.single('photo'), multerErrorHandler_1.multerErrorHandler, validateImage_1.validateImage, (0, zod_validate_1.default)(zod_schemas_1.updateUserSchema)], (0, asyncHandler_1.asyncHandler)(userController_1.updateUser));
router.delete('/:id', [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['patient'])], userController_1.deleteUser);
router.get('/appointments/my-appointments', [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['patient'])], userController_1.getMyAppointments);
router.get('/profile/me/:id', [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['patient'])], userController_1.getMyProfile);
exports.default = router;
//# sourceMappingURL=users.js.map