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
exports.refreshedTokenService = exports.verifyEmailService = exports.loginServices = exports.registerService = void 0;
var logger_1 = require("@utils/logger");
var DoctorSchema_1 = __importDefault(require("models/DoctorSchema"));
var UserSchema_1 = __importDefault(require("models/UserSchema"));
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var generateTokens_1 = require("@utils/generateTokens");
var lodash_1 = __importDefault(require("lodash"));
var generateTokens_2 = require("@utils/generateTokens");
var UserSchema_2 = __importDefault(require("models/UserSchema"));
var constant_1 = require("config/constant");
var registerService = function (body) { return __awaiter(void 0, void 0, void 0, function () {
    var email, password, photo, name, role, gender, phone, bloodType, user, salt, hashedPassword, newUser, newDoctor, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                email = body.email, password = body.password, photo = body.photo, name = body.name, role = body.role, gender = body.gender, phone = body.phone, bloodType = body.bloodType;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 12, , 13]);
                user = null;
                if (!(role === 'patient')) return [3 /*break*/, 3];
                return [4 /*yield*/, UserSchema_1.default.findOne({ email: email })];
            case 2:
                user = _a.sent();
                return [3 /*break*/, 5];
            case 3:
                if (!(role === 'doctor')) return [3 /*break*/, 5];
                return [4 /*yield*/, DoctorSchema_1.default.findOne({ email: email })];
            case 4:
                user = _a.sent();
                _a.label = 5;
            case 5:
                if (user)
                    throw new Error('User with email already exits');
                return [4 /*yield*/, bcryptjs_1.default.genSalt(10)];
            case 6:
                salt = _a.sent();
                return [4 /*yield*/, bcryptjs_1.default.hash(password, salt)];
            case 7:
                hashedPassword = _a.sent();
                if (!(role === 'patient')) return [3 /*break*/, 9];
                newUser = new UserSchema_1.default({
                    email: email,
                    password: hashedPassword,
                    photo: photo,
                    name: name,
                    role: role,
                    gender: gender,
                    verified: false,
                    phone: phone,
                    bloodType: bloodType
                });
                return [4 /*yield*/, newUser.save()];
            case 8:
                _a.sent();
                return [2 /*return*/, { data: newUser, message: 'User created successfully', }];
            case 9:
                if (!(role === 'doctor')) return [3 /*break*/, 11];
                newDoctor = new DoctorSchema_1.default({
                    email: email,
                    password: hashedPassword,
                    photo: photo,
                    name: name,
                    role: role,
                    gender: gender,
                    verified: false,
                    phone: phone,
                    bloodType: bloodType
                });
                return [4 /*yield*/, newDoctor.save()];
            case 10:
                _a.sent();
                return [2 /*return*/, { data: newDoctor, message: 'Doctor created successfully' }];
            case 11: return [3 /*break*/, 13];
            case 12:
                error_1 = _a.sent();
                return [2 /*return*/, { error: error_1, message: error_1.message }];
            case 13: return [2 /*return*/];
        }
    });
}); };
exports.registerService = registerService;
var loginServices = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var _c, userPatient, userDoctor, userExist, audience, _d, token, error, _e, refreshedToken, RefTokenError, tokenError, comPass, data, error_2;
    var email = _b.email, password = _b.password;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 3, , 4]);
                return [4 /*yield*/, Promise.all([
                        UserSchema_1.default.findOne({ email: email }),
                        DoctorSchema_1.default.findOne({ email: email }),
                    ])];
            case 1:
                _c = _f.sent(), userPatient = _c[0], userDoctor = _c[1];
                userExist = userPatient || userDoctor;
                if (!userExist)
                    throw new Error('Invalid email or password');
                audience = void 0;
                if (userPatient)
                    audience = constant_1.AUDIENCE.PATIENT;
                if (userDoctor)
                    audience = constant_1.AUDIENCE.DOCTOR;
                console.log('Audience:', audience);
                _d = (0, generateTokens_1.generateAccessToken)({ user: { id: userExist === null || userExist === void 0 ? void 0 : userExist.toObject()._id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }, audience: audience }), token = _d.token, error = _d.error;
                _e = (0, generateTokens_1.generateAccessToken)({ user: { id: userExist === null || userExist === void 0 ? void 0 : userExist.toObject()._id }, options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }, audience: audience }), refreshedToken = _e.token, RefTokenError = _e.error;
                tokenError = error || RefTokenError;
                if (error || RefTokenError)
                    throw new Error(tokenError);
                return [4 /*yield*/, bcryptjs_1.default.compare(password, userExist.password)];
            case 2:
                comPass = _f.sent();
                if (!comPass)
                    throw new Error('Invalid email or password');
                data = lodash_1.default.omit(userExist.toObject(), ['password']);
                if (!data.verified) {
                    throw new Error('Please verify your email to login');
                }
                return [2 /*return*/, { data: data, message: 'Login Successful', token: token, refreshedToken: refreshedToken }];
            case 3:
                error_2 = _f.sent();
                logger_1.winston_logger.error(error_2.message, error_2.stack);
                return [2 /*return*/, { error: error_2, message: error_2.message, data: {} }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.loginServices = loginServices;
var verifyEmailService = function (id, token) { return __awaiter(void 0, void 0, void 0, function () {
    var user, doctor, audience, _a, decoded, expired, message, error_3;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 8, , 9]);
                user = void 0;
                doctor = void 0;
                return [4 /*yield*/, Promise.all([
                        UserSchema_2.default.findById(id),
                        DoctorSchema_1.default.findById(id)
                    ])];
            case 1:
                _b = _d.sent(), user = _b[0], doctor = _b[1];
                if (!user && !doctor) {
                    throw new Error('user not found');
                }
                audience = void 0;
                if (user)
                    audience = constant_1.AUDIENCE.PATIENT;
                if (doctor)
                    audience = constant_1.AUDIENCE.DOCTOR;
                _a = (0, generateTokens_2.verifyToken)(token, audience), decoded = _a.decoded, expired = _a.expired, message = _a.message;
                if (!(message === 'jwt expired')) return [3 /*break*/, 3];
                return [4 /*yield*/, Promise.all([
                        UserSchema_2.default.findByIdAndDelete(id),
                        DoctorSchema_1.default.findByIdAndDelete(id)
                    ])];
            case 2:
                _d.sent();
                throw new Error('verification link expired');
            case 3:
                if (!(message === 'jwt expired')) return [3 /*break*/, 5];
                return [4 /*yield*/, Promise.all([
                        UserSchema_2.default.findByIdAndDelete(id),
                        DoctorSchema_1.default.findByIdAndDelete(id)
                    ])];
            case 4:
                _d.sent();
                throw new Error('verification link expired');
            case 5:
                ;
                return [4 /*yield*/, Promise.all([
                        UserSchema_2.default.findByIdAndUpdate(id, { verified: true }, { new: true }),
                        DoctorSchema_1.default.findByIdAndUpdate(id, { verified: true }, { new: true })
                    ])];
            case 6:
                _c = _d.sent(), user = _c[0], doctor = _c[1];
                _d.label = 7;
            case 7: return [2 /*return*/, { message: 'Email verified successfully' }];
            case 8:
                error_3 = _d.sent();
                logger_1.winston_logger.error(error_3.message, error_3.stack);
                return [2 /*return*/, { error: error_3, message: error_3.message }];
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.verifyEmailService = verifyEmailService;
var refreshedTokenService = function (refreshedToken, id) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, user, doctor, audience, _b, decoded, expired, message, _c, token, error, error_4;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Promise.all([
                        UserSchema_1.default.findById(id),
                        DoctorSchema_1.default.findById(id)
                    ])];
            case 1:
                _a = _d.sent(), user = _a[0], doctor = _a[1];
                audience = void 0;
                if ((user === null || user === void 0 ? void 0 : user._id.toString()) === id)
                    audience = constant_1.AUDIENCE.PATIENT;
                if ((doctor === null || doctor === void 0 ? void 0 : doctor._id.toString()) === id)
                    audience = constant_1.AUDIENCE.DOCTOR;
                _b = (0, generateTokens_2.verifyToken)(refreshedToken, audience), decoded = _b.decoded, expired = _b.expired, message = _b.message;
                if (!decoded || expired) {
                    throw new Error(message !== null && message !== void 0 ? message : 'refresh token expired');
                }
                _c = (0, generateTokens_1.generateAccessToken)({ user: { id: id }, options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }, audience: audience }), token = _c.token, error = _c.error;
                if (error)
                    throw new Error(error);
                return [2 /*return*/, {
                        token: token,
                        error: null,
                        message: 'Token refreshed successfully'
                    }];
            case 2:
                error_4 = _d.sent();
                logger_1.winston_logger.error(error_4.message, error_4.stack);
                return [2 /*return*/, {
                        token: null,
                        error: error_4,
                        message: error_4.message
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.refreshedTokenService = refreshedTokenService;
//# sourceMappingURL=authService.js.map