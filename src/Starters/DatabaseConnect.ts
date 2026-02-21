import { log } from "utils/logger";
import mongoose from "mongoose";



export const connectDB = async () => {
    try {

        mongoose.set('strictQuery', true);
        mongoose.connection.on('error', (err) => {
            log(`Mongoose runtime error, ${err.message}`)
        })

        await mongoose.connect(process.env.MONGO_URI as string)

        log(`MongoDB: ${mongoose.connection.readyState === 1 ? true : false}`)
    }
    catch (error: any) {
        console.log('Database connection error:', error.message);
        throw new Error('DB Connection Failed');
    }
}