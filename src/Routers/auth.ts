
import { login, logout, refreshToken, register, verifyEmail, forgotPassword, setPassword, resendVerification } from 'Controllers/authController';
import { forgotPasswordSchema, loginUserSchema, registerUserSchema, resendVerificationSchema, setPasswordSchema, verifyEmailSchema } from 'DTO_Validations/zod_schemas';
import rateLimit from 'express-rate-limit';
import validate from 'DTO_Validations/zod_validate';
import express from 'express';
import { upload } from 'config/cloudStorageMulter';
import { validateImage } from 'Middleware/validateImage';
import { asyncHandler } from '@utils/asyncHandler';
import { multerErrorHandler } from 'Middleware/multerErrorHandler';
import { sanitizedUser } from 'Middleware/sanitized';
import { geolocation } from 'Controllers/geolocationController';


const router = express.Router();

// Each resend sends a real email (and the Brevo plan has a daily cap), so keep it modest per IP.
const resendVerificationLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please wait a few minutes and try again.' },
});

router.post('/register', [upload.single('photo'), multerErrorHandler, validateImage, validate(registerUserSchema)], asyncHandler(register));
router.post('/login', validate(loginUserSchema), login)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/set-password', validate(setPasswordSchema), setPassword);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', resendVerificationLimit, validate(resendVerificationSchema), resendVerification);
router.put('/logout', sanitizedUser, logout);
router.get('/geolocation', geolocation);
router.post('/refresh-token', refreshToken);

export default router;