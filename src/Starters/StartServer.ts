import { connectDB } from './DatabaseConnect';
import { log } from '@utils/logger';
import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { registerSocketHandlers } from './sockets/registerSocketHandlers';
const PORT: number = Number(process.env.PORT) || 3000;

const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: [process.env.DEV_CLIENT_URL || '', process.env.PROD_CLIENT_URL || ''],
        methods: ['GET', 'POST']
    }
});


export const startServer = async () => {

    registerSocketHandlers(io);

    try {

        await connectDB()
        server.listen(PORT, () => {
            log(`Server running on PORT ${PORT}`)
        })
    }
    catch (error: any) {
        log(`failed to load server, ${error}`)
        process.exit(1);
    }
}