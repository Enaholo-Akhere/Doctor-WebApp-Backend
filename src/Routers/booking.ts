import express from 'express';
import { sanitizedUser } from 'Middleware/sanitized';
import { bookingSessionController, getBookingBySession } from 'Controllers/bookingController';

const router = express.Router();


router.post('/checkout-session/:doctorId', sanitizedUser, bookingSessionController);
router.get('/session/:sessionId', sanitizedUser, getBookingBySession);

export default router;