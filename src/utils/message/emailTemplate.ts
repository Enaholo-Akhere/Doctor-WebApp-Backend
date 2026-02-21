import { decodedData, emailUrlAndName } from "types";
const url_dev = 'http://localhost:5173/verify-email';
const url_prod = 'https://e-folio-enaholo-akhere.netlify.app';

export const verifyEmailTemplate = ({ name, _id }: decodedData, token: string) => {
    const baseUrl = process.env.NODE_ENV === 'production' ? url_prod : url_dev;

    const email_temp = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Confirm Your Email – Medicare</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f7fa; font-family: Arial, Helvetica, sans-serif;">
  <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; margin:40px auto; border-radius:6px; overflow:hidden;">
    
    <!-- Header -->
    <tr>
      <td style="background-color:#0073e6; text-align:center; padding:24px;">
        <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:600;">
          Welcome to Medicare
        </h1>
        <p style="margin:8px 0 0; color:#e6f0ff; font-size:14px;">
          Your health. Simplified.
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:30px; color:#333333; font-size:15px; line-height:1.6;">
        <p>Hi ${name},</p>

        <p>
          Thank you for signing up for <strong>Medicare</strong>. We’re excited to have you on board.
        </p>

        <p>
          Your account has been successfully created. To complete your registration and secure your account, please confirm your email address by clicking the button below:
        </p>

        <!-- CTA Button -->
        <p style="text-align:center; margin:30px 0;">
          <a 
            href="${baseUrl}/?userId=${_id}&token=${token}&dialogue=${true}"
            style="
              display:inline-block;
              background-color:#0073e6;
              color:#ffffff;
              padding:12px 24px;
              text-decoration:none;
              border-radius:4px;
              font-size:15px;
              font-weight:600;
            "
          >
            Confirm Email Address
          </a>
        </p>

        <p>
          If you did not create an account with Medicare, you can safely ignore this email.
        </p>

        <p>
          If you need help or have any questions, our support team is always here for you.
        </p>

        <p style="margin-top:30px;">
          Warm regards,<br />
          <strong>The Medicare Team</strong>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#f0f2f5; text-align:center; padding:16px; font-size:12px; color:#777777;">
        <p style="margin:0;">
          © ${new Date().getFullYear()} Medicare. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
`;

    return email_temp;

};