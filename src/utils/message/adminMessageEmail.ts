import { transporter } from './nodemailer';

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Wraps an admin's (already sanitized) message in the CareConnect email layout. */
const layout = (bodyHtml: string) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1b1a1e;line-height:1.6">
  <div style="border-bottom:3px solid #0c8075;padding-bottom:12px;margin-bottom:20px">
    <strong style="color:#0c8075;font-size:18px">CareConnect</strong>
  </div>
  ${bodyHtml}
  <p style="color:#4e545f;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:12px">
    You’re receiving this because you have a CareConnect account.
  </p>
</div>`;

/** One email per person, so recipients never see each other's addresses. "{{name}}" becomes their name. */
export const sendAdminMessageEmail = async ({ to, name, subject, html }: { to: string; name: string; subject: string; html: string }) => {
    const body = html.replace(/\{\{\s*name\s*\}\}/gi, escapeHtml(name));
    const sent = await transporter.sendMail({ from: `CareConnect <${process.env.AUTH_EMAIL}>`, to, subject, html: layout(body) });
    if (!sent.messageId) throw new Error('message not sent');
};
