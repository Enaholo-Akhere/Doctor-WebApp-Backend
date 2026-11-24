import express from 'express';
import { sanitizedUser } from 'Middleware/sanitized';
import { restrict } from 'Middleware/auth';
import validate from 'DTO_Validations/zod_validate';
import { accountParamsSchema, reviewDocumentSchema, sendMessageSchema, setApprovalSchema, updateAccountSchema } from 'DTO_Validations/zod_schemas';
import { accountsDelete, accountsList, accountsRestore, accountsUpdate, messagesList, messagesSend } from 'Controllers/adminController';
import { adminGetDoctor, adminListDoctors, adminOverview, adminReviewDocument, adminSetApproval } from 'Controllers/verificationController';

/** Admin-only. Admin accounts are made with `npm run make-admin -- <email>`; nobody can sign up as one. */
const router = express.Router();
router.use(sanitizedUser, restrict(['admin']));

router.get('/overview', adminOverview);
router.get('/doctors', adminListDoctors);
router.get('/doctors/:id', adminGetDoctor);
router.patch('/doctors/:id/documents/:documentId', validate(reviewDocumentSchema), adminReviewDocument);
router.patch('/doctors/:id/approval', validate(setApprovalSchema), adminSetApproval);

// Patient and doctor accounts (role = patient | doctor)
router.get('/accounts/:role', validate(accountParamsSchema), accountsList);
router.patch('/accounts/:role/:id', validate(updateAccountSchema), accountsUpdate);
router.delete('/accounts/:role/:id', validate(accountParamsSchema), accountsDelete);
router.post('/accounts/:role/:id/restore', validate(accountParamsSchema), accountsRestore);

// Email to patients and doctors
router.get('/messages', messagesList);
router.post('/messages', validate(sendMessageSchema), messagesSend);

export default router;
