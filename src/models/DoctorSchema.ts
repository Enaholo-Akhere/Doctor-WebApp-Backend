import mongoose from "mongoose";
import { DoctorSchemaInterface } from "types";


const DoctorSchema = new mongoose.Schema<DoctorSchemaInterface>({
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
  qualifications: { type: [String] },

  experiences: {
    type: [String],
  },

  bio: { type: String, maxLength: 50 },
  about: { type: String },
  timeSlots: { type: [String], default: [] },
  reviews: [{ type: mongoose.Types.ObjectId, ref: "Review" }],
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
  appointments: [{ type: mongoose.Types.ObjectId, ref: "Appointment" }],
}, { timestamps: true });

export default mongoose.model("Doctor", DoctorSchema);
