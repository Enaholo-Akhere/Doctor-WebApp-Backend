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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshStore = exports.verifyToken = exports.generateAccessToken = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var logger_1 = require("./logger");
var constant_1 = require("../config/constant");
var privateKey = (_a = process.env.PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n');
var publicKey = (_b = process.env.PUBLIC_KEY) === null || _b === void 0 ? void 0 : _b.replace(/\\n/g, '\n');
var generateAccessToken = function (_a) {
    var user = _a.user, options = _a.options, audience = _a.audience;
    // Only include serializable user properties in the payload
    var aud = String(user.id);
    try {
        var token = jsonwebtoken_1.default.sign({ sub: user.id, }, privateKey, __assign({ algorithm: 'RS256', audience: audience, issuer: constant_1.ISSUER }, (options && options)));
        return { token: token };
    }
    catch (error) {
        logger_1.winston_logger.error(error.message, error.stack);
        return { error: error };
    }
};
exports.generateAccessToken = generateAccessToken;
var verifyToken = function (token, audience) {
    try {
        var decoded = jsonwebtoken_1.default.verify(token, publicKey, { algorithms: ['RS256'], audience: audience, issuer: constant_1.ISSUER });
        return {
            decoded: decoded,
            message: 'token active',
            expired: false
        };
    }
    catch (error) {
        logger_1.winston_logger.error(error.message, error.stack);
        return {
            decoded: {},
            message: error.message,
            expired: error.message === 'jwt expired'
        };
    }
};
exports.verifyToken = verifyToken;
exports.refreshStore = new Map();
//# sourceMappingURL=generateTokens.js.map