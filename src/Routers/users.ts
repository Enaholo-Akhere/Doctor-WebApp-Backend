import express from 'express';
import { deleteMyAccount, updateMyHealthProfile, deleteUser, getAllUsers, getMyAppointments, getMyProfile, getUserById, updateUser } from 'Controllers/userController';
import { sanitizedUser } from 'Middleware/sanitized';
import validate from 'DTO_Validations/zod_validate';
import { healthProfileSchema, updateUserSchema } from 'DTO_Validations/zod_schemas';
import { restrict } from 'Middleware/auth';
import { upload } from 'config/cloudStorageMulter';
import { validateImage } from 'Middleware/validateImage';
import { asyncHandler } from '@utils/asyncHandler';
import { multerErrorHandler } from 'Middleware/multerErrorHandler';

const router = express.Router();

router.get('/', [sanitizedUser, restrict(['admin'])], getAllUsers)
router.get('/:id', [sanitizedUser, restrict(['patient'])], getUserById)
router.patch('/me/health', [sanitizedUser, restrict(['patient']), validate(healthProfileSchema)], asyncHandler(updateMyHealthProfile))
router.delete('/me', [sanitizedUser, restrict(['patient'])], asyncHandler(deleteMyAccount))
router.put('/:id', [sanitizedUser, restrict(['patient']), upload.single('photo'), multerErrorHandler, validateImage, validate(updateUserSchema)], asyncHandler(updateUser))
router.delete('/:id', [sanitizedUser, restrict(['patient'])], deleteUser)
router.get('/profile/me/:id', [sanitizedUser, restrict(['patient'])], getMyProfile);

export default router;