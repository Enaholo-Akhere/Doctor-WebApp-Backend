"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var sanitized_1 = require("Middleware/sanitized");
var bookingController_1 = require("Controllers/bookingController");
var router = express_1.default.Router();
router.post('/checkout-session/:doctorId', sanitized_1.sanitizedUser, bookingController_1.bookingSessionController);
router.get('/session/:sessionId', sanitized_1.sanitizedUser, bookingController_1.getBookingBySession);
exports.default = router;
//# sourceMappingURL=booking.js.map