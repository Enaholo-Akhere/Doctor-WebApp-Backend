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
var mongoose_1 = __importDefault(require("mongoose"));
var DoctorSchema_1 = __importDefault(require("./DoctorSchema"));
var reviewSchema = new mongoose_1.default.Schema({
    doctor: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Doctor" },
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" },
    reviewText: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5, default: 0 },
}, { timestamps: true });
reviewSchema.pre(/^find/, function (next) {
    var query = this;
    query.populate({
        path: 'user',
        select: 'name photo'
    });
    next();
});
reviewSchema.statics.calculateAverageRating = function (doctorId) {
    return __awaiter(this, void 0, void 0, function () {
        var stats;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.aggregate([
                        { $match: { doctor: new mongoose_1.default.Types.ObjectId(doctorId) } },
                        {
                            $group: {
                                _id: '$doctor',
                                avgRating: { $avg: '$rating' },
                                numOfRating: { $sum: 1 }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                avgRating: { $round: ['$avgRating', 1] },
                                numOfRating: 1
                            }
                        }
                    ])];
                case 1:
                    stats = _a.sent();
                    return [4 /*yield*/, DoctorSchema_1.default.findByIdAndUpdate(doctorId, {
                            totalRating: stats.length > 0 ? stats[0].numOfRating : 0,
                            averageRating: stats.length > 0 ? stats[0].avgRating : 0,
                        }).exec()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
reviewSchema.post('save', function () {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // cast constructor to any to access the custom static and await the calculation
                return [4 /*yield*/, this.constructor.calculateAverageRating(this.doctor)];
                case 1:
                    // cast constructor to any to access the custom static and await the calculation
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
});
exports.default = mongoose_1.default.model("Review", reviewSchema);
//# sourceMappingURL=ReviewSchema.js.map