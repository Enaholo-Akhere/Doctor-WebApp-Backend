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
exports.sanitizedUser = void 0;
var generateTokens_1 = require("@utils/generateTokens");
var handledError_1 = require("@utils/handledError");
var logger_1 = require("@utils/logger");
var constant_1 = require("config/constant");
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var sanitizedUser = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, unVerified, _a, sub, aud, validAudiences, _b, decoded, expired, message;
    return __generator(this, function (_c) {
        try {
            authHeader = req.get('authorization');
            if (!authHeader)
                throw new Error('token not found');
            if (req.method === 'OPTIONS') {
                return [2 /*return*/, next()];
            }
            token = authHeader.split(' ')[1];
            unVerified = jsonwebtoken_1.default.decode(token, { complete: true });
            if (!unVerified) {
                throw new Error('Invalid token');
            }
            _a = unVerified.payload, sub = _a.sub, aud = _a.aud;
            validAudiences = Object.values(constant_1.AUDIENCE);
            if (!validAudiences.includes(aud)) {
                throw new Error('Invalid token audience');
            }
            _b = (0, generateTokens_1.verifyToken)(token, aud), decoded = _b.decoded, expired = _b.expired, message = _b.message;
            if (message.includes('jwt audience invalid')) {
                throw new Error('Invalid token');
            }
            if (!decoded || expired) {
                throw new Error(message !== null && message !== void 0 ? message : 'access token expired');
            }
            res.locals.auth = { id: sub, audience: aud };
            next();
        }
        catch (error) {
            logger_1.winston_logger.error(error.message, error.stack);
            next((0, handledError_1.handleError)(error));
        }
        return [2 /*return*/];
    });
}); };
exports.sanitizedUser = sanitizedUser;
//# sourceMappingURL=sanitized.js.map