import express from 'express';
import { sanitizedUser } from 'Middleware/sanitized';
import { bookingSessionController, getBookingBySession } from 'Controllers/Bookings/StripeBookingController';
import { flutterInitialPayment, verifyFlutterwavePayment } from 'Controllers/Bookings/flutterwaveBookingController';

const router = express.Router();

router.get('/flutterwave/verify', sanitizedUser, verifyFlutterwavePayment);
router.post('/flutterwave', sanitizedUser, flutterInitialPayment);
router.post('/checkout-session/:doctorId', sanitizedUser, bookingSessionController);
router.get('/session/:sessionId', sanitizedUser, getBookingBySession);

export default router;