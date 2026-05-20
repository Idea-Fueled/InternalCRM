import { Resend } from 'resend';

// Log on startup so logs show if env vars are configured correctly
console.log('[email] RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);
console.log('[email] EMAIL_FROM set:', !!process.env.EMAIL_FROM);

/**
 * Initializes and returns the Resend client instance.
 */
const getResendInstance = () => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is required.');
    }
    return new Resend(process.env.RESEND_API_KEY);
};

/**
 * Sends a branded, premium SaaS-style HTML password reset email using Resend.
 */
export const sendPasswordResetEmail = async (toEmail, userName, resetLink) => {
    const resend = getResendInstance();

    // Enforce verified sender domain format
    const fromAddress = process.env.EMAIL_FROM || 'info@crm.ideafueled.in';
    const from = `IdeaFueled CRM <${fromAddress}>`;

    const year = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password – Idea Fueled CRM</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:64px 16px;min-height:100vh;">
    <tr>
      <td align="center" valign="top">
        <table width="100%" style="max-width:540px;" cellpadding="0" cellspacing="0">
          
          <!-- Header Logo / Branding -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://res.cloudinary.com/dlkn3acmr/image/upload/v1779278941/ideafueled_crm_brand/IF-white.png" 
                   alt="IdeaFueled CRM" 
                   style="height:48px;width:auto;display:block;margin:0 auto;object-fit:contain;" />
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td style="background-color:#1e293b;border-radius:24px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 20px 40px -15px rgba(0,0,0,0.5);padding:48px 40px;">
              
              <!-- Key Icon with Gradient Glow -->
              <table align="center" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#1e1b4b,#311042);border:1px solid rgba(139,92,246,0.3);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;box-shadow:0 0 20px rgba(139,92,246,0.15);">
                    🔐
                  </td>
                </tr>
              </table>

              <!-- Greeting & Subtitle -->
              <h2 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.5px;">Reset Your Password</h2>
              <p style="margin:0 0 32px;font-size:15px;color:#94a3b8;line-height:1.7;text-align:center;">
                Hi <strong style="color:#ffffff;">${userName}</strong>,<br/>
                We received a request to reset your password for your IdeaFueled CRM account. Click the secure button below to choose a new password.
              </p>

              <!-- CTA Button -->
              <table align="center" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:14px;box-shadow:0 10px 20px -10px rgba(59,130,246,0.5);letter-spacing:0.2px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notification -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:14px;margin-bottom:32px;">
                <tr>
                  <td style="padding:14px 18px;font-size:13px;color:#f59e0b;font-weight:500;line-height:1.5;">
                    ⏱️ This secure link is valid for <strong>1 hour</strong>. If it expires, you can request a new one from the login page.
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 24px 0;"/>

              <!-- Additional Safety Information -->
              <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">
                🛡️ If you did not request this change, please ignore this email. Your account remains completely secure.
              </p>
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;word-break:break-all;">
                Button not working? Copy and paste this URL into your browser:<br/>
                <a href="${resetLink}" target="_blank" style="color:#6366f1;text-decoration:none;word-break:break-all;">${resetLink}</a>
              </p>

            </td>
          </tr>

          <!-- Footer Info -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                © ${year} IdeaFueled CRM. All rights reserved.<br/>
                This is an automated message sent from a verified domain. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    console.log(`[email] Sending password reset email via Resend to ${toEmail}...`);

    const { data, error } = await resend.emails.send({
        from,
        to: toEmail,
        subject: '🔐 Reset Your Password – Idea Fueled CRM',
        html,
    });

    if (error) {
        console.error('[email] Resend sending failed:', error);
        throw new Error(error.message || 'Failed to send password reset email via Resend.');
    }

    console.log(`[email] Email sent successfully via Resend. ID: ${data?.id}`);
    return data;
};
