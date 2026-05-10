"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var auth_1 = __importDefault(require("Routers/auth"));
var users_1 = __importDefault(require("Routers/users"));
var doctors_1 = __importDefault(require("Routers/doctors"));
var review_1 = __importDefault(require("./review"));
var express_1 = __importDefault(require("express"));
var router = express_1.default.Router();
router.use('/auth', auth_1.default);
router.use('/users', users_1.default);
router.use('/doctors', doctors_1.default);
router.use('/reviews', review_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map