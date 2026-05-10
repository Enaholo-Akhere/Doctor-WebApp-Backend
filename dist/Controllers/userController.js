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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyProfile = exports.getMyAppointments = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = void 0;
var userService_1 = require("Services/userService");
var handledError_1 = require("@utils/handledError");
var getAllUsers = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, error, data, message;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, (0, userService_1.getUserService)()];
            case 1:
                _a = _b.sent(), error = _a.error, data = _a.data, message = _a.message;
                if (error) {
                    next((0, handledError_1.handleError)(error));
                }
                res.status(200).json({ status: true, message: message, data: data });
                return [2 /*return*/];
        }
    });
}); };
exports.getAllUsers = getAllUsers;
var getUserById = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, data, message, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                return [4 /*yield*/, (0, userService_1.getUserByIdService)(id)];
            case 1:
                _a = _b.sent(), data = _a.data, message = _a.message, error = _a.error;
                if (error) {
                    next((0, handledError_1.handleError)(error));
                }
                res.status(200).json({ message: message, status: true, data: data });
                return [2 /*return*/];
        }
    });
}); };
exports.getUserById = getUserById;
var updateUser = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var body, id, photo, userData, _a, data, message, error;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                body = req.body;
                id = req.params.id;
                photo = res.locals.photo;
                userData = {};
                if (req.file) {
                    userData = __assign(__assign({}, body), { photo: { imageUrl: (_b = req.file) === null || _b === void 0 ? void 0 : _b.path, publicId: (_c = req === null || req === void 0 ? void 0 : req.file) === null || _c === void 0 ? void 0 : _c.filename } });
                }
                if (!req.file) {
                    userData = __assign(__assign({}, body), { photo: photo });
                }
                return [4 /*yield*/, (0, userService_1.updateUserService)({ id: id, body: userData })];
            case 1:
                _a = _d.sent(), data = _a.data, message = _a.message, error = _a.error;
                if (error) {
                    next((0, handledError_1.handleError)(error));
                }
                res.status(200).json({ message: message, status: true, data: data });
                return [2 /*return*/];
        }
    });
}); };
exports.updateUser = updateUser;
var deleteUser = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, message, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                if (!id)
                    res.status(404).json({ message: 'user ID not found', status: false });
                return [4 /*yield*/, (0, userService_1.deleteUserService)(id)];
            case 1:
                _a = _b.sent(), message = _a.message, error = _a.error;
                if (error) {
                    next((0, handledError_1.handleError)(error));
                }
                res.status(200).json({ message: message, status: true });
                return [2 /*return*/];
        }
    });
}); };
exports.deleteUser = deleteUser;
var getMyAppointments = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, _a, data, message, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userId = res.locals.auth.id;
                return [4 /*yield*/, (0, userService_1.getMyAppointmentsService)(userId)];
            case 1:
                _a = _b.sent(), data = _a.data, message = _a.message, error = _a.error;
                if (error) {
                    next((0, handledError_1.handleError)(error));
                }
                res.status(200).json({ message: message, status: true, data: data });
                return [2 /*return*/];
        }
    });
}); };
exports.getMyAppointments = getMyAppointments;
var getMyProfile = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, _a, data, message, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userId = res.locals.auth.id;
                return [4 /*yield*/, (0, userService_1.getUserProfileService)(userId)];
            case 1:
                _a = _b.sent(), data = _a.data, message = _a.message, error = _a.error;
                if (error) {
                    next((0, handledError_1.handleError)(error));
                }
                res.status(200).json({ message: message, status: true, data: data });
                return [2 /*return*/];
        }
    });
}); };
exports.getMyProfile = getMyProfile;
//# sourceMappingURL=userController.js.map