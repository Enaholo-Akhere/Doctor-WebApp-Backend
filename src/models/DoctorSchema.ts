import mongoose from "mongoose";
import { DoctorSchemaInterface } from "types";
import { uniqueDoctorSlug } from "@utils/doctorSlug";


const DoctorSchema = new mongoose.Schema<DoctorSchemaInterface>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  // Public profile URL: /doctors/<slug>. Set on save; see uniqueDoctorSlug.
  slug: { type: String, unique: true, sparse: true },
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
  refreshedToken: { type: String },
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
  gender: { type: String, enum: ['male', 'female', 'other'] },
  appointments: [{ type: mongoose.Types.ObjectId, ref: "Booking" }],
}, { timestamps: true });

// New doctors get a slug at sign-up. Profile edits go through
// findByIdAndUpdate, which skips this hook, so updateDoctorService sets it there.
DoctorSchema.pre("save", async function () {
  if (this.slug && !this.isModified("name") && !this.isModified("specialization")) return;
  this.slug = await uniqueDoctorSlug(this.constructor as mongoose.Model<any>, this.name, this.specialization, this._id);
});

export default mongoose.model("Doctor", DoctorSchema);
