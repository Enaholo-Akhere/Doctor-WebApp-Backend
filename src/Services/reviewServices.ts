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

        const savedReview = await newReviews.save()

        await Doctor.findByIdAndUpdate(body.doctor, {
            $push: { reviews: savedReview._id }
        })

        if (!savedReview) throw new Error('could not create review')
        return { data: savedReview, message: 'review created successfully' }

    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return { error, message: error.message }
    }
}