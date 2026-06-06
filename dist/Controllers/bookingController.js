"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingBySession = exports.stripeWebhook = exports.bookingSessionController = void 0;
var handledError_1 = require("@utils/handledError");
var bookingService_1 = require("Services/bookingService");
var BookingSchema_1 = __importDefault(require("models/BookingSchema"));
var DoctorSchema_1 = __importDefault(require("models/DoctorSchema"));
var UserSchema_1 = __importDefault(require("models/UserSchema"));
var logger_1 = require("@utils/logger");
var stripe_1 = __importDefault(require("stripe"));
var nodemailer_1 = require("@utils/message/nodemailer");
var stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
});
// ─── Create Checkout Session ──────────────────────────────────────────────────
var bookingSessionController = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var doctorId, _a, userId, role, _b, message, error, url, sessionId;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                doctorId = req.params.doctorId;
                _a = res.locals.auth, userId = _a.id, role = _a.role;
                if (role !== 'patient') {
                    res.status(400).json({ status: 'failed', message: 'Only patients can book appointments' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, bookingService_1.bookingSessionService)({ doctorId: doctorId, userId: userId })];
            case 1:
                _b = _c.sent(), message = _b.message, error = _b.error, url = _b.url, sessionId = _b.sessionId;
                if (error)
                    return [2 /*return*/, next((0, handledError_1.handleError)(error))];
                res.status(200).json({ message: message, url: url, sessionId: sessionId });
                return [2 /*return*/];
        }
    });
}); };
exports.bookingSessionController = bookingSessionController;
// ─── Stripe Webhook ───────────────────────────────────────────────────────────
var stripeWebhook = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sig, event, session, booking, _a, docAppointment, userAppointment, bookedOn, bookingDetail, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                sig = req.headers['stripe-signature'];
                if (!sig) {
                    res.status(400).send('Missing stripe-signature header');
                    return [2 /*return*/];
                }
                try {
                    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
                }
                catch (err) {
                    logger_1.winston_logger.error('Webhook signature error:', err.message);
                    res.status(400).send("Webhook Error: ".concat(err.message));
                    return [2 /*return*/];
                }
                if (!(event.type === 'checkout.session.completed')) return [3 /*break*/, 8];
                session = event.data.object;
                if (!(session.payment_status === 'paid')) return [3 /*break*/, 8];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 7, , 8]);
                return [4 /*yield*/, BookingSchema_1.default.findOneAndUpdate({ stripeSessionId: session.id }, { isPaid: true, status: 'approved' }, { new: true }).populate([
                        { path: 'doctor', select: 'name _id email' },
                        { path: 'user', select: 'name email _id' },
                    ])];
            case 2:
                booking = _b.sent();
                if (!booking) {
                    logger_1.winston_logger.error('No booking found for session:', session.id);
                    res.status(404).json({ message: 'Booking not found' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Promise.all([
                        DoctorSchema_1.default.findByIdAndUpdate(booking.doctor._id, {
                            $push: { appointments: booking._id }
                        }),
                        UserSchema_1.default.findByIdAndUpdate(booking.user._id, {
                            $push: { appointments: booking._id }
                        })
                    ])];
            case 3:
                _a = _b.sent(), docAppointment = _a[0], userAppointment = _a[1];
                if (!docAppointment || !userAppointment) {
                    logger_1.winston_logger.error('Failed to update doctor or user appointments for booking:', booking._id);
                    res.status(500).json({ message: 'Failed to update appointments' });
                    return [2 /*return*/];
                }
                ;
                if (!(docAppointment && userAppointment)) return [3 /*break*/, 6];
                bookedOn = booking.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
                bookingDetail = {
                    patientName: booking.user.name,
                    doctorName: booking.doctor.name,
                    ticketPrice: booking.ticketPrice,
                    patientEmail: booking.user.email,
                    doctorEmail: booking.doctor.email,
                    bookingRef: booking.user._id.toString().slice(8).toUpperCase(),
                    bookedOn: bookedOn,
                };
                return [4 /*yield*/, (0, nodemailer_1.sendPatientBookingEmail)(bookingDetail)];
            case 4:
                _b.sent();
                return [4 /*yield*/, (0, nodemailer_1.sendDoctorBookingEmail)(bookingDetail)];
            case 5:
                _b.sent();
                logger_1.winston_logger.info("Booking ".concat(booking._id, " marked as paid and approved. Doctor: ").concat(booking.doctor.name, ", User: ").concat(booking.user.name));
                _b.label = 6;
            case 6:
                logger_1.winston_logger.info("Booking confirmed}");
                return [3 /*break*/, 8];
            case 7:
                error_1 = _b.sent();
                logger_1.winston_logger.error('Webhook handler error:', error_1.message);
                res.status(500).json({ message: error_1.message });
                return [2 /*return*/];
            case 8:
                res.json({ received: true });
                return [2 /*return*/];
        }
    });
}); };
exports.stripeWebhook = stripeWebhook;
// ─── Get Booking by Stripe Session ID ────────────────────────────────────────
var getBookingBySession = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId, booking, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                sessionId = req.params.sessionId;
                return [4 /*yield*/, BookingSchema_1.default.findOne({ stripeSessionId: sessionId })
                        .populate({ path: 'doctor', select: 'name photo specialization' })
                        .populate({ path: 'user', select: 'name email photo' })];
            case 1:
                booking = _a.sent();
                if (!booking) {
                    res.status(404).json({ message: 'Booking not found' });
                    return [2 /*return*/];
                }
                res.status(200).json({ message: 'Booking fetched', booking: booking });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                next((0, handledError_1.handleError)(error_2));
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getBookingBySession = getBookingBySession;
//# sourceMappingURL=bookingController.js.map