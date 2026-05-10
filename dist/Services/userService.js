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
exports.getMyAppointmentsService = exports.getUserProfileService = exports.deleteUserService = exports.updateUserService = exports.getUserByIdService = exports.getUserService = void 0;
var logger_1 = require("@utils/logger");
var lodash_1 = __importDefault(require("lodash"));
var UserSchema_1 = __importDefault(require("models/UserSchema"));
var BookingSchema_1 = __importDefault(require("models/BookingSchema"));
var DoctorSchema_1 = __importDefault(require("models/DoctorSchema"));
var getUserService = function () { return __awaiter(void 0, void 0, void 0, function () {
    var users, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, UserSchema_1.default.find().select(['-password', '-__v'])];
            case 1:
                users = _a.sent();
                if (!users)
                    throw new Error('cannot get users');
                return [2 /*return*/, { data: users, message: 'successful' }];
            case 2:
                error_1 = _a.sent();
                logger_1.winston_logger.error(error_1.message, error_1.stack);
                return [2 /*return*/, { error: error_1, message: error_1.message, data: {} }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getUserService = getUserService;
var getUserByIdService = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var user, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, UserSchema_1.default.findById(id).select(['-password', '-__v'])];
            case 1:
                user = _a.sent();
                if (!user)
                    throw new Error('user not found');
                return [2 /*return*/, { data: user, message: 'successful' }];
            case 2:
                error_2 = _a.sent();
                logger_1.winston_logger.error(error_2.message, { stack: error_2.stack });
                return [2 /*return*/, { error: error_2, message: error_2.message }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getUserByIdService = getUserByIdService;
var updateUserService = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var allowedFields, userData, updatedUser, error_3;
    var id = _b.id, body = _b.body;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                allowedFields = [
                    "name",
                    "phone",
                    "photo",
                    "bloodType",
                    "gender"
                ];
                userData = lodash_1.default.pick(body, allowedFields);
                console.log('userData', userData);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, UserSchema_1.default.findByIdAndUpdate(id, userData, { new: true, runValidators: true }).select(['-password', '-__v'])];
            case 2:
                updatedUser = _c.sent();
                if (!updatedUser)
                    throw new Error("user not found");
                return [2 /*return*/, { data: updatedUser, message: 'user updated successfully' }];
            case 3:
                error_3 = _c.sent();
                logger_1.winston_logger.error(error_3.message, error_3.stack);
                return [2 /*return*/, { error: error_3, message: error_3.message }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.updateUserService = updateUserService;
var deleteUserService = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var deleteUser, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, UserSchema_1.default.findByIdAndDelete(id)];
            case 1:
                deleteUser = _a.sent();
                if (!deleteUser)
                    throw new Error('user not found');
                return [2 /*return*/, { message: 'user successfully deleted' }];
            case 2:
                error_4 = _a.sent();
                logger_1.winston_logger.error(error_4.message, error_4.stack);
                return [2 /*return*/, { error: error_4 }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.deleteUserService = deleteUserService;
var getUserProfileService = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var user, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, UserSchema_1.default.findById(id).select(['-password', '-__v'])];
            case 1:
                user = _a.sent();
                if (!user)
                    throw new Error('user not found');
                return [2 /*return*/, { data: user, message: 'successful' }];
            case 2:
                error_5 = _a.sent();
                logger_1.winston_logger.error(error_5.message, error_5.stack);
                return [2 /*return*/, { error: error_5, message: error_5.message }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getUserProfileService = getUserProfileService;
var getMyAppointmentsService = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var bookings, doctorIds, doctors, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, BookingSchema_1.default.find({ user: id })];
            case 1:
                bookings = _a.sent();
                doctorIds = bookings.map(function (booking) { return booking.doctor.id; });
                return [4 /*yield*/, DoctorSchema_1.default.find({ _id: { $in: doctorIds } }).select(['-password', '-__v'])];
            case 2:
                doctors = _a.sent();
                return [2 /*return*/, { data: doctors, message: 'successful' }];
            case 3:
                error_6 = _a.sent();
                logger_1.winston_logger.error(error_6.message, error_6.stack);
                return [2 /*return*/, { error: error_6, message: error_6.message }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getMyAppointmentsService = getMyAppointmentsService;
//# sourceMappingURL=userService.js.map