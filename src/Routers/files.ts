import express from 'express';
import { streamAdminDocument } from 'Controllers/adminDocumentFileController';

/** Permanent file links: a random key in the path instead of an auth header. */
const router = express.Router();

router.get('/admin-documents/:accessKey/:fileName', streamAdminDocument);

export default router;
