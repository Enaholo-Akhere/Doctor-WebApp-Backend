import { getAllReviews, createReview } from "Controllers/reviewController";
import express from "express";
import { sanitizedUser } from "Middleware/sanitizedUser";
import validate from "DTO_Validations/zod_validate";
import { restrict } from "Middleware/auth";
import { reviewSchema } from "DTO_Validations/zod_schemas";

const router = express.Router();

router.get("/", [sanitizedUser], getAllReviews);
router.post(
    "/:doctorId", [sanitizedUser, restrict(['patient',]), validate(reviewSchema)], createReview)

export default router;