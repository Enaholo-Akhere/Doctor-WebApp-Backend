import { log } from "utils/logger";
import mongoose from "mongoose";



export const connectDB = async () => {
    try {

        mongoose.set('strictQuery', true);
        await mongoose.connect(process.env.MONGO_URI as string)
        log(`MongoDB database Connected`)
    }
    catch (error: any) {
        log(`Error: ${error.message}`)
        process.exit(1)
    }
}