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

reviewSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
  this.populate({
    path: "user",
    select: 'name photo'
  });
  next();
});

export default mongoose.model("Review", reviewSchema);
