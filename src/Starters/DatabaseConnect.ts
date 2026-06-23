import { log, winston_logger } from "utils/logger";
import mongoose from "mongoose";



export const connectDB = async () => {
    try {

        mongoose.set('strictQuery', true);
        mongoose.connection.on('error', (err) => {
            log(`Mongoose runtime error, ${err.message}`)
        })

        const monCon = await mongoose.connect(process.env.MONGO_URI as string);

        log(`MongoDB: ${mongoose.connection.readyState === 1 ? true : false}`)
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack);
        process.exit(1);
    }
}