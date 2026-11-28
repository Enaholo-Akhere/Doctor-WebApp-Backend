import express from 'express';
import { streamAdminDocument } from 'Controllers/adminDocumentFileController';

/** File links that carry their own short-lived token instead of an auth header. */
const router = express.Router();

router.get('/admin-documents/:token/:fileName', streamAdminDocument);

export default router;
