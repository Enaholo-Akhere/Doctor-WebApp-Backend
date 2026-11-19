import express from 'express';
import { getPublicKey, subscribe, unsubscribe } from 'Controllers/Push/pushController';
import { sanitizedUser } from 'Middleware/sanitized';
import { asyncHandler } from '@utils/asyncHandler';

const router = express.Router();

router.get('/public-key', getPublicKey);
router.post('/subscribe', sanitizedUser, asyncHandler(subscribe));
router.post('/unsubscribe', sanitizedUser, asyncHandler(unsubscribe));

export default router;
