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
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
require("tsconfig-paths/register");
var express_1 = __importDefault(require("express"));
var cookie_parser_1 = __importDefault(require("cookie-parser"));
var cors_1 = __importDefault(require("cors"));
var error_handler_1 = __importDefault(require("./utils/error_handler"));
var Routers_1 = __importDefault(require("./Routers"));
require("./config/cloudinaryConfig");
var StartServer_1 = require("./Starters/StartServer");
var errorHandler_1 = require("./Middleware/errorHandler");
var StripeBookingController_1 = require("./Controllers/Bookings/StripeBookingController");
var flutterwaveBookingController_1 = require("./Controllers/Bookings/flutterwaveBookingController");
var helmet_1 = __importDefault(require("helmet"));
var app = (0, express_1.default)();
app.set('trust proxy', 1);
var PORT = Number(process.env.PORT) || 3000;
var corsOptions = {
    origin: ['http://localhost:5173', 'https://care-connect-ena.netlify.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
(0, error_handler_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use((0, cookie_parser_1.default)());
app.post('/api/v1/webhook', express_1.default.raw({ type: 'application/json' }), StripeBookingController_1.stripeWebhook);
app.use(express_1.default.json());
app.post('/api/v1/flutterwave-webhook', flutterwaveBookingController_1.flutterwaveWebhook);
app.use('/api/v1', Routers_1.default);
app.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ message: "Welcome to Care Connect API", '-V': "0.0.1" });
        return [2 /*return*/];
    });
}); });
(0, StartServer_1.startServer)(app);
app.use(errorHandler_1.errorHandler);
//# sourceMappingURL=server.js.map