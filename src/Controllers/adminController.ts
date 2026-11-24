import { NextFunction, Request, Response } from 'express';
import { respond } from './verificationController';
import { AccountRole, listAccounts, restoreAccount, softDeleteAccount, updateAccount } from 'Services/adminAccountsService';
import { listAdminMessages, sendAdminMessage } from 'Services/adminMessageService';

const adminId = (res: Response) => String(res.locals.auth.id);

// ── Accounts: /admin/accounts/:role (patient | doctor) ─────────────
const role = (req: Request) => req.params.role as AccountRole;

export const accountsList = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () =>
        listAccounts(role(req), {
            search: typeof req.query.search === 'string' ? req.query.search : '',
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            deleted: req.query.deleted === 'true',
        }),
    );

export const accountsUpdate = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => updateAccount(role(req), req.params.id, req.body));

export const accountsDelete = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => softDeleteAccount(role(req), req.params.id, adminId(res)));

export const accountsRestore = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => restoreAccount(role(req), req.params.id));

// ── Messages ────────────────────────────────────────────────────────
export const messagesList = (_req: Request, res: Response, next: NextFunction) => respond(res, next, () => listAdminMessages());

export const messagesSend = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, () => sendAdminMessage(req.body, adminId(res)));
