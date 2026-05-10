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
exports.createReviewServices = exports.getAllReviewServices = void 0;
var ReviewSchema_1 = __importDefault(require("models/ReviewSchema"));
var DoctorSchema_1 = __importDefault(require("models/DoctorSchema"));
var logger_1 = require("@utils/logger");
var getAllReviewServices = function () { return __awaiter(void 0, void 0, void 0, function () {
    var reviews, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, ReviewSchema_1.default.find()];
            case 1:
                reviews = _a.sent();
                if (!reviews)
                    throw new Error('could not get reviews');
                return [2 /*return*/, { data: reviews, message: 'review fetched successfully' }];
            case 2:
                error_1 = _a.sent();
                logger_1.winston_logger.error(error_1.message, error_1.stack);
                return [2 /*return*/, { error: error_1, message: error_1.message }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getAllReviewServices = getAllReviewServices;
var createReviewServices = function (body) { return __awaiter(void 0, void 0, void 0, function () {
    var newReviews, savedReview, populatedReview, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                newReviews = new ReviewSchema_1.default(body);
                return [4 /*yield*/, newReviews.save()];
            case 1:
                savedReview = _a.sent();
                console.log('saved review:', savedReview);
                return [4 /*yield*/, DoctorSchema_1.default.findByIdAndUpdate(body.doctor, {
                        $push: { reviews: savedReview._id }
                    })];
            case 2:
                _a.sent();
                if (!savedReview)
                    throw new Error('could not create review');
                return [4 /*yield*/, savedReview.populate({
                        path: 'user',
                        select: 'name photo'
                    })];
            case 3:
                populatedReview = _a.sent();
                console.log('populated review:', populatedReview);
                return [2 /*return*/, { data: populatedReview, message: 'review created successfully' }];
            case 4:
                error_2 = _a.sent();
                logger_1.winston_logger.error(error_2.message, error_2.stack);
                return [2 /*return*/, { error: error_2, message: error_2.message }];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.createReviewServices = createReviewServices;
//# sourceMappingURL=reviewServices.js.map