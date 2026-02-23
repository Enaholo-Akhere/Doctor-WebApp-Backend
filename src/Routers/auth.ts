
import { login, refreshToken, register, verifyEmail } from 'Controllers/authController';
import { loginUserSchema, registerUserSchema, verifyEmailSchema } from 'DTO_Validations/zod_schemas';
import validate from 'DTO_Validations/zod_validate';
import express from 'express';
import { upload } from 'config/cloudStorageMulter';
import { validateImage } from 'Middleware/validateImage';
import { asyncHandler } from '@utils/asyncHandler';

const router = express.Router();

router.post('/register', [upload.single('photo'), validateImage, validate(registerUserSchema)], asyncHandler(register));
router.post('/login', validate(loginUserSchema), login)
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/refresh-token', refreshToken);

export default router;