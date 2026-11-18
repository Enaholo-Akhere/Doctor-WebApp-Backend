import express from 'express';
import { getConversations, getIceServers, getMessages } from 'Controllers/Chat/chatController';
import { sanitizedUser } from 'Middleware/sanitized';
import { asyncHandler } from '@utils/asyncHandler';

const router = express.Router();

router.get('/conversations', sanitizedUser, asyncHandler(getConversations));
router.get('/ice-servers', sanitizedUser, getIceServers);
router.get('/:otherUserId/messages', sanitizedUser, asyncHandler(getMessages));

export default router;
