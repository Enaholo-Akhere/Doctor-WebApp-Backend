
import mongoose from "mongoose";
import { BookSchemaInterface } from "types";

const bookingSchema = new mongoose.Schema<BookSchemaInterface>(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ticketPrice: { type: String, required: true },
    stripeSessionId: { type: String, required: true }, // ✅ add this
    status: {
      type: String,
      enum: ["pending", "approved", "cancelled"],
      default: "pending",
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);