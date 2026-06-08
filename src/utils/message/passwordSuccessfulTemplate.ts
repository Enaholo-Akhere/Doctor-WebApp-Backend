export const passwordChangeSuccessTemplate = (userName: string) => {
    const devUrl: string = process.env.DEV_CLIENT_URL || "";
    const prodUrl: string = process.env.PROD_CLIENT_URL || "";
    const clientUrl = process.env.NODE_ENV === "production" ? prodUrl : devUrl;
    const loginUrl = `${clientUrl}/login`;
    const supportUrl = `${clientUrl}/support`;
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Password Changed Successfully – CareConnect</title>
</head>
<body style="margin:0; padding:0; background-color:#f0fdf9; font-family: Arial, Helvetica, sans-serif;">
  <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; margin:40px auto; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;">

    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(160deg, #0d9488 0%, #0f766e 100%); text-align:center; padding:36px 24px;">
        <p style="margin:0 0 20px; color:#ffffff; font-size:20px; font-family:Georgia, serif; letter-spacing:0.04em;">
          CareConnect
        </p>
        <div style="width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.15); border:3px solid rgba(255,255,255,0.3); margin:0 auto 16px;">
          <p style="margin:0; font-size:28px; line-height:64px;">✅</p>
        </div>
        <h1 style="margin:0 0 6px; color:#ffffff; font-size:24px; font-weight:600; font-family:Georgia, serif;">
          Password Changed
        </h1>
        <p style="margin:0; color:#99f6e4; font-size:13px; font-weight:300; letter-spacing:0.02em;">
          Your password has been updated successfully
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px 30px; color:#334155; font-size:15px; line-height:1.6;">
        <p style="margin:0 0 6px;">Hi <strong>${userName}</strong>,</p>
        <p style="margin:0 0 28px; font-size:14px; color:#64748b;">
          This is a confirmation that the password for your CareConnect account has been successfully changed. You can now log in with your new password.
        </p>

        <!-- Success Detail Row -->
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
          <tr>
            <td style="padding:14px 0; border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Account</p>
              <p style="margin:0; font-size:14px; font-weight:600; color:#1e293b;">${userName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Status</p>
              <p style="margin:0; font-size:14px; font-weight:600; color:#16a34a;">Password Updated ✓</p>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <p style="text-align:center; margin:0 0 28px;">
          <a
            href="${loginUrl}"
            style="display:inline-block; background:linear-gradient(135deg, #0d9488, #0f766e); color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:10px; font-size:14px; font-weight:700; letter-spacing:0.04em;"
          >
            Log In to My Account
          </a>
        </p>

        <!-- Security Warning -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background:#fff1f2; border:1px solid #fecdd3; border-radius:10px; margin-bottom:24px;">
          <tr>
            <td style="padding:14px 16px; font-size:12px; color:#9f1239; line-height:1.7;">
              🚨 <strong>Wasn't you?</strong> If you did not make this change, your account may be compromised. Please <a href="${supportUrl}" style="color:#9f1239; font-weight:600;">contact our support team</a> immediately.
            </td>
          </tr>
        </table>

        <!-- Safety Note -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf9; border:1px solid #ccfbf1; border-radius:10px; margin-bottom:28px;">
          <tr>
            <td style="padding:14px 16px; font-size:12px; color:#475569; line-height:1.7;">
              🔒 For your security, we recommend using a strong, unique password and enabling two-factor authentication on your account.
            </td>
          </tr>
        </table>

        <p style="margin:0; font-size:14px; color:#64748b;">
          Warm regards,<br />
          <strong style="color:#0d9488;">The CareConnect Team</strong>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; padding:20px 24px;">
        <p style="margin:0 0 4px; font-size:14px; font-weight:600; color:#0d9488; font-family:Georgia, serif;">CareConnect</p>
        <p style="margin:0; font-size:12px; color:#94a3b8; line-height:1.7;">
          Need help? <a href="mailto:support@careconnect.com" style="color:#0d9488;">support@careconnect.com</a><br />
          © ${year} CareConnect. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
  `;
};