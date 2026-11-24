import { NextFunction, Request, Response } from 'express';
import { documentUpload } from 'config/documentStorage';
import {
    addDocument,
    deleteDocument,
    getDoctorForReview,
    getMyVerification,
    listDoctorsForReview,
    reviewDocument,
    setApproval,
    VerificationError,
} from 'Services/verificationService';
import { getAdminOverview } from 'Services/adminStatsService';

const authId = (res: Response) => String(res.locals.auth.id);

/** Runs a service call and maps VerificationError to its status code. */
const respond = async (res: Response, next: NextFunction, fn: () => Promise<unknown>) => {
    try {
        res.status(200).json({ status: true, data: await fn() });
    } catch (error) {
        if (error instanceof VerificationError) {
            res.status(error.statusCode).json({ status: false, message: error.message });
            return;
        }
        next(error);
    }
};

// ── Doctor ──────────────────────────────────────────────────────────

export const myVerification = (_req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => getMyVerification(authId(res)));

/** multipart/form-data: file, kind, expiresAt (YYYY-MM-DD, required for licences). */
export const uploadDocument = (req: Request, res: Response, next: NextFunction) => {
    documentUpload.single('file')(req, res, (err: unknown) => {
        if (err) {
            const message = (err as { code?: string }).code === 'LIMIT_FILE_SIZE' ? 'File is larger than 5 MB' : (err as Error).message;
            res.status(400).json({ status: false, message });
            return;
        }
        respond(res, next, () => addDocument(authId(res), { file: req.file, kind: req.body?.kind, expiresAt: req.body?.expiresAt }));
    });
};

export const removeDocument = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => deleteDocument(authId(res), req.params.documentId));

// ── Admin ───────────────────────────────────────────────────────────

export const adminListDoctors = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => listDoctorsForReview(typeof req.query.status === 'string' ? req.query.status : undefined));

export const adminGetDoctor = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => getDoctorForReview(req.params.id));

export const adminReviewDocument = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => reviewDocument(req.params.id, req.params.documentId, req.body));

export const adminSetApproval = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => setApproval(req.params.id, req.body, authId(res)));

/** GET /admin/overview?days=7|30|90|365 */
export const adminOverview = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => getAdminOverview(Number(req.query.days) || 30));
