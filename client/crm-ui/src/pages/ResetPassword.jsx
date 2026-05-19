import React, { useState } from "react";
import logoImgNew from "../assets/logo-idea-fueled-new.png";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { authService } from "../api/services";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);

        if (!password || !confirmPassword) return;
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        if (!token) {
            toast.error("Invalid or missing reset token.");
            return;
        }

        try {
            setLoading(true);
            await authService.resetPassword(token, password);
            setDone(true);
            toast.success("Password reset successfully!");
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to reset password. The link may have expired.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans selection:bg-blue-200 selection:text-blue-900 p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md space-y-8 relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white animate-in fade-in zoom-in-95 duration-700">
                <div className="flex flex-col items-center justify-center">
                    <img
                        src={logoImgNew}
                        alt="Idea Fueled"
                        className="h-16 w-auto mb-6 hover:scale-105 transition-transform duration-300 drop-shadow-sm cursor-pointer"
                        onClick={() => navigate("/")}
                    />
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                            {done ? "Password Updated!" : "Set New Password"}
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium px-4">
                            {done
                                ? "Your password has been reset successfully. You can now log in."
                                : "Choose a strong new password for your account."}
                        </p>
                    </div>
                </div>

                {!done ? (
                    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                        {/* New Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full pl-11 pr-12 py-4 rounded-2xl border ${submitted && !password ? 'border-red-500 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50'} text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm`}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {submitted && !password && <p className="text-red-500 text-xs font-semibold ml-1 animate-in fade-in slide-in-from-top-1">Password is required!</p>}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Repeat your new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full pl-11 pr-12 py-4 rounded-2xl border ${submitted && !confirmPassword ? 'border-red-500 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50'} text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm`}
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {submitted && !confirmPassword && <p className="text-red-500 text-xs font-semibold ml-1 animate-in fade-in slide-in-from-top-1">Please confirm your password!</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </button>
                    </form>
                ) : (
                    <button
                        onClick={() => navigate("/")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
                    >
                        Go to Login
                    </button>
                )}
            </div>
        </div>
    );
}
