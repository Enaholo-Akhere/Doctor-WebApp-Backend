import dotenv from 'dotenv';
dotenv.config();
import "tsconfig-paths/register";
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser'
import cors from 'cors';
import { connectDB } from "Starters/DatabaseConnect";
import { log } from "utils/logger";
import uncaughtException from 'utils/error_handler';
import routersS from 'Routers';
import "config/cloudinaryConfig";
import { startServer } from 'Starters/StartServer';
import { errorHandler } from 'Middleware/errorHandler';


const app = express()

const PORT: number = Number(process.env.PORT) || 3000

const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

uncaughtException()

// app.options('*', cors(corsOptions)) // Enable CORS pre-flight for all routes
app.use((req: Request, res: Response, next: NextFunction): void => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1', routersS)
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: "Welcome to the API" })
})

// connectDB()

// app.listen(PORT, () => {
//     log(`Server running on PORT ${PORT}`)
// });
startServer(app);

app.use(errorHandler);
