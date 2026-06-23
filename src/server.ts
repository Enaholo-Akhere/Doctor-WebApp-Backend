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
import { flutterwaveWebhook } from 'Controllers/Bookings/flutterwaveBookingController';
import helmet from 'helmet';
import { app } from 'Starters/app';

// const app = express();
app.set('trust proxy', 1);

const PORT: number = Number(process.env.PORT) || 3000

const corsOptions = {
    origin: [process.env.DEV_CLIENT_URL || '', process.env.PROD_CLIENT_URL || ''],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

uncaughtException();

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());


app.post('/api/v1/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json());
app.post('/api/v1/flutterwave-webhook', flutterwaveWebhook);



app.use('/api/v1', routers);

app.get('/', async (req: Request, res: Response) => {

    res.status(200).json({ message: "Welcome to Care Connect API", '-V': "0.0.1" })

})


startServer();

app.use(errorHandler);
