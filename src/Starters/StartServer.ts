import { connectDB } from './DatabaseConnect';
import { log } from '@utils/logger';
import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { registerSocketHandlers } from './sockets/registerSocketHandlers';
import { AppServer } from './sockets/types';
import { startAiChatCleanupJob } from 'ai-chat/services/aiChatCleanup';
const PORT: number = Number(process.env.PORT) || 3000;

const server = http.createServer(app);

export const io: AppServer = new Server(server, {
    cors: {
        origin: [process.env.DEV_CLIENT_URL, process.env.PROD_CLIENT_URL].filter((o): o is string => Boolean(o)),
        methods: ['GET', 'POST'],
        credentials: true,
    },
});


// Lets REST controllers emit socket events (req.app.get('io')).
app.set('io', io);

export const startServer = async () => {

    registerSocketHandlers(io);

    try {

        await connectDB()
        startAiChatCleanupJob();
        server.listen(PORT, () => {
            log(`Server running on PORT ${PORT}`)
        })
    }
    catch (error: any) {
        log(`failed to load server, ${error}`)
        process.exit(1);
    }
}