import { Application } from 'express';
import { connectDB } from './DatabaseConnect';
import { log } from '@utils/logger';

const PORT: number = Number(process.env.PORT) || 3000

export const startServer = async (app: Application) => {
    try {
        await connectDB()
        app.listen(PORT, () => {
            log(`Server running on PORT ${PORT}`)
        })
    }
    catch (error: any) {
        log(`failed to load server, ${error}`)
        process.exit(1);
    }
}