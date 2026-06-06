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
import { stripeWebhook } from 'Controllers/bookingController';


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

const allowedOrigins = ['http://localhost:5173', 'https://care-connect-ena.netlify.app'];

app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1', routers)
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: "Welcome to CareConnect API" })
})


startServer(app);

app.use(errorHandler);
