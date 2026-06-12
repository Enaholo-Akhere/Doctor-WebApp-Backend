"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var sanitized_1 = require("../Middleware/sanitized");
var StripeBookingController_1 = require("../Controllers/Bookings/StripeBookingController");
var flutterwaveBookingController_1 = require("../Controllers/Bookings/flutterwaveBookingController");
var router = express_1.default.Router();
// router.post('/flutterwave', flutterInitialPayment);
router.post('/flutterwave', function (req, res, next) {
    console.log('Flutterwave route hit');
    next();
}, flutterwaveBookingController_1.flutterInitialPayment);
router.post('/checkout-session/:doctorId', sanitized_1.sanitizedUser, StripeBookingController_1.bookingSessionController);
router.get('/session/:sessionId', sanitized_1.sanitizedUser, StripeBookingController_1.getBookingBySession);
exports.default = router;
//# sourceMappingURL=booking.js.map