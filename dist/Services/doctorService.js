"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getDoctorProfileService = exports.deleteDoctorService = exports.updateDoctorService = exports.getDoctorByIdService = exports.getDoctorService = void 0;
var logger_1 = require("@utils/logger");
var DoctorSchema_1 = __importDefault(require("models/DoctorSchema"));
var BookingSchema_1 = __importDefault(require("models/BookingSchema"));
var escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
var getDoctorService = function (search) { return __awaiter(void 0, void 0, void 0, function () {
    var escapedName, escapedSpec, doctor, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                escapedName = search ? (0, escape_string_regexp_1.default)(String(search)) : '';
                escapedSpec = search ? (0, escape_string_regexp_1.default)(String(search)) : '';
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                doctor = void 0;
                if (!search) return [3 /*break*/, 3];
                return [4 /*yield*/, DoctorSchema_1.default.find({
                        isApproved: 'pending',
                        $or: [
                            { name: { $regex: escapedName, $options: 'i' } },
                            { specialization: { $regex: escapedSpec, $options: 'i' } },
                        ]
                    }).select(['-password', '-__v'])];
            case 2:
                doctor = _a.sent();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, DoctorSchema_1.default.find().select(['-password', '-__v'])];
            case 4:
                doctor = _a.sent();
                _a.label = 5;
            case 5:
                if (!doctor.length)
                    throw new Error('doctor not found');
                return [2 /*return*/, { data: doctor, message: 'successful' }];
            case 6:
                error_1 = _a.sent();
                logger_1.winston_logger.error(error_1.message, error_1.stack);
                console.log('error message', error_1.message);
                return [2 /*return*/, { error: error_1, message: error_1.message, data: [] }];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.getDoctorService = getDoctorService;
var getDoctorByIdService = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var doctor, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, DoctorSchema_1.default.findById(id).populate('reviews').select(['-password', '-__v'])];
            case 1:
                doctor = _a.sent();
                if (!doctor)
                    throw new Error('doctor not found');
                return [2 /*return*/, { data: doctor, message: 'successful' }];
            case 2:
                error_2 = _a.sent();
                logger_1.winston_logger.error(error_2.message, { stack: error_2.stack });
                return [2 /*return*/, { error: error_2, message: error_2.message }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getDoctorByIdService = getDoctorByIdService;
var updateDoctorService = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var allowedFields, updatedDoctor, error_3;
    var id = _b.id, userData = _b.userData;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                allowedFields = __assign(__assign({}, userData), { qualifications: JSON.parse(userData.qualifications || '[]'), experiences: JSON.parse(userData.experiences || '[]'), timeSlots: JSON.parse(userData.timeSlots || '[]') });
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, DoctorSchema_1.default.findByIdAndUpdate(id, allowedFields, { new: true, runValidators: true }).select(['-password', '-__v'])];
            case 2:
                updatedDoctor = _c.sent();
                if (!updatedDoctor)
                    throw new Error("doctor not found");
                return [2 /*return*/, { data: updatedDoctor, message: 'doctor updated successfully' }];
            case 3:
                error_3 = _c.sent();
                logger_1.winston_logger.error(error_3.message, error_3.stack);
                return [2 /*return*/, { error: error_3, message: error_3.message }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.updateDoctorService = updateDoctorService;
var deleteDoctorService = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var deleteDoctor, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, DoctorSchema_1.default.findByIdAndDelete(id)];
            case 1:
                deleteDoctor = _a.sent();
                if (!deleteDoctor)
                    throw new Error('doctor not found');
                return [2 /*return*/, { message: 'doctor successfully deleted' }];
            case 2:
                error_4 = _a.sent();
                logger_1.winston_logger.error(error_4.message, error_4.stack);
                return [2 /*return*/, { error: error_4, message: error_4.message }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.deleteDoctorService = deleteDoctorService;
var getDoctorProfileService = function (doctorId) { return __awaiter(void 0, void 0, void 0, function () {
    var doctor, appointments, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, DoctorSchema_1.default.findById(doctorId).select(['-password', '-__v'])];
            case 1:
                doctor = _a.sent();
                return [4 /*yield*/, BookingSchema_1.default.find({ doctor: doctorId })];
            case 2:
                appointments = _a.sent();
                if (!doctor)
                    throw new Error('doctor not found');
                return [2 /*return*/, { data: doctor, message: 'successful', appointments: appointments }];
            case 3:
                error_5 = _a.sent();
                logger_1.winston_logger.error(error_5.message, error_5.stack);
                return [2 /*return*/, { error: error_5, message: error_5.message }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getDoctorProfileService = getDoctorProfileService;
//# sourceMappingURL=doctorService.js.map