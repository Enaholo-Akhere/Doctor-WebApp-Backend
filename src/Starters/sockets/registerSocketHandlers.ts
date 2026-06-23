// Starters/socket/registerSocketHandlers.ts
import { Server, Socket } from 'socket.io';
import Message from 'models/messages';
import { getRoomId } from 'utils/roomId';
import { verifyToken } from '@utils/generateTokens';
import { winston_logger } from '@utils/logger';
// import { AUDIENCE } from 'config/constant';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import jwt from 'jsonwebtoken';

interface AuthSocket extends Socket {
    userId?: string;
    userName?: string;
    userRole?: string;
    audience?: string;
}

export const registerSocketHandlers = (io: Server) => {

    // ── Auth middleware — mirrors sanitizedUser exactly ─────────────
    io.use(async (socket: AuthSocket, next) => {
        try {
            // Read token from socket.handshake.auth (sent by frontend)
            const token = socket.handshake.auth?.token;

            if (!token) return next(new Error('token not found'));

            // 1. Decode without verifying — to extract sub + aud (your two-pass pattern)
            const unVerified = jwt.decode(token, { complete: true });

            if (!unVerified) return next(new Error('Invalid token'));

            const { sub, aud } = unVerified.payload as jwt.JwtPayload;

            // 2. DB lookup — check refreshedToken exists (same as your middleware)
            const [user, doctor] = await Promise.all([
                User.findById(sub),
                Doctor.findById(sub),
            ]);

            const user_doctor = user || doctor;

            if (!user_doctor?.refreshedToken) {
                return next(new Error('Refreshed token not found'));
            }

            // 3. Validate audience
            // const validAudiences = Object.values(AUDIENCE);

            // if (!validAudiences.includes(aud)) {
            //     return next(new Error('Invalid token'));
            // }

            // 4. Actually verify the token (your verifyToken util)
            const { decoded, expired, message } = verifyToken(token, aud as string);

            if (message?.includes('jwt audience invalid')) {
                return next(new Error('Invalid token'));
            }

            if (!decoded || expired) {
                return next(new Error(message ?? 'access token expired'));
            }

            // 5. Attach to socket (equivalent of res.locals.auth)
            socket.userId = sub as string;
            socket.userRole = user_doctor.role;
            socket.userName = user_doctor.name;
            socket.audience = aud as string;

            next();

        } catch (error: any) {
            winston_logger.error(error.message, error.stack);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket: AuthSocket) => {
        console.log(`[socket] ${socket.userName} (${socket.userRole}) connected`);

        // ── Join room ─────────────────────────────────────────────────
        socket.on('room:join', async ({ otherUserId }: { otherUserId: string }) => {
            const roomId = getRoomId(socket.userId!, otherUserId);
            socket.join(roomId);

            const history = await Message.find({ roomId })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            socket.emit('room:history', { roomId, messages: history.reverse() });
        });

        // ── Send message ──────────────────────────────────────────────
        socket.on('message:send', async ({
            otherUserId,
            content,
        }: {
            otherUserId: string;
            content: string;
        }) => {
            try {
                const roomId = getRoomId(socket.userId!, otherUserId);

                // Persist first, broadcast after
                const saved = await Message.create({
                    roomId,
                    senderId: socket.userId,
                    senderName: socket.userName,
                    senderRole: socket.userRole,
                    content,
                });

                io.to(roomId).emit('message:receive', saved.toObject());

            } catch (error: any) {
                winston_logger.error(error.message, error.stack);
                socket.emit('message:error', { message: 'Failed to send message' });
            }
        });

        // ── Typing indicators ─────────────────────────────────────────
        socket.on('typing:start', ({ otherUserId }: { otherUserId: string }) => {
            const roomId = getRoomId(socket.userId!, otherUserId);
            socket.to(roomId).emit('typing:update', {
                userId: socket.userId,
                userName: socket.userName,
                isTyping: true,
            });
        });

        socket.on('typing:stop', ({ otherUserId }: { otherUserId: string }) => {
            const roomId = getRoomId(socket.userId!, otherUserId);
            socket.to(roomId).emit('typing:update', {
                userId: socket.userId,
                userName: socket.userName,
                isTyping: false,
            });
        });

        // ── Disconnect ────────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`[socket] ${socket.userName} disconnected`);
        });
    });
};