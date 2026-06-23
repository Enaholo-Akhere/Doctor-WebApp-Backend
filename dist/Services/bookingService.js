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
exports.bookingSessionService = void 0;
var UserSchema_1 = __importDefault(require("../models/UserSchema"));
var BookingSchema_1 = __importDefault(require("../models/BookingSchema"));
var DoctorSchema_1 = __importDefault(require("../models/DoctorSchema"));
var stripe_1 = __importDefault(require("stripe"));
var logger_1 = require("../utils/logger");
var paymentProvider_1 = require("../utils/paymentProvider");
var bookingSessionService = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var stripeKey, devUrl, prodUrl, clientUrl, cancelUrl, _c, currency, exchangeRate, countryCode, provider, _d, doctor, user, userAppointments_1, hasBooked, stripe, session, booking, error_1;
    var _e, _f, _g;
    var doctorId = _b.doctorId, userId = _b.userId, ip = _b.ip;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                stripeKey = process.env.STRIPE_SECRET_KEY || "";
                devUrl = process.env.DEV_CLIENT_URL || "";
                prodUrl = process.env.PROD_CLIENT_URL || "";
                clientUrl = process.env.NODE_ENV === 'production' ? prodUrl : devUrl;
                cancelUrl = "".concat(clientUrl, "/doctor/").concat(doctorId);
                _h.label = 1;
            case 1:
                _h.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, paymentProvider_1.detectPaymentProvider)(ip)];
            case 2:
                _c = _h.sent(), currency = _c.currency, exchangeRate = _c.exchangeRate, countryCode = _c.countryCode, provider = _c.provider;
                return [4 /*yield*/, Promise.all([
                        DoctorSchema_1.default.findById(doctorId),
                        UserSchema_1.default.findById(userId)
                    ])];
            case 3:
                _d = _h.sent(), doctor = _d[0], user = _d[1];
                userAppointments_1 = new Set((_e = user === null || user === void 0 ? void 0 : user.appointments) === null || _e === void 0 ? void 0 : _e.map(String));
                hasBooked = (_f = doctor === null || doctor === void 0 ? void 0 : doctor.appointments) === null || _f === void 0 ? void 0 : _f.some(function (appt) { return userAppointments_1.has(String(appt)); });
                if (hasBooked)
                    throw new Error('You have booked this doctor already');
                if (!doctor || !user) {
                    throw new Error('Doctor or user not found');
                }
                stripe = new stripe_1.default(stripeKey);
                return [4 /*yield*/, stripe.checkout.sessions.create({
                        payment_method_types: ['card'],
                        mode: 'payment',
                        success_url: "".concat(clientUrl, "/payment-success-st?session_id={CHECKOUT_SESSION_ID}"),
                        cancel_url: cancelUrl,
                        customer_email: user.email,
                        client_reference_id: doctorId,
                        metadata: {
                            userId: userId.toString(),
                            doctorId: doctorId
                        },
                        line_items: [
                            {
                                price_data: {
                                    currency: currency.toLowerCase(),
                                    unit_amount: Math.ceil(doctor.ticketPrice * exchangeRate * 100),
                                    product_data: {
                                        name: "Appointment with Dr. ".concat(doctor.name),
                                        description: doctor.bio || 'Medical consultation',
                                        images: ((_g = doctor.photo) === null || _g === void 0 ? void 0 : _g.imageUrl) ? [doctor.photo.imageUrl] : [],
                                    },
                                },
                                quantity: 1,
                            },
                        ],
                    })];
            case 4:
                session = _h.sent();
                booking = new BookingSchema_1.default({
                    doctor: doctor._id,
                    user: user._id,
                    ticketPrice: doctor.ticketPrice,
                    sessionId: session.id,
                    isPaid: false,
                    status: 'pending',
                    paymentPlatform: 'stp'
                });
                return [4 /*yield*/, booking.save()];
            case 5:
                _h.sent();
                return [2 /*return*/, {
                        message: 'Checkout session created',
                        url: session.url,
                        sessionId: session.id,
                    }];
            case 6:
                error_1 = _h.sent();
                logger_1.winston_logger.error(error_1.message, error_1.stack);
                return [2 /*return*/, { message: error_1.message, error: error_1, url: null }];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.bookingSessionService = bookingSessionService;
//# sourceMappingURL=bookingService.js.map