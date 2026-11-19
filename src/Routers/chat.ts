import express from 'express';
import { getConversations, getIceServers, getMessages, sendAttachment } from 'Controllers/Chat/chatController';
import { chatUpload, MAX_FILE_BYTES } from 'Services/chatAttachmentService';
import { appError } from '@utils/appError';
import { sanitizedUser } from 'Middleware/sanitized';
import { asyncHandler } from '@utils/asyncHandler';

const router = express.Router();

router.get('/conversations', sanitizedUser, asyncHandler(getConversations));
router.get('/ice-servers', sanitizedUser, getIceServers);
router.get('/:otherUserId/messages', sanitizedUser, asyncHandler(getMessages));

// Auth runs before multer so unauthenticated uploads are never buffered.
const uploadFile: express.RequestHandler = (req, res, next) =>
    chatUpload.single('file')(req, res, (err: unknown) => {
        if (!err) return next();
        const code = (err as { code?: string }).code;
        const message =
            code === 'LIMIT_FILE_SIZE'
                ? `File is too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`
                : 'Could not read the uploaded file';
        next(appError({ message, statusCode: 400 }));
    });

router.post('/:otherUserId/attachments', sanitizedUser, uploadFile, asyncHandler(sendAttachment));

export default router;
