import { transporter } from './nodemailer';

const clientUrl = () =>
    (process.env.NODE_ENV === 'production' ? process.env.PROD_CLIENT_URL : process.env.DEV_CLIENT_URL) || '';

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const layout = (title: string, body: string) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1b1a1e">
  <h2 style="color:#0c8075">${title}</h2>
  ${body}
  <p style="margin-top:24px">
    <a href="${clientUrl()}/dashboard/profile/me" style="background:#0c8075;color:#fff;padding:10px 18px;border-radius:24px;text-decoration:none">Open your dashboard</a>
  </p>
  <p style="color:#4e545f;font-size:13px;margin-top:24px">CareConnect</p>
</div>`;

const send = async (to: string, subject: string, html: string) => {
    const sent = await transporter.sendMail({ from: `CareConnect <${process.env.AUTH_EMAIL}>`, to, subject, html });
    if (!sent.messageId) throw new Error('message not sent');
};

export const sendApprovalDecisionEmail = ({ email, name, approved, note }: { email: string; name: string; approved: boolean; note?: string }) =>
    send(
        email,
        approved ? 'You’re verified on CareConnect' : 'Your CareConnect verification needs attention',
        layout(
            approved ? 'Your profile is now live' : 'We couldn’t verify your profile yet',
            `<p>Hi ${escapeHtml(name)},</p>
             <p>${approved
                ? 'Your documents have been verified. Patients can now find and book you on CareConnect.'
                : 'We reviewed your documents but couldn’t approve your profile yet.'}</p>
             ${note ? `<p style="background:#f6faf9;border-left:3px solid #0c8075;padding:10px 14px">${escapeHtml(note)}</p>` : ''}`,
        ),
    );

export const sendLicenceExpiryEmail = ({ email, name, expiresAt, expired }: { email: string; name: string; expiresAt: Date; expired: boolean }) =>
    send(
        email,
        expired ? 'Your practising licence has expired' : 'Your practising licence expires soon',
        layout(
            expired ? 'Your profile has been unlisted' : 'Time to renew your licence',
            `<p>Hi ${escapeHtml(name)},</p>
             <p>${expired
                ? `Your practising licence expired on <strong>${expiresAt.toDateString()}</strong>, so patients can no longer book you. Upload your renewed licence and we’ll review it.`
                : `Your practising licence expires on <strong>${expiresAt.toDateString()}</strong>. Upload your renewed licence before then to stay listed.`}</p>`,
        ),
    );
