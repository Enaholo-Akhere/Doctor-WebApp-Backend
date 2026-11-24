import express from 'express';
import { sanitizedUser } from 'Middleware/sanitized';
import validate from 'DTO_Validations/zod_validate';
import { deleteMyDoctorAccount, updateMyBookingStatus, deleteDoctor, getAllDoctors, getDoctorById, getDoctorProfile, updateDoctor } from 'Controllers/doctorController';
import { restrict } from 'Middleware/auth';
import { bookingStatusSchema, updateDoctorSchema } from 'DTO_Validations/zod_schemas';
import { multerErrorHandler } from 'Middleware/multerErrorHandler';
import { validateImage } from 'Middleware/validateImage';
import { upload } from 'config/cloudStorageMulter';
import { asyncHandler } from '@utils/asyncHandler';
import { myVerification, removeDocument, uploadDocument } from 'Controllers/verificationController';

const router = express.Router();

router.get('/', getAllDoctors);
// The signed-in doctor's own verification documents.
router.get('/me/verification', [sanitizedUser, restrict(['doctor'])], myVerification)
router.post('/me/documents', [sanitizedUser, restrict(['doctor'])], uploadDocument)
router.delete('/me/documents/:documentId', [sanitizedUser, restrict(['doctor'])], removeDocument)
router.get('/:id', getDoctorById);
router.patch('/me/appointments/:bookingId/status', [sanitizedUser, restrict(['doctor']), validate(bookingStatusSchema)], asyncHandler(updateMyBookingStatus))
router.delete('/me', [sanitizedUser, restrict(['doctor'])], asyncHandler(deleteMyDoctorAccount))
router.put('/:id', [sanitizedUser, restrict(['doctor']), upload.single('photo'), multerErrorHandler, validateImage, validate(updateDoctorSchema)], asyncHandler(updateDoctor))
router.delete('/:id', [sanitizedUser, restrict(['doctor'])], deleteDoctor)
router.get('/profile/me/:id', [sanitizedUser, restrict(['doctor'])], getDoctorProfile)

export default router;