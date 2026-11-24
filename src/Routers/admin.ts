import express from 'express';
import { sanitizedUser } from 'Middleware/sanitized';
import { restrict } from 'Middleware/auth';
import validate from 'DTO_Validations/zod_validate';
import { reviewDocumentSchema, setApprovalSchema } from 'DTO_Validations/zod_schemas';
import { adminGetDoctor, adminListDoctors, adminOverview, adminReviewDocument, adminSetApproval } from 'Controllers/verificationController';

/** Admin-only. Admin accounts are made with `npm run make-admin -- <email>`; nobody can sign up as one. */
const router = express.Router();
router.use(sanitizedUser, restrict(['admin']));

router.get('/overview', adminOverview);
router.get('/doctors', adminListDoctors);
router.get('/doctors/:id', adminGetDoctor);
router.patch('/doctors/:id/documents/:documentId', validate(reviewDocumentSchema), adminReviewDocument);
router.patch('/doctors/:id/approval', validate(setApprovalSchema), adminSetApproval);

export default router;
