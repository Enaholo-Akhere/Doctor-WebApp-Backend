import express from 'express';
import { sanitizedUser } from 'Middleware/sanitized';
import { bookingSessionController, getBookingBySession } from 'Controllers/Bookings/StripeBookingController';
import { flutterInitialPayment, flutterwaveWebhook, verifyFlutterwavePayment } from 'Controllers/Bookings/flutterwaveBookingController';

const router = express.Router();

// router.post('flutterwave/webhook', flutterwaveWebhook);
router.get('/flutterwave/verify/:doctorId', sanitizedUser, verifyFlutterwavePayment);
router.post('/flutterwave/:doctorId', sanitizedUser, flutterInitialPayment);
router.post('/checkout-session/:doctorId', sanitizedUser, bookingSessionController);
router.get('/session/:sessionId', sanitizedUser, getBookingBySession);

export default router;