// Controllers/Chat/ChatController.ts
import { Request, Response } from 'express';
import { getRoomId } from 'utils/roomId';
import Message from 'models/messages';

export const getChatHistory = async (req: Request, res: Response) => {
    const { otherUserId } = req.params;

    const userId = res.locals.auth.id;
    const roomId = getRoomId(userId, otherUserId);

    const messages = await Message.find({ roomId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    res.json({ roomId, messages: messages.reverse() });
};