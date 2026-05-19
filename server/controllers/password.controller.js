import crypto from 'crypto';
import User from '../models/user.schema.js';
import { hashPassword } from '../utils/hashPassword.js';
import { sendPasswordResetEmail } from '../utils/email.js';

// ─── Helper: SHA-256 hash of a raw token for secure DB storage ───────────────
const hashToken = (rawToken) =>
    crypto.createHash('sha256').update(rawToken).digest('hex');

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });

        // Always 200 to prevent user enumeration
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a reset link has been sent.'
            });
        }

        // Generate a cryptographically secure raw token
        const rawToken = crypto.randomBytes(32).toString('hex');

        // Store the HASHED version in DB — never the raw token
        user.resetPasswordToken = hashToken(rawToken);
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        // Build the reset URL using raw token (never hash)
        const frontendUrl = process.env.FRONTEND_URL
            ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/$/, '')
            : 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

        console.log(`[forgotPassword] Sending reset email to: ${user.email}`);

        // Send email
        await sendPasswordResetEmail(user.email, user.name, resetLink);

        console.log(`[forgotPassword] Email sent successfully to: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a reset link has been sent.'
        });

    } catch (error) {
        console.error('[forgotPassword] Error:', error.message || error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send reset email. Please try again later.'
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and new password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }

        // Hash the incoming raw token and look it up
        const hashedToken = hashToken(token);

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'This reset link is invalid or has expired. Please request a new one.'
            });
        }

        // Use the same hashPassword utility the rest of the app uses
        user.password = await hashPassword(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        console.log(`[resetPassword] Password reset successfully for: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: 'Your password has been reset successfully. You can now log in.'
        });

    } catch (error) {
        console.error('[resetPassword] Error:', error.message || error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again later.'
        });
    }
};
