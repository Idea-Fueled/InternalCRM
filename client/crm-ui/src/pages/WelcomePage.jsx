import React, { useState, useEffect } from "react";
import logoImgNew from "../assets/logo-idea-fueled-new.png";
import { toast } from "sonner"
import { useNavigate } from "react-router-dom";
import { useLottie } from "lottie-react";
import welcomeLottie from "../../Lottie/welcome-page-lottie.json";
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

    const lottieOptions = {
        animationData: welcomeLottie,
        loop: true,
        autoplay: true,
    };
    const { View } = useLottie(lottieOptions, { className: "w-full h-auto drop-shadow-2xl" });

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
            // useEffect will handle navigation once user state updates
        } catch (err) {
            console.error("Login error:", err);
            const errorMsg = err.response?.data?.message || "Invalid credentials. Please try again.";
            toast.error(errorMsg);
            setFormData(prev => ({ ...prev, password: "" }));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-blue-200 selection:text-blue-900">
            {/* Left Section - Hero/Brand with Lottie */}
            <div className="hidden lg:flex w-1/2 bg-white relative overflow-hidden flex-col items-center justify-center p-16 xl:p-24 border-r border-slate-100">
                <div className="w-full max-w-lg xl:max-w-xl relative z-10 animate-in zoom-in-95 duration-1000 delay-200 fill-mode-both flex items-center justify-center">
                    {View}
                </div>
                <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between text-sm text-slate-400 font-medium z-10">
                    <p>© {new Date().getFullYear()} Idea Fueled. All rights reserved.</p>
                </div>
            </div>

            {/* Login Form Section */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-slate-50 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="flex items-center justify-center mb-10 animate-in fade-in slide-in-from-top-8 duration-700 delay-150 fill-mode-both">
                    <img 
                        src={logoImgNew} 
                        alt="Idea Fueled" 
                        className="h-16 w-auto hover:scale-105 transition-transform duration-300 drop-shadow-sm cursor-pointer" 
                    />
                </div>

                <div className="w-full max-w-md space-y-8 relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white animate-in fade-in zoom-in-95 duration-700 delay-300 fill-mode-both">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back</h2>
                        <p className="text-slate-500 mt-1.5 text-sm font-medium">Sign in to access your dashboard.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="name@ideafueled.com"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full px-5 py-4 rounded-2xl border ${submitted && !formData.email ? 'border-red-500 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50'} text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm`}
                            />
                            {submitted && !formData.email && (
                                <p className="text-red-500 text-xs font-semibold ml-1 mt-1 animate-in fade-in slide-in-from-top-1">Email is required!</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-sm font-semibold text-slate-700">Password</label>
                                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Forgot Password?</button>
                            </div>
                            <input
                                type="password"
                                name="password"
                                required
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full px-5 py-4 rounded-2xl border ${submitted && !formData.password ? 'border-red-500 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50'} text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm`}
                            />
                            {submitted && !formData.password && (
                                <p className="text-red-500 text-xs font-semibold ml-1 mt-1 animate-in fade-in slide-in-from-top-1">Password is required!</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || authLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Authenticating..." : (authLoading ? "Initializing..." : "Sign In to Idea Fueled")}
                        </button>
                    </form>

                    <div className="relative pt-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100"></div>
                        </div>
                        <div className="relative flex justify-center text-[11px] uppercase tracking-[0.2em] font-bold">
                            <span className="px-4 bg-transparent backdrop-blur-xl text-slate-400">Secure Internal Access</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}