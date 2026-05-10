import { Request, Response } from 'express'
import { createReviewServices, getAllReviewServices } from 'Services/reviewServices'
import { ReviewBodyInterface } from 'types'
import mongoose from 'mongoose'


export const getAllReviews = async (req: Request, res: Response) => {

    const { error, data, message } = await getAllReviewServices()

    if (error) {
        res.status(404).json({ message, status: 'failed' });
        return;
    }

    res.status(200).json({ message, status: 'successful', data })
}

export const createReview = async (req: Request, res: Response) => {
    const doctorId = req.params.doctorId;
    const { id } = res.locals.auth

    // if (id === doctorId) {
    //     res.status(403).json({ message: 'Doctors cannot review themselves', status: false })
    //     return;
    // };

    console.log({ 'type of doctorId': typeof doctorId });
    console.log({ 'type of id': typeof id });


    const body: ReviewBodyInterface = {
        doctor: new mongoose.Types.ObjectId(doctorId),
        user: new mongoose.Types.ObjectId(id),
        ...req.body
    }

    const { error, data, message } = await createReviewServices(body)

    if (error) {
        res.status(500).json({ message, status: false })
        return;
    }

    res.status(200).json({ message, status: true, data });

}

