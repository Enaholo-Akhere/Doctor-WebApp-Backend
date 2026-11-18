import Review from 'models/ReviewSchema'
import Doctor from 'models/DoctorSchema'
import { winston_logger } from '@utils/logger'
import { ReviewBodyInterface } from 'types'

export const getAllReviewServices = async () => {

    try {
        const sampledSize = await Review.aggregate([
            { $sample: {size: 6}},
            { $project: { doctor: 0 } },
        ])

        const reviews = await Review.populate(sampledSize, {
        path: 'user',
        select: 'name photo'
    });

        if (!reviews) throw new Error('could not get reviews');

        console.log('reviews', reviews);

        return { data: reviews, message: 'review fetched successfully' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

export const createReviewServices = async (body: ReviewBodyInterface) => {

    try {
        const existingReview = await Review.findOne({ user: body.user,  });
        if (existingReview) {
            throw new Error('You have already reviewed this doctor');
        }
        const newReviews = new Review(body)

        const savedReview = await newReviews.save();


        await Doctor.findByIdAndUpdate(body.doctor, {
            $push: { reviews: savedReview._id }
        })

        if (!savedReview) throw new Error('could not create review');

        const populatedReview = await savedReview.populate({
            path: 'user',
            select: 'name photo'
        });

        return { data: populatedReview, message: 'review created successfully' }

    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}