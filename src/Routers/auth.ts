
import { login, logout, refreshToken, register, verifyEmail, forgotPassword, setPassword } from 'Controllers/authController';
import { forgotPasswordSchema, loginUserSchema, registerUserSchema, setPasswordSchema, verifyEmailSchema } from 'DTO_Validations/zod_schemas';
import validate from 'DTO_Validations/zod_validate';
import express from 'express';
import { upload } from 'config/cloudStorageMulter';
import { validateImage } from 'Middleware/validateImage';
import { asyncHandler } from '@utils/asyncHandler';
import { multerErrorHandler } from 'Middleware/multerErrorHandler';
import { sanitizedUser } from 'Middleware/sanitized';
import { geolocation } from 'Controllers/geolocationController';


const router = express.Router();

router.post('/register', [upload.single('photo'), multerErrorHandler, validateImage, validate(registerUserSchema)], asyncHandler(register));
router.post('/login', validate(loginUserSchema), login)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/set-password', validate(setPasswordSchema), setPassword);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.put('/logout', sanitizedUser, logout);
router.get('/geolocation', geolocation);
router.post('/refresh-token', refreshToken);

export default router;