import mongoose from "mongoose";
import { ReviewSchemaInterface } from "types";


const reviewSchema = new mongoose.Schema<ReviewSchemaInterface>(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewText: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
