import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import { cloudinaryDownloadUrl, documentForToken } from 'Services/adminDocumentService';
import { VerificationError } from 'Services/verificationService';

const CLIENT_ORIGINS = [process.env.DEV_CLIENT_URL, process.env.PROD_CLIENT_URL].filter(Boolean).join(' ');

/**
 * GET /api/v1/files/admin-documents/:token/:fileName(.pdf)
 * Streams an admin-only PDF. No auth header: the token in the path is the
 * permission, so <iframe src> and react-pdf work with the URL as is.
 */
export const streamAdminDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const doc = await documentForToken(String(req.params.token));
        const upstream = await axios.get(cloudinaryDownloadUrl(doc), { responseType: 'stream' });

        // Helmet blocks framing by default; let the CareConnect site embed this file.
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${CLIENT_ORIGINS}`);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${doc.fileName.replace(/"/g, '')}"`);
        res.setHeader('Cache-Control', 'private, no-store');
        if (upstream.headers['content-length']) res.setHeader('Content-Length', String(upstream.headers['content-length']));
        upstream.data.pipe(res);
    } catch (error) {
        if (error instanceof VerificationError) {
            res.status(error.statusCode).json({ status: false, message: error.message });
            return;
        }
        next(error);
    }
};
