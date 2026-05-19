import nodemailer from 'nodemailer';

// Log on startup so Render logs show if env vars are missing
console.log('[email] EMAIL_USER set:', !!process.env.EMAIL_USER);
console.log('[email] EMAIL_PASS set:', !!process.env.EMAIL_PASS);

/**
 * Creates a Nodemailer transporter configured for Gmail SMTP.
 * Requires EMAIL_USER and EMAIL_PASS (Google App Password) in env.
 */
const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required.');
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,           // SSL on port 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // Must be a Google App Password, not your Gmail password
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
};

/**
 * Sends a branded HTML password reset email.
 */
export const sendPasswordResetEmail = async (toEmail, userName, resetLink) => {
    const transporter = createTransporter();

    // Verify SMTP connection before sending
    await transporter.verify();
    console.log('[email] SMTP connection verified.');

    const year = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Reset Your Password – Idea Fueled CRM</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:48px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

  <!-- Brand Header -->
  <tr><td align="center" style="padding-bottom:24px;">
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#1e40af;letter-spacing:-0.5px;">Idea Fueled CRM</h1>
    <div style="width:48px;height:3px;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:2px;margin:10px auto 0;"></div>
  </td></tr>

  <!-- Card -->
  <tr><td style="background:#fff;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 8px 32px rgba(0,0,0,0.07);padding:44px 40px;">

    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#eff6ff;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">🔐</div>
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Reset Your Password</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.7;text-align:center;">
      Hi <strong style="color:#0f172a;">${userName}</strong>,<br/>
      We received a request to reset your Idea Fueled CRM password.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${resetLink}"
         style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 44px;border-radius:14px;box-shadow:0 4px 16px rgba(37,99,235,0.3);">
        Reset My Password
      </a>
    </div>

    <!-- Expiry warning -->
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">
        ⏱ This link expires in <strong>1 hour</strong>. Request a new one if it expires.
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;"/>

    <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;line-height:1.6;">
      🛡️ If you did not request a password reset, ignore this email — your password remains unchanged.
    </p>
    <p style="margin:0;font-size:12px;color:#cbd5e1;word-break:break-all;">
      Button not working? Copy this URL:<br/>
      <a href="${resetLink}" style="color:#3b82f6;text-decoration:none;">${resetLink}</a>
    </p>

  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding-top:24px;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      © ${year} Idea Fueled. All rights reserved.<br/>
      This is an automated message — please do not reply.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const info = await transporter.sendMail({
        from: `"Idea Fueled CRM" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: '🔐 Reset Your Password – Idea Fueled CRM',
        html,
    });

    console.log(`[email] Message sent: ${info.messageId}`);
    return info;
};
