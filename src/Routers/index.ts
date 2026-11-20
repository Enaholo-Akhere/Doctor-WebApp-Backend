import authRoutes from 'Routers/auth';
import userRoutes from 'Routers/users';
import doctorRoutes from 'Routers/doctors';
import reviewRoutes from './review';
import bookingRoutes from './booking';
import chatRoutes from './chat';
import pushRoutes from './push';
import aiChatRoutes from 'ai-chat/aiChat.routes';

import express from 'express'

const router = express.Router()

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/doctors', doctorRoutes);
router.use('/reviews', reviewRoutes);
router.use('/bookings', bookingRoutes);
router.use('/chat', chatRoutes);
router.use('/push', pushRoutes);
router.use('/ai-chat', aiChatRoutes);

export default router;