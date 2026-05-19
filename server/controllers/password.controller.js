import crypto from 'crypto';
import { Resend } from 'resend';
import User from '../models/user.schema.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /auth/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });

        // Always return success to avoid email enumeration
        if (!user) {
            return res.status(200).json({ success: true, message: 'If this email exists, a reset link has been sent.' });
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        user.resetPasswordToken = token;
        user.resetPasswordExpires = expires;
        await user.save();

        // Build reset link
        const frontendUrl = process.env.FRONTEND_URL
            ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/$/, '')
            : 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;

        const { error } = await resend.emails.send({
            from: `Idea Fueled CRM <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: 'Reset Your Password – Idea Fueled CRM',
            html: `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
                    <div style="background: #fff; border-radius: 16px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
                        <div style="text-align: center; margin-bottom: 32px;">
                            <h1 style="color: #1e40af; font-size: 22px; font-weight: 700; margin: 0 0 8px;">Idea Fueled CRM</h1>
                            <div style="width: 48px; height: 3px; background: #3b82f6; margin: 0 auto; border-radius: 2px;"></div>
                        </div>
                        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 8px;">Reset Your Password</h2>
                        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
                            Hi <strong style="color: #0f172a;">${user.name}</strong>,<br><br>
                            We received a request to reset the password for your Idea Fueled CRM account. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
                        </p>
                        <div style="text-align: center; margin-bottom: 32px;">
                            <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 12px; letter-spacing: 0.3px;">Reset Password</a>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.<br><br>
                            For security, this link expires in 1 hour.
                        </p>
                        <p style="color: #cbd5e1; font-size: 12px; margin-top: 12px; word-break: break-all;">
                            Or copy this link: <span style="color: #3b82f6;">${resetLink}</span>
                        </p>
                    </div>
                    <p style="text-align: center; color: #cbd5e1; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} Idea Fueled. All rights reserved.</p>
                </div>
            `
        });

        if (error) {
            console.error('Resend error:', JSON.stringify(error, null, 2));
            return res.status(500).json({ success: false, message: error.message || 'Failed to send reset email.' });
        }

        return res.status(200).json({ success: true, message: 'If this email exists, a reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error?.message || error);
        return res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again.' });
    }
};

// POST /auth/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
        }

        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash(password, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });

    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
    }
};
