import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import User from 'models/UserSchema';
import Doctor from 'models/DoctorSchema';
import AdminMessage from 'models/AdminMessageSchema';
import { winston_logger } from '@utils/logger';
import { sendAdminMessageEmail } from '@utils/message/adminMessageEmail';
import { VerificationError } from './verificationService';

export type Audience = 'all_patients' | 'all_doctors' | 'selected';
type Recipient = { id: string; role: 'patient' | 'doctor' };

/** Safety cap per send; also keeps a typo from emailing everyone twice. */
export const MAX_RECIPIENTS = 2000;
const CONCURRENCY = 5;

/** What the editor (Quill) can produce, and nothing else: no scripts, styles or event handlers. */
export const cleanHtml = (html: string) =>
    sanitizeHtml(html, {
        allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'span'],
        allowedAttributes: { a: ['href', 'target', 'rel'], '*': ['class'] },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }) },
    }).trim();

const resolveRecipients = async (audience: Audience, selected: Recipient[] = []) => {
    const active = { deletedAt: null };
    if (audience === 'all_patients') {
        return (await User.find({ role: 'patient', ...active }).select('name email').lean()).map((u) => ({ id: String(u._id), role: 'patient' as const, name: u.name, email: u.email }));
    }
    if (audience === 'all_doctors') {
        return (await Doctor.find(active).select('name email').lean()).map((d) => ({ id: String(d._id), role: 'doctor' as const, name: d.name, email: d.email }));
    }
    const ids = (role: Recipient['role']) => selected.filter((r) => r.role === role && mongoose.isValidObjectId(r.id)).map((r) => r.id);
    const [patients, doctors] = await Promise.all([
        User.find({ _id: { $in: ids('patient') }, role: 'patient', ...active }).select('name email').lean(),
        Doctor.find({ _id: { $in: ids('doctor') }, ...active }).select('name email').lean(),
    ]);
    return [
        ...patients.map((u) => ({ id: String(u._id), role: 'patient' as const, name: u.name, email: u.email })),
        ...doctors.map((d) => ({ id: String(d._id), role: 'doctor' as const, name: d.name, email: d.email })),
    ];
};

export const sendAdminMessage = async (
    { audience, recipients, subject, html }: { audience: Audience; recipients?: Recipient[]; subject: string; html: string },
    adminId: string,
) => {
    const body = cleanHtml(html);
    if (!subject?.trim()) throw new VerificationError('Add a subject');
    if (!sanitizeHtml(body, { allowedTags: [] }).trim()) throw new VerificationError('Write a message');

    const people = await resolveRecipients(audience, recipients);
    if (!people.length) throw new VerificationError('No recipients to send to');
    if (people.length > MAX_RECIPIENTS) throw new VerificationError(`That’s ${people.length} people; the limit per message is ${MAX_RECIPIENTS}`);

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < people.length; i += CONCURRENCY) {
        const results = await Promise.allSettled(
            people.slice(i, i + CONCURRENCY).map((p) => sendAdminMessageEmail({ to: p.email, name: p.name, subject: subject.trim(), html: body })),
        );
        results.forEach((r) => (r.status === 'fulfilled' ? sent++ : failed++));
    }
    if (failed) winston_logger.error(`admin message: ${failed} of ${people.length} emails failed`);

    const record = await AdminMessage.create({
        subject: subject.trim(),
        html: body,
        audience,
        // Only list names for hand-picked sends; "all" sends just keep the count.
        recipients: audience === 'selected' ? people : [],
        recipientCount: people.length,
        sent,
        failed,
        sentBy: adminId,
    });
    return { _id: String(record._id), recipientCount: people.length, sent, failed };
};

export const listAdminMessages = async () =>
    (await AdminMessage.find().sort({ createdAt: -1 }).limit(50).populate('sentBy', 'name').lean()).map((m: any) => ({
        _id: String(m._id),
        subject: m.subject,
        html: m.html,
        audience: m.audience,
        recipients: (m.recipients ?? []).map((r: any) => ({ name: r.name, email: r.email, role: r.role })),
        recipientCount: m.recipientCount,
        sent: m.sent,
        failed: m.failed,
        sentBy: m.sentBy?.name ?? 'Admin',
        createdAt: m.createdAt,
    }));
