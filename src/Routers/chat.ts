import { getChatHistory } from 'Controllers/Chat/chatHistoryController';
import express from 'express';
import { sanitizedUser } from 'Middleware/sanitized';
const router = express.Router();

router.post('/:otherUserId/history', sanitizedUser, getChatHistory);

export default router;