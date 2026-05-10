"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var reviewController_1 = require("Controllers/reviewController");
var express_1 = __importDefault(require("express"));
var sanitized_1 = require("Middleware/sanitized");
var zod_validate_1 = __importDefault(require("DTO_Validations/zod_validate"));
var auth_1 = require("Middleware/auth");
var zod_schemas_1 = require("DTO_Validations/zod_schemas");
var router = express_1.default.Router();
router.get("/", [sanitized_1.sanitizedUser], reviewController_1.getAllReviews);
router.post("/:doctorId/:id", [sanitized_1.sanitizedUser, (0, auth_1.restrict)(['patient', 'doctor']), (0, zod_validate_1.default)(zod_schemas_1.reviewSchema)], reviewController_1.createReview);
exports.default = router;
//# sourceMappingURL=review.js.map