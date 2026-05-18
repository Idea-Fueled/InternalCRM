import React, { useState } from "react";
import logoImgNew from "../assets/logo-idea-fueled-new.png";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        
        if (!email.trim()) {
            return;
        }

        try {
            setLoading(true);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success("Password reset instructions sent to your email.");
            navigate("/");
        } catch (err) {
            toast.error("Failed to process request. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans selection:bg-blue-200 selection:text-blue-900 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md space-y-8 relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white animate-in fade-in zoom-in-95 duration-700">
                <div className="flex flex-col items-center justify-center mb-6">
                    <img 
                        src={logoImgNew} 
                        alt="Idea Fueled" 
                        className="h-16 w-auto mb-6 hover:scale-105 transition-transform duration-300 drop-shadow-sm cursor-pointer" 
                        onClick={() => navigate("/")}
                    />
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Forgot Password?</h2>
                        <p className="text-slate-500 mt-2 text-sm font-medium px-4">Enter your email address and we'll send you instructions to reset your password.</p>
                    </div>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="name@ideafueled.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full px-5 py-4 rounded-2xl border ${submitted && !email.trim() ? 'border-red-500 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50'} text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm`}
                        />
                        {submitted && !email.trim() && (
                            <p className="text-red-500 text-xs font-semibold ml-1 mt-1 animate-in fade-in slide-in-from-top-1">Email is required!</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
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
