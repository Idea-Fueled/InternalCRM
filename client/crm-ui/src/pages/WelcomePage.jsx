import React, { useState, useEffect } from "react";
import logoImgNew from "../assets/IF-black.png";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, X, Mail, Lock } from "lucide-react";
import { authService } from "../api/services";
import { useAuth } from "../context/AuthContext";

export default function WelcomePage() {
    const navigate = useNavigate();
    const { login, user, loading: authLoading } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);

    useEffect(() => {
        if (user && !authLoading) {
            console.log("Redirecting user based on role:", user.role);
            const roleRoutes = {
                admin: "/admin/dashboard",
                TL: "/teamlead/dashboard",
                developer: "/developer/dashboard",
                qa: "/qa/dashboard"
            };
            const target = roleRoutes[user.role] || "/admin/dashboard";
            navigate(target, { replace: true });
        }
    }, [user, authLoading, navigate]);

    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        
        const email = formData.email.trim();
        const password = formData.password.trim();

        if (!email || !password) {
            return;
        }

        try {
            setLoading(true);
            const res = await login({ email, password });
            toast.success(res.data.message || "Login successful");
        } catch (err) {
            console.error("Login error:", err);
            if (err.response?.status === 403 || err.response?.data?.isDeactivated) {
                setShowDeactivatedModal(true);
            } else {
                const errorMsg = err.response?.data?.message || "Invalid credentials. Please try again.";
                toast.error(errorMsg);
            }
            setFormData(prev => ({ ...prev, password: "" }));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans selection:bg-blue-200 selection:text-blue-900 relative overflow-hidden p-6 sm:p-8 lg:p-12">
            {/* Background Blur Gradients */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Logo container */}
            <div className="flex items-center justify-center mb-8 animate-in fade-in slide-in-from-top-8 duration-700 delay-150 fill-mode-both">
                <img 
                    src={logoImgNew} 
                    alt="Idea Fueled" 
                    className="h-16 w-auto drop-shadow-sm pointer-events-none select-none" 
                />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-[440px] space-y-8 relative z-10 bg-white/70 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-white animate-in fade-in zoom-in-95 duration-700 delay-300 fill-mode-both">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back</h2>
                    <p className="text-slate-500 mt-1.5 text-sm font-medium">Sign in to access your dashboard.</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="name@ideafueled.com"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full pl-11 pr-5 py-4 rounded-2xl border text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm text-sm
                                    ${submitted && !formData.email ? 'border-red-500 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50'}`}
                            />
                        </div>
                        {submitted && !formData.email && (
                            <p className="text-red-500 text-xs font-semibold ml-1 mt-1 animate-in fade-in slide-in-from-top-1">Email is required!</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-sm font-semibold text-slate-700">Password</label>
                            <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Forgot Password?</button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="password"
                                name="password"
                                required
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full pl-11 pr-5 py-4 rounded-2xl border text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm text-sm
                                    ${submitted && !formData.password ? 'border-red-500 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50'}`}
                            />
                        </div>
                        {submitted && !formData.password && (
                            <p className="text-red-500 text-xs font-semibold ml-1 mt-1 animate-in fade-in slide-in-from-top-1">Password is required!</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || authLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {loading ? "Authenticating..." : (authLoading ? "Initializing..." : "Sign In")}
                    </button>
                </form>

                <div className="pt-6 text-center text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400">
                    Secure Internal Access
                </div>
            </div>

            {/* Footer Copyright */}
            <p className="text-center text-xs text-slate-400 mt-8 relative z-10 font-medium">
                © {new Date().getFullYear()} Idea Fueled. All rights reserved.
            </p>

            {/* Deactivated Account Modal */}
            {showDeactivatedModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShowDeactivatedModal(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
                                <ShieldAlert className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Account Deactivated</h3>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                Your account has been deactivated. Please contact the management team or your system administrator for further assistance.
                            </p>
                            <button 
                                onClick={() => setShowDeactivatedModal(false)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}