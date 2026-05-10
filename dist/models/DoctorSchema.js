"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importDefault(require("mongoose"));
var DoctorSchema = new mongoose_1.default.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    verified: { type: Boolean, default: false },
    phone: { type: String },
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
    ticketPrice: { type: Number },
    role: {
        type: String,
        enum: ["doctor", "admin"],
        default: "doctor",
    },
    id: { type: String },
    // Fields for doctors only
    specialization: { type: String },
    qualifications: { type: [{ degree: String, university: String, startDate: String, endDate: String }], default: [] },
    experiences: {
        type: [{ hospital: String, position: String, startDate: String, endDate: String }],
        default: []
    },
    bio: { type: String, maxLength: 50 },
    about: { type: String },
    timeSlots: { type: [{ startingTime: String, endingTime: String, day: String }], default: [] },
    reviews: [{ type: mongoose_1.default.Types.ObjectId, ref: "Review" }],
    averageRating: {
        type: Number,
        default: 0,
    },
    totalRating: {
        type: Number,
        default: 0,
    },
    isApproved: {
        type: String,
        enum: ["pending", "approved", "cancelled"],
        default: "pending",
    },
    gender: { type: String, enum: ['male', 'female'] },
    appointments: [{ type: mongoose_1.default.Types.ObjectId, ref: "Appointment" }],
}, { timestamps: true });
exports.default = mongoose_1.default.model("Doctor", DoctorSchema);
//# sourceMappingURL=DoctorSchema.js.map