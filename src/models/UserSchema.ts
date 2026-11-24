import mongoose from "mongoose";
import { UserSchemaInterface } from "types";


const UserSchema = new mongoose.Schema<UserSchemaInterface>({
  id: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  verified: { type: Boolean, default: false },
  refreshedToken: { type: String },
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
  // Soft delete by an admin: the account can't log in, is hidden from the
  // public site and admin lists by default, and can be restored.
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Types.ObjectId, ref: "User" },
  bloodType: { type: String },
  // Health profile (patient-maintained, shown to their doctors)
  dateOfBirth: { type: Date },
  address: { type: String, trim: true, maxlength: 200 },
  heightCm: { type: Number, min: 30, max: 272 },
  weightKg: { type: Number, min: 1, max: 500 },
  genotype: { type: String, enum: ["AA", "AS", "AC", "SS", "SC", "CC"] },
  allergies: { type: [String], default: [] },
  chronicConditions: { type: [String], default: [] },
  medications: { type: [String], default: [] },
  emergencyContact: {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  appointments: [{ type: mongoose.Types.ObjectId, ref: "Booking" }],
},
  { timestamps: true });

export default mongoose.model("User", UserSchema);
