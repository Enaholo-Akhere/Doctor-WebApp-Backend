import { Request, Response } from 'express'
import { createReviewServices, getAllReviewServices } from 'Services/reviewServices'
import { ReviewBodyInterface } from 'types'


export const getAllReviews = async (req: Request, res: Response) => {
    const { token, refreshedToken } = res.locals.auth

    const { error, data, message } = await getAllReviewServices()

    if (error) res.status(404).json({ message, status: 'failed' })

    const MAX_AGE = Number(process.env.MAX_AGE)
    res.cookie('refreshedToken', refreshedToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: MAX_AGE,
    })

    res.status(200).json({ message, status: 'successful', data, token })
}

export const createReview = async (req: Request, res: Response) => {


    const { token, refreshedToken, id } = res.locals.auth

    const body: ReviewBodyInterface = {
        doctor: req.params.doctorId,
        user: id,
        ...req.body
    }

    const { error, data, message } = await createReviewServices(body)

    if (error) res.status(500).json({ message, status: false })

    const MAX_AGE = Number(process.env.MAX_AGE)
    res.cookie('refreshedToken', refreshedToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: MAX_AGE,
    })

    res.status(200).json({ message, status: true, data, token })

}