import { BookingCompleteInterface } from "types";
import { formatCurrency } from "./formartCurrency";

export const patientBookingTemplate = ({
  patientName,
  doctorName,
  bookingRef,
  bookedOn,
  paymentDetail
}: BookingCompleteInterface) => {
  const devUrl: string = process.env.DEV_CLIENT_URL || "";
  const prodUrl: string = process.env.PROD_CLIENT_URL || "";
  const clientUrl = process.env.NODE_ENV === 'production' ? prodUrl : devUrl;
  const profileUrl = `${clientUrl}/users/profile/me`;
  const year = new Date().getFullYear();

  let amountPaid;
  if (paymentDetail?.amountPaid && paymentDetail.customerCurrency) {
    amountPaid = formatCurrency(paymentDetail.amountPaid, paymentDetail.customerCurrency)
  }


  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Appointment Confirmed – CareConnect</title>
</head>
<body style="margin:0; padding:0; background-color:#f0fdf9; font-family: Arial, Helvetica, sans-serif;">
  <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; margin:40px auto; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;">

    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(160deg, #0d9488 0%, #0f766e 100%); text-align:center; padding:36px 24px;">
        <p style="margin:0 0 20px; color:#ffffff; font-size:20px; font-family:Georgia, serif; letter-spacing:0.04em;">
          CareConnect
        </p>
        <div style="width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.15); border:3px solid rgba(255,255,255,0.3); margin:0 auto 16px; display:flex; align-items:center; justify-content:center;">
          <p style="margin:0; font-size:28px;">✅</p>
        </div>
        <h1 style="margin:0 0 6px; color:#ffffff; font-size:24px; font-weight:600; font-family:Georgia, serif;">
          Booking Confirmed
        </h1>
        <p style="margin:0; color:#99f6e4; font-size:13px; font-weight:300; letter-spacing:0.02em;">
          Your appointment has been successfully scheduled
        </p>
      </td>
    </tr>

    <!-- Booking Reference -->
    <tr>
      <td style="padding:0 24px;">
        <table align="center" cellpadding="0" cellspacing="0" style="margin:-18px auto 0; background:#ffffff; border:1px solid #e2e8f0; border-radius:999px; padding:8px 20px;">
          <tr>
            <td style="font-size:10px; text-transform:uppercase; letter-spacing:0.12em; font-weight:700; color:#94a3b8; padding-right:8px;">
              REF
            </td>
            <td style="font-family:'Courier New', monospace; font-size:13px; font-weight:700; color:#334155; letter-spacing:0.08em;">
              ${bookingRef}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px 30px; color:#334155; font-size:15px; line-height:1.6;">
        <p style="margin:0 0 6px;">Hi <strong>${patientName}</strong>,</p>
        <p style="margin:0 0 28px; font-size:14px; color:#64748b;">
          Your appointment with <strong>Dr. ${doctorName}</strong> has been confirmed and your payment processed successfully. Here's a summary of your booking.
        </p>

        <!-- Detail Rows -->
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">

          <tr>
            <td style="padding:14px 0; border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Healthcare Professional</p>
              <p style="margin:0; font-size:14px; font-weight:600; color:#1e293b;">Dr. ${doctorName}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 0; border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Patient</p>
              <p style="margin:0; font-size:14px; font-weight:600; color:#1e293b;">${patientName}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 0; border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Booked On</p>
              <p style="margin:0; font-size:14px; font-weight:600; color:#1e293b;">${bookedOn}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 0;">
              <p style="margin:0 0 3px; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; font-weight:700; color:#94a3b8;">Payment Status</p>
              <p style="margin:0; font-size:14px; font-weight:600; color:#16a34a;">Paid ✓</p>
            </td>
          </tr>

        </table>

        <!-- Payment Summary Box -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:24px;">
          <tr>
            <td style="padding:0 20px 20px;">
              <p style="margin:0 0 14px; font-size:10px; text-transform:uppercase; letter-spacing:0.12em; font-weight:700; color:#94a3b8;">Payment Summary</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:13px; color:#64748b; padding-bottom:8px;">Consultation Fee</td>
                  <td align="right" style="font-size:13px; color:#64748b; padding-bottom:8px;">${amountPaid}</td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:1px solid #e2e8f0; padding-top:10px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:15px; font-weight:700; color:#1e293b;">Total Paid</td>
                        // <td align="right" style="font-size:15px; font-weight:700; color:#0d9488;">${amountPaid}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Info Note -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf9; border:1px solid #ccfbf1; border-radius:10px; margin-bottom:28px;">
          <tr>
            <td style="padding:14px 16px; font-size:12px; color:#475569; line-height:1.7;">
              🔒 Please arrive on time for your appointment. If you need to cancel or reschedule, contact us at least 24 hours in advance. Your personal data is secured and private.
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <p style="text-align:center; margin:0 0 24px;">
          <a 
            href="${profileUrl}"
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
