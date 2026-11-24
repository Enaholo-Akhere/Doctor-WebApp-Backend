import mongoose from 'mongoose';
import escapeStringRegexp from 'escape-string-regexp';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import { VerificationError } from './verificationService';

/**
 * Admin management of patient and doctor accounts: list, edit a few
 * profile fields, soft delete and restore. Patients' health data is never
 * selected here; admins see contact details only.
 */

export type AccountRole = 'patient' | 'doctor';

const LIST_FIELDS = {
    patient: 'name email phone gender photo verified createdAt deletedAt appointments',
    doctor: 'name email phone gender photo verified createdAt deletedAt specialization ticketPrice bio isApproved slug averageRating totalRating appointments',
} as const;

/** Fields an admin may change. Email is excluded: it's the login, and changing it needs re-verification. */
const EDITABLE = {
    patient: ['name', 'phone', 'gender'],
    doctor: ['name', 'phone', 'gender', 'specialization', 'ticketPrice', 'bio'],
} as const;

const modelFor = (role: AccountRole) => (role === 'doctor' ? Doctor : User) as unknown as mongoose.Model<any>;
const baseFilter = (role: AccountRole) => (role === 'patient' ? { role: 'patient' } : {});

const toRow = (role: AccountRole, d: any) => ({
    _id: String(d._id),
    name: d.name,
    email: d.email,
    phone: d.phone ?? null,
    gender: d.gender ?? null,
    photo: d.photo?.imageUrl ?? null,
    verified: !!d.verified,
    createdAt: d.createdAt,
    deletedAt: d.deletedAt ?? null,
    bookings: d.appointments?.length ?? 0,
    ...(role === 'doctor' && {
        specialization: d.specialization ?? null,
        ticketPrice: d.ticketPrice ?? null,
        bio: d.bio ?? null,
        status: d.isApproved,
        slug: d.slug ?? null,
        rating: d.averageRating ?? 0,
        reviews: d.totalRating ?? 0,
    }),
});

export const listAccounts = async (
    role: AccountRole,
    { search = '', page = 1, limit = 20, deleted = false }: { search?: string; page?: number; limit?: number; deleted?: boolean },
) => {
    const size = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const current = Math.max(Number(page) || 1, 1);
    const q = String(search).trim();
    const filter: Record<string, unknown> = {
        ...baseFilter(role),
        deletedAt: deleted ? { $ne: null } : null,
        ...(q && {
            $or: [
                { name: { $regex: escapeStringRegexp(q), $options: 'i' } },
                { email: { $regex: escapeStringRegexp(q), $options: 'i' } },
                ...(role === 'doctor' ? [{ specialization: { $regex: escapeStringRegexp(q), $options: 'i' } }] : []),
            ],
        }),
    };
    const Model = modelFor(role);
    const [rows, total] = await Promise.all([
        Model.find(filter).select(LIST_FIELDS[role]).sort({ createdAt: -1 }).skip((current - 1) * size).limit(size).lean(),
        Model.countDocuments(filter),
    ]);
    return { rows: rows.map((d) => toRow(role, d)), total, page: current, pages: Math.max(1, Math.ceil(total / size)), limit: size };
};

const findAccount = async (role: AccountRole, id: string) => {
    if (!mongoose.isValidObjectId(id)) throw new VerificationError('account not found', 404);
    const account = await modelFor(role).findOne({ _id: id, ...baseFilter(role) });
    if (!account) throw new VerificationError('account not found', 404);
    return account;
};

export const updateAccount = async (role: AccountRole, id: string, body: Record<string, unknown>) => {
    const account = await findAccount(role, id);
    for (const key of EDITABLE[role]) {
        if (body[key] === undefined) continue;
        const value = typeof body[key] === 'string' ? (body[key] as string).trim() : body[key];
        account.set(key, value === '' ? undefined : value);
    }
    // Doctors' save hook keeps the profile slug in step with name/specialty.
    await account.save();
    return toRow(role, account.toObject());
};

export const softDeleteAccount = async (role: AccountRole, id: string, adminId: string) => {
    const account = await findAccount(role, id);
    if (role === 'patient' && String(account._id) === adminId) throw new VerificationError('You can’t delete your own account here');
    account.deletedAt = new Date();
    account.deletedBy = new mongoose.Types.ObjectId(adminId);
    // End their sessions now rather than when the access token expires.
    account.refreshedToken = undefined;
    await account.save();
    return toRow(role, account.toObject());
};

export const restoreAccount = async (role: AccountRole, id: string) => {
    const account = await findAccount(role, id);
    account.deletedAt = null;
    account.deletedBy = undefined;
    await account.save();
    return toRow(role, account.toObject());
};
