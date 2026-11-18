import jwt from 'jsonwebtoken';
import { verifyToken } from '@utils/generateTokens';
import { winston_logger } from '@utils/logger';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import { getContactIds, isChatRole } from 'Services/chatService';
import { presence } from './presence';
import { registerChatHandlers } from './chatHandlers';
import { registerCallHandlers } from './callHandlers';
import { AppServer, AppSocket, userRoom } from './types';

const broadcastPresence = (io: AppServer, socket: AppSocket, online: boolean) => {
    const rooms = Array.from(socket.data.contacts, userRoom);
    if (rooms.length) io.to(rooms).emit('presence:update', { userId: socket.data.user.id, online });
};

export const registerSocketHandlers = (io: AppServer) => {
    // ── Auth: mirrors the sanitizedUser HTTP middleware ──────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token || typeof token !== 'string') return next(new Error('token not found'));

            const unverified = jwt.decode(token, { complete: true });
            if (!unverified) return next(new Error('Invalid token'));
            const { sub, aud } = unverified.payload as jwt.JwtPayload;

            const [user, doctor] = await Promise.all([
                User.findById(sub).select('name role refreshedToken').lean(),
                Doctor.findById(sub).select('name role refreshedToken').lean(),
            ]);
            const account = user || doctor;
            if (!account?.refreshedToken) return next(new Error('Refreshed token not found'));

            const { decoded, expired, message } = verifyToken(token, aud as string);
            if (message?.includes('jwt audience invalid')) return next(new Error('Invalid token'));
            if (!decoded || expired) return next(new Error(message ?? 'access token expired'));

            if (!isChatRole(account.role)) {
                return next(new Error('Chat is only available to patients and doctors'));
            }

            const self = { id: String(sub), name: account.name, role: account.role };
            socket.data.user = self;
            socket.data.contacts = new Set(await getContactIds(self));
            next();
        } catch (error: any) {
            winston_logger.error(error.message, error.stack);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const { id } = socket.data.user;
        socket.join(userRoom(id));

        registerChatHandlers(io, socket);
        registerCallHandlers(io, socket);

        if (presence.connect(id)) broadcastPresence(io, socket, true);

        socket.on('disconnect', () => {
            if (presence.disconnect(id)) broadcastPresence(io, socket, false);
        });
    });
};
