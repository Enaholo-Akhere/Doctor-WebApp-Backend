import dotenv from 'dotenv';
dotenv.config();
import "tsconfig-paths/register";
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser'
import cors from 'cors';
import uncaughtException from 'utils/error_handler';
import routers from 'Routers';
import "config/cloudinaryConfig";
import { startServer } from 'Starters/StartServer';
import { errorHandler } from 'Middleware/errorHandler';
import { stripeWebhook } from 'Controllers/Bookings/StripeBookingController';


const app = express()

const PORT: number = Number(process.env.PORT) || 3000

const corsOptions = {
    origin: ['http://localhost:5173', 'https://care-connect-ena.netlify.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

uncaughtException();


app.post('/api/v1/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1', routers);

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: "Welcome to CareConnect API" })
})


startServer(app);

app.use(errorHandler);
