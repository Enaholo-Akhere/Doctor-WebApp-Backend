import { BookingCompleteInterface } from "types";


export const doctorBookingTemplate = ({
  doctorName,
  patientName,
  patientEmail,
  ticketPrice,
  bookingRef,
  bookedOn,
}: BookingCompleteInterface) => {

  const devUrl: string = process.env.DEV_CLIENT_URL || "";
  const prodUrl: string = process.env.PROD_CLIENT_URL || "";
  const clientUrl = process.env.NODE_ENV === 'production' ? prodUrl : devUrl;

  const dashboardUrl = `${clientUrl}/doctors/profile/me`;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>New Appointment – CareConnect</title>
</head>
<body style="margin:0; padding:0; background-color:#f0fdf9; font-family: Arial, Helvetica, sans-serif;">
  <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; margin:40px auto; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;">

    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(160deg, #0f766e 0%, #134e4a 100%); text-align:center; padding:36px 24px;">
        <p style="margin:0 0 20px; color:#ffffff; font-size:20px; font-family:Georgia, serif; letter-spacing:0.04em;">
          CareConnect
        </p>
        <div style="width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.15); border:3px solid rgba(255,255,255,0.3); margin:0 auto 16px;">
          <p style="margin:16px 0 0; font-size:28px;">📅</p>
        </div>
        <h1 style="margin:0 0 6px; color:#ffffff; font-size:24px; font-weight:600; font-family:Georgia, serif;">
          New Appointment
        </h1>
        <p style="margin:0; color:#cccccc; font-size:13px; font-weight:300; letter-spacing:0.02em;">
          A patient has booked a consultation with you
        </p>
      </td>
    </tr>

    <!-- Alert Banner -->
    <tr>
      <td style="background:#f0fdf9; border-left:4px solid #0d9488; padding:12px 20px;">
        <p style="margin:0; font-size:13px; color:#0f766e; font-weight:600;">
          ℹ️ Action Required — Please review and prepare for your upcoming appointment
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px 30px; color:#334155; font-size:15px; line-height:1.6;">

        <p style="margin:0 0 6px;">Dear <strong>Dr. ${doctorName}</strong>,</p>
        <p style="margin:0 0 28px; font-size:14px; color:#64748b;">
          You have a new confirmed appointment on CareConnect. A patient has successfully booked and paid for a consultation with you. Please find the details below.
        </p>

        <!-- Patient Card -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg, #f0fdf9, #f8fafc); border:1px solid #ccfbf1; border-radius:12px; margin-bottom:24px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Patient</p>
              <p style="margin:0 0 2px; font-size:17px; font-weight:700; color:#aaaaaa;">${patientName}</p>
              <p style="margin:0; font-size:12px; color:#64748b;">${patientEmail}</p>
            </td>
          </tr>
        </table>

        <!-- Detail Rows -->
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">

          <tr>
            <td style="padding:14px 0; border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Booking Date</p>
              <p style="margin:0; font-size:14px; font-weight:600; color:#1e293b;">${bookedOn}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 0;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Payment Status</p>
              <p style="margin:0; font-size:14px; font-weight:600; color:#16a34a;">Confirmed & Paid ✓</p>
            </td>
          </tr>

        </table>

        <!-- Earnings Box -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg, #0d9488, #0f766e); border-radius:14px; margin-bottom:24px;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:rgba(255,255,255,0.7);">Consultation Fee Received</p>
              <p style="margin:0; font-size:30px; font-weight:700; color:#ffffff; letter-spacing:-0.02em;">$${ticketPrice} USD</p>
            </td>
          </tr>
        </table>

        <!-- Booking Reference -->
        <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 24px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:999px; padding:8px 20px;">
          <tr>
            <td style="font-size:10px; text-transform:uppercase; letter-spacing:0.12em; font-weight:700; color:#94a3b8; padding-right:8px;">
              BOOKING REF
            </td>
            <td style="font-family:'Courier New', monospace; font-size:13px; font-weight:700; color:#334155; letter-spacing:0.08em;">
              ${bookingRef}
            </td>
          </tr>
        </table>

        <!-- Warning Note -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; margin-bottom:28px;">
          <tr>
            <td style="padding:14px 16px; font-size:12px; color:#92400e; line-height:1.7;">
              ⚠️ Please ensure your availability and review the patient's profile before the appointment. If you are unable to attend, notify the patient and our support team at least 24 hours in advance.
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <p style="text-align:center; margin:0 0 24px;">
          <a
            href="${dashboardUrl}"
            style="display:inline-block; background:linear-gradient(135deg, #0d9488, #0f766e); color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:10px; font-size:14px; font-weight:700; letter-spacing:0.04em;"
          >
            View My Appointments
          </a>
        </p>

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