import "tsconfig-paths/register";
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'
import cors from 'cors';
import { connectDB } from "Starters/DatabaseConnect";
import { log } from "utils/logger";
import uncaughtException from 'utils/error_handler';
import routersS from 'Routers';


dotenv.config();


const app = express()

const PORT: number = Number(process.env.PORT) || 3000

const corsOptions = {
    origin: true
}

uncaughtException()

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use('/api/v1', routersS)
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: "Welcome to the API" })
})

app.listen(PORT, () => {
    connectDB();
    log(`App running on PORT: ${PORT}`)
})