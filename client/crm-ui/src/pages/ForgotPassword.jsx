import React, { useState } from "react";
import logoImgNew from "../assets/logo-idea-fueled-new.png";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { authService } from "../api/services";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        if (!email.trim()) return;

        try {
            setLoading(true);
            const res = await authService.forgotPassword(email.trim().toLowerCase());
            if (res.data?.success) {
                setSent(true);
                toast.success("Reset link sent! Please check your inbox.");
            } else {
                toast.error(res.data?.message || "Failed to send reset link.");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Something went wrong. Please try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setSent(false);
        setSubmitted(false);
        setEmail("");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] border border-white animate-in fade-in zoom-in-95 duration-500">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <img
                        src={logoImgNew}
                        alt="Idea Fueled"
                        className="h-16 w-auto mb-6 hover:scale-105 transition-transform duration-300 drop-shadow-sm cursor-pointer"
                        onClick={() => navigate("/")}
                    />
                    {!sent ? (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot your password?</h2>
                            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                                Enter your work email and we'll send you a secure link to reset it.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-7 h-7 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Check your inbox</h2>
                            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                                We've sent a password reset link to <span className="font-semibold text-slate-700">{email}</span>.
                                The link expires in <strong>1 hour</strong>.
                            </p>
                        </div>
                    )}
                </div>

                {!sent ? (
                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="email"
                                    placeholder="name@ideafueled.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    className={`w-full pl-11 pr-5 py-4 rounded-2xl border text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm text-sm
                                        ${submitted && !email.trim() ? 'border-red-400 bg-red-50/40' : 'border-slate-200/80 bg-slate-50/50'}`}
                                />
                            </div>
                            {submitted && !email.trim() && (
                                <p className="text-red-500 text-xs font-semibold ml-1 animate-in fade-in slide-in-from-top-1">
                                    Email is required.
                                </p>
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
                                    Sending reset link...
                                </span>
                            ) : "Send Reset Link"}
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
                    <div className="space-y-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                            <p className="text-sm font-medium text-emerald-700">
                                Didn't receive it? Check your spam or junk folder.
                            </p>
                        </div>
                        <button
                            onClick={handleRetry}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 rounded-2xl transition-all duration-200 text-sm"
                        >
                            Try a Different Email
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
