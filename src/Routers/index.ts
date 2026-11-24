import authRoutes from 'Routers/auth';
import userRoutes from 'Routers/users';
import doctorRoutes from 'Routers/doctors';
import reviewRoutes from './review';
import bookingRoutes from './booking';
import chatRoutes from './chat';
import pushRoutes from './push';
import consultationRoutes from './consultations';
import aiChatRoutes from 'ai-chat/aiChat.routes';
import adminRoutes from './admin';

import express from 'express'

const router = express.Router()

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/doctors', doctorRoutes);
router.use('/reviews', reviewRoutes);
router.use('/bookings', bookingRoutes);
router.use('/chat', chatRoutes);
router.use('/push', pushRoutes);
router.use('/consultations', consultationRoutes);
router.use('/ai-chat', aiChatRoutes);
router.use('/admin', adminRoutes);

export default router;