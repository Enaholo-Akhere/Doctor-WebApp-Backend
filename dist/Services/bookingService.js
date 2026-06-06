'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === 'function' ? Iterator : Object).prototype
      );
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.bookingSessionService = void 0;
var UserSchema_1 = __importDefault(require('models/UserSchema'));
var BookingSchema_1 = __importDefault(require('models/BookingSchema'));
var DoctorSchema_1 = __importDefault(require('models/DoctorSchema'));
var stripe_1 = __importDefault(require('stripe'));
var logger_1 = require('@utils/logger');
var bookingSessionService = function (_a) {
  return __awaiter(void 0, [_a], void 0, function (_b) {
    var stripeKey,
      clientUrl,
      cancelUrl,
      _c,
      doctor,
      user,
      stripe,
      session,
      booking,
      error_1;
    var _d;
    var doctorId = _b.doctorId,
      userId = _b.userId;
    return __generator(this, function (_e) {
      switch (_e.label) {
        case 0:
          stripeKey = process.env.STRIPE_SECRET_KEY || '';
          clientUrl = process.env.CLIENT_URL || '';
          cancelUrl = ''.concat(clientUrl, '/doctor/').concat(doctorId);
          _e.label = 1;
        case 1:
          _e.trys.push([1, 5, , 6]);
          return [
            4 /*yield*/,
            Promise.all([
              DoctorSchema_1.default.findById(doctorId),
              UserSchema_1.default.findById(userId),
            ]),
          ];
        case 2:
          ((_c = _e.sent()), (doctor = _c[0]), (user = _c[1]));
          if (!doctor || !user) {
            throw new Error('Doctor or user not found');
          }
          stripe = new stripe_1.default(stripeKey);
          return [
            4 /*yield*/,
            stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              mode: 'payment',
              success_url: ''.concat(
                clientUrl,
                '/payment-success?session_id={CHECKOUT_SESSION_ID}'
              ),
              cancel_url: cancelUrl,
              customer_email: user.email,
              client_reference_id: doctorId,
              metadata: {
                userId: userId.toString(),
                doctorId: doctorId,
              },
              line_items: [
                {
                  price_data: {
                    currency: 'usd',
                    unit_amount: doctor.ticketPrice * 100,
                    product_data: {
                      name: 'Appointment with Dr. '.concat(doctor.name),
                      description: doctor.bio || 'Medical consultation',
                      images: (
                        (_d = doctor.photo) === null || _d === void 0
                          ? void 0
                          : _d.imageUrl
                      )
                        ? [doctor.photo.imageUrl]
                        : [],
                    },
                  },
                  quantity: 1,
                },
              ],
            }),
          ];
        case 3:
          session = _e.sent();
          booking = new BookingSchema_1.default({
            doctor: doctor._id,
            user: user._id,
            ticketPrice: doctor.ticketPrice,
            stripeSessionId: session.id,
            isPaid: false,
            status: 'pending',
          });
          return [4 /*yield*/, booking.save()];
        case 4:
          _e.sent();
          // ✅ Only return url and id — not the full session object
          return [
            2 /*return*/,
            {
              message: 'Checkout session created',
              url: session.url,
              sessionId: session.id,
            },
          ];
        case 5:
          error_1 = _e.sent();
          logger_1.winston_logger.error(error_1.message, error_1.stack);
          return [
            2 /*return*/,
            { message: error_1.message, error: error_1, url: null },
          ];
        case 6:
          return [2 /*return*/];
      }
    });
  });
};
exports.bookingSessionService = bookingSessionService;
//# sourceMappingURL=bookingService.js.map
