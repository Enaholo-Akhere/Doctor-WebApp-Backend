import { log } from "console";
import mongoose from "mongoose";
import { ReviewSchemaInterface } from "types";
import Doctor from "./DoctorSchema";


const reviewSchema = new mongoose.Schema<ReviewSchemaInterface>(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewText: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5, default: 0 },
  },
  { timestamps: true }
);

reviewSchema.pre(/^find/, function (next) {
  const query = this as mongoose.Query<any, any>;
  query.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

reviewSchema.statics.calculateAverageRating = async function (doctorId: string) {
  const stats = await this.aggregate([
    { $match: { doctor: new mongoose.Types.ObjectId(doctorId) } },
    {
      $group: {
        _id: '$doctor',
        avgRating: { $avg: '$rating' },
        numOfRating: { $sum: 1 }
      }
    }
  ]);

  await Doctor.findByIdAndUpdate(doctorId, {
    totalRating: stats.length > 0 ? stats[0].numOfRating : 0,
    averageRating: stats.length > 0 ? stats[0].avgRating : 0,
  }).exec();
}

reviewSchema.post('save', async function () {
  // cast constructor to any to access the custom static and await the calculation
  await (this.constructor as any).calculateAverageRating(this.doctor);
});

export default mongoose.model("Review", reviewSchema);
