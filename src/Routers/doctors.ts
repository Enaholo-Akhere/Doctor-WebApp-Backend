import express from 'express';
import { sanitizedUser } from 'Middleware/sanitizedUser';
import validate from 'DTO_Validations/zod_validate';
import { updateUserSchema } from 'DTO_Validations/zod_schemas';
import { deleteDoctor, getAllDoctors, getDoctorById, getDoctorProfile, updateDoctor } from 'Controllers/doctorController';
import { restrict } from 'Middleware/auth';

const router = express.Router();

router.get('/', [sanitizedUser, restrict(['admin'])], getAllDoctors)
router.get('/:id', [sanitizedUser, restrict(['doctor', 'patient'])], getDoctorById)
router.put('/:id', [sanitizedUser, restrict(['doctor']), validate(updateUserSchema)], updateDoctor)
router.delete('/:id', [sanitizedUser, restrict(['doctor'])], deleteDoctor)
router.get('/profile/me', [sanitizedUser, restrict(['doctor'])], getDoctorProfile)

export default router;