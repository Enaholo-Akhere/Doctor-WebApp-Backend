import authRoutes from 'Routers/auth'
import userRoutes from 'Routers/users'
import doctorRoutes from 'Routers/doctors'
import reviewRoutes from './review'
import express from 'express'

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/doctors', doctorRoutes)
router.use('/reviews', reviewRoutes)

export default router