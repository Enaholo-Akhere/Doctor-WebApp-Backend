import express from 'express';
import { sanitizedUser } from 'Middleware/sanitized';
import validate from 'DTO_Validations/zod_validate';
import { deleteDoctor, getAllDoctors, getDoctorById, getDoctorProfile, updateDoctor } from 'Controllers/doctorController';
import { restrict } from 'Middleware/auth';
import { updateDoctorSchema } from 'DTO_Validations/zod_schemas';
import { multerErrorHandler } from 'Middleware/multerErrorHandler';
import { validateImage } from 'Middleware/validateImage';
import { upload } from 'config/cloudStorageMulter';
import { asyncHandler } from '@utils/asyncHandler';

const router = express.Router();

router.get('/', getAllDoctors);
router.get('/:id', [sanitizedUser, restrict(['doctor', 'patient', 'admin'])], getDoctorById)
router.put('/:id', [upload.single('photo'), multerErrorHandler, validateImage, sanitizedUser, restrict(['doctor']), validate(updateDoctorSchema)], asyncHandler(updateDoctor))

router.delete('/:id', [sanitizedUser, restrict(['doctor'])], deleteDoctor)
router.get('/profile/me/:id', [sanitizedUser, restrict(['doctor'])], getDoctorProfile)

export default router;