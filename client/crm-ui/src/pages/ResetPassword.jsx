import React, { useState, useEffect } from "react";
import logoImgNew from "../assets/IF-black.png";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
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
    const [tokenValid, setTokenValid] = useState(true); // assume valid until proven otherwise

    useEffect(() => {
        if (!token) {
            setTokenValid(false);
        }
    }, [token]);

    const getPasswordStrength = (pwd) => {
        if (pwd.length === 0) return null;
        if (pwd.length < 6) return { label: "Too short", color: "bg-red-400 w-1/4" };
        if (pwd.length < 8) return { label: "Weak", color: "bg-orange-400 w-2/4" };
        if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: "Strong", color: "bg-emerald-500 w-full" };
        return { label: "Fair", color: "bg-yellow-400 w-3/4" };
    };

    const strength = getPasswordStrength(password);

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

        try {
            setLoading(true);
            const res = await authService.resetPassword(token, password);
            if (res.data?.success) {
                setDone(true);
                toast.success("Password reset successfully!");
            } else {
                toast.error(res.data?.message || "Failed to reset password.");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Something went wrong. Please try again.";
            if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired")) {
                setTokenValid(false);
            }
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── Invalid / Expired Token State ────────────────────────────────────────
    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="w-full max-w-md relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] border border-white animate-in fade-in zoom-in-95 duration-500 text-center">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertTriangle className="w-8 h-8 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Link Expired</h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        This password reset link is invalid or has already expired. Please request a new one.
                    </p>
                    <button
                        onClick={() => navigate("/forgot-password")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 text-sm"
                    >
                        Request New Reset Link
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="w-full mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    // ── Success State ────────────────────────────────────────────────────────
    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-200/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="w-full max-w-md relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] border border-white animate-in fade-in zoom-in-95 duration-500 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Updated!</h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        Your password has been reset successfully. You can now log in with your new password.
                    </p>
                    <button
                        onClick={() => navigate("/")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 text-sm"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // ── Main Form ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Logo container */}
            <div className="flex items-center justify-center mb-8 animate-in fade-in slide-in-from-top-8 duration-700 delay-150 fill-mode-both">
                <img 
                    src={logoImgNew} 
                    alt="Idea Fueled" 
                    className="h-16 w-auto drop-shadow-sm pointer-events-none select-none" 
                />
            </div>

            <div className="w-full max-w-md relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] border border-white animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set a New Password</h2>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                        Choose a strong password to secure your account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 ml-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                className={`w-full pl-11 pr-12 py-4 rounded-2xl border text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm text-sm
                                    ${submitted && !password ? 'border-red-400 bg-red-50/40' : 'border-slate-200/80 bg-slate-50/50'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {/* Strength indicator */}
                        {password.length > 0 && strength && (
                            <div className="px-1">
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${strength.color}`} />
                                </div>
                                <p className="text-xs font-semibold mt-1 text-slate-500">{strength.label}</p>
                            </div>
                        )}
                        {submitted && !password && (
                            <p className="text-red-500 text-xs font-semibold ml-1 animate-in fade-in slide-in-from-top-1">Password is required.</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 ml-1">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type={showConfirm ? "text" : "password"}
                                placeholder="Repeat your new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full pl-11 pr-12 py-4 rounded-2xl border text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm text-sm
                                    ${submitted && !confirmPassword ? 'border-red-400 bg-red-50/40' : 
                                      confirmPassword && confirmPassword !== password ? 'border-orange-400 bg-orange-50/30' : 
                                      'border-slate-200/80 bg-slate-50/50'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {submitted && !confirmPassword && (
                            <p className="text-red-500 text-xs font-semibold ml-1 animate-in fade-in slide-in-from-top-1">Please confirm your password.</p>
                        )}
                        {confirmPassword && confirmPassword !== password && (
                            <p className="text-orange-500 text-xs font-semibold ml-1">Passwords do not match.</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Resetting password...
                            </span>
                        ) : "Reset Password"}
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
            </div>
        </div>
    );
}
