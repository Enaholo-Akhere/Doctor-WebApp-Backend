import mongoose from "mongoose";
import { UserSchemaInterface } from "types";


const UserSchema = new mongoose.Schema<UserSchemaInterface>({
  id: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  photo: { type: String },
  role: {
    type: String,
    enum: ["patient", "admin"],
    default: "patient",
  },
  gender: { type: String, enum: ["male", "female", "other"] },
  bloodType: { type: String },
  appointments: [{ type: mongoose.Types.ObjectId, ref: "Appointment" }],
},
  { timestamps: true });

export default mongoose.model("User", UserSchema);
