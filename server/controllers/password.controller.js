import crypto from 'crypto';
import bcrypt from 'bcrypt';
import User from '../models/user.schema.js';
import { sendPasswordResetEmail } from '../utils/email.js';

// ─── Helper: hash a raw token for secure DB storage ──────────────────────────
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

        // Always return 200 to prevent user enumeration attacks
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a reset link has been sent.'
            });
        }

        // 1. Generate cryptographically secure raw token
        const rawToken = crypto.randomBytes(32).toString('hex');

        // 2. Store only the HASHED token in the DB (security best practice)
        user.resetPasswordToken = hashToken(rawToken);
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        // 3. Build the reset URL — raw token goes in the URL, never the hashed one
        const frontendUrl = process.env.FRONTEND_URL
            ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/$/, '')
            : 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

        // 4. Send the email via Nodemailer
        await sendPasswordResetEmail(user.email, user.name, resetLink);

        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a reset link has been sent.'
        });

    } catch (error) {
        console.error('[forgotPassword] Error:', error.message || error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
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

        // 1. Hash the incoming raw token and look it up in the DB
        const hashedToken = hashToken(token);

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() } // token must not be expired
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'This reset link is invalid or has expired. Please request a new one.'
            });
        }

        // 2. Hash the new password and update the user
        const hashedPassword = await bcrypt.hash(password, 12);

        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Your password has been reset successfully. You can now log in.'
        });

    } catch (error) {
        console.error('[resetPassword] Error:', error.message || error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};
