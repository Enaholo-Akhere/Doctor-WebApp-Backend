"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var sanitized_1 = require("Middleware/sanitized");
var zod_validate_1 = __importDefault(require("DTO_Validations/zod_validate"));
var doctorController_1 = require("Controllers/doctorController");
var auth_1 = require("Middleware/auth");
var zod_schemas_1 = require("DTO_Validations/zod_schemas");
var multerErrorHandler_1 = require("Middleware/multerErrorHandler");
var validateImage_1 = require("Middleware/validateImage");
var cloudStorageMulter_1 = require("config/cloudStorageMulter");
var asyncHandler_1 = require("@utils/asyncHandler");
var router = express_1.default.Router();
router.get('/', doctorController_1.getAllDoctors);
router.get('/:id', [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['doctor', 'patient', 'admin'])], doctorController_1.getDoctorById);
router.put('/:id', [cloudStorageMulter_1.upload.single('photo'), multerErrorHandler_1.multerErrorHandler, validateImage_1.validateImage, sanitized_1.sanitizedUser, (0, auth_1.restrict)(['doctor']), (0, zod_validate_1.default)(zod_schemas_1.updateDoctorSchema)], (0, asyncHandler_1.asyncHandler)(doctorController_1.updateDoctor));
router.delete('/:id', [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['doctor'])], doctorController_1.deleteDoctor);
router.get('/profile/me/:id', [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['doctor'])], doctorController_1.getDoctorProfile);
exports.default = router;
//# sourceMappingURL=doctors.js.map