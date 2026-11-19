import { handleError } from "@utils/handledError";
import { NextFunction, Request, Response } from "express";
import { updateBookingStatusService, deleteDoctorService, getDoctorByIdService, getDoctorProfileService, getDoctorService, updateDoctorService } from "Services/doctorService";
import { DoctorSchemaInterface } from "types";
import { sendToUser } from "Services/pushService";


export const getAllDoctors = async (req: Request, res: Response, next: NextFunction) => {

    const { search }: { search?: string } = req.query;

    const { error, data, message } = await getDoctorService(search)

    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ status: true, message, data })
}

export const getDoctorById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    const { data, message, error } = await getDoctorByIdService(id)

    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}

/** Doctors may only touch their own record. 404 (not 403) so the frontend doesn't treat it as a dead session. */
const isOwner = (req: Request, res: Response) => String(res.locals.auth?.id) === String(req.params.id)

export const updateDoctor = async (req: Request, res: Response, next: NextFunction) => {
    const body: DoctorSchemaInterface = req.body
    const { id } = req.params;
    const { photo } = res.locals;

    if (!isOwner(req, res)) {
        res.status(404).json({ message: 'doctor not found', status: false })
        return
    }


    let userData: Partial<DoctorSchemaInterface> = {}

    if (req.file) {
        userData = { ...body, photo: { imageUrl: req.file?.path, publicId: req?.file?.filename } }

    }

    if (!req.file) {
        userData = { ...body, photo }
    }

    const { data, message, error } = await updateDoctorService({ id, userData })

    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}

export const deleteDoctor = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    if (!id || !isOwner(req, res)) {
        res.status(404).json({ message: 'doctor not found', status: false })
        return
    }
    const { message, error } = await deleteDoctorService(id)

    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true })

}

export const getDoctorProfile = async (req: Request, res: Response, next: NextFunction) => {
    const doctorId = res.locals.auth.id

    const { data, message, error } = await getDoctorProfileService(doctorId)
    if (error) {
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })
}





export const updateMyBookingStatus = async (req: Request, res: Response, next: NextFunction) => {
    const doctorId = res.locals.auth.id
    const { bookingId } = req.params
    const { status } = req.body as { status: 'approved' | 'cancelled' }

    const { data, message, error } = await updateBookingStatusService(doctorId, bookingId, status)

    if (error) {
        if (error.message === 'booking not found') {
            res.status(404).json({ message: 'booking not found', status: false })
            return
        }
        return next(handleError(error))
    }

    res.status(200).json({ message, status: true, data })

    // Let the patient know (best effort; never blocks the response).
    const booking = data as any
    const patientId = booking?.user?._id?.toString()
    if (patientId) {
        const doctorName = booking.doctor?.name ?? 'Your doctor'
        sendToUser(patientId, {
            type: 'booking',
            title: status === 'approved' ? 'Appointment confirmed' : 'Appointment declined',
            body: status === 'approved'
                ? `${doctorName} confirmed your appointment.`
                : `${doctorName} could not take your appointment. You can book another doctor.`,
            tag: `booking-${bookingId}`,
            url: '/users/profile/me?tab=appointments',
        }, { ttl: 60 * 60 * 24, urgency: 'normal' }).catch(() => undefined)
    }
}

export const deleteMyDoctorAccount = async (req: Request, res: Response, next: NextFunction) => {
    const doctorId = res.locals.auth.id

    const { message, error } = await deleteDoctorService(doctorId)

    if (error) {
        return next(handleError(error))
    }

    res.clearCookie('refreshedToken', { httpOnly: true, secure: true, sameSite: 'strict' })
    res.status(200).json({ message, status: true })
}
