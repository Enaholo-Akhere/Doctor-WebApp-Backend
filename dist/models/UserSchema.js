"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importDefault(require("mongoose"));
var UserSchema = new mongoose_1.default.Schema({
    id: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    verified: { type: Boolean, default: false },
    photo: {
        imageUrl: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
            required: true,
        },
    },
    role: {
        type: String,
        enum: ["patient", "admin", "doctor"],
        default: "patient",
    },
    gender: { type: String, enum: ["male", "female", "other"] },
    bloodType: { type: String },
    appointments: [{ type: mongoose_1.default.Types.ObjectId, ref: "Appointment" }],
}, { timestamps: true });
exports.default = mongoose_1.default.model("User", UserSchema);
//# sourceMappingURL=UserSchema.js.map