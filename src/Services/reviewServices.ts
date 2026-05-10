import Review from 'models/ReviewSchema'
import Doctor from 'models/DoctorSchema'
import { winston_logger } from '@utils/logger'
import { ReviewBodyInterface } from 'types'

export const getAllReviewServices = async () => {

    try {
        const reviews = await Review.find()
        if (!reviews) throw new Error('could not get reviews')

        return { data: reviews, message: 'review fetched successfully' }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}

export const createReviewServices = async (body: ReviewBodyInterface) => {

    try {
        const newReviews = new Review(body)

        const savedReview = await newReviews.save();

        console.log('saved review:', savedReview);

        await Doctor.findByIdAndUpdate(body.doctor, {
            $push: { reviews: savedReview._id }
        })

        if (!savedReview) throw new Error('could not create review');

        const populatedReview = await savedReview.populate({
            path: 'user',
            select: 'name photo'
        });

        console.log('populated review:', populatedReview);

        return { data: populatedReview, message: 'review created successfully' }

    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}