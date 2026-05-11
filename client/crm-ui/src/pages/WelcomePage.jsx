import React from "react";
import Logo from "../components/Logo";
import { toast } from "sonner"
import { useNavigate } from "react-router-dom";
import { useLottie } from "lottie-react";
import welcomeLottie from "../../Lottie/welcome-page-lottie.json";

export default function WelcomePage() {
    const navigate = useNavigate();
    const lottieOptions = {
        animationData: welcomeLottie,
        loop: true,
        autoplay: true,
    };
    const { View } = useLottie(lottieOptions, { className: "w-full h-auto drop-shadow-2xl" });

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-blue-200 selection:text-blue-900">
            {/* Left Section - Hero/Brand with Lottie */}
            <div className="hidden lg:flex w-1/2 bg-white relative overflow-hidden flex-col items-center justify-center p-16 xl:p-24 border-r border-slate-100">
                


                {/* Lottie Animation Container */}
                <div className="w-full max-w-lg xl:max-w-xl relative z-10 animate-in zoom-in-95 duration-1000 delay-200 fill-mode-both flex items-center justify-center">
                    {View}
                </div>

                {/* Footer info */}
                <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between text-sm text-slate-400 font-medium z-10">
                    <p>© {new Date().getFullYear()} Idea Fueled. All rights reserved.</p>
                </div>
            </div>

            {/* Login Form Section */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-slate-50 overflow-hidden">

                {/* Subtle Background Accents */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Company Logo above login card */}
                <div className="flex items-center justify-center gap-3 mb-10 animate-in fade-in slide-in-from-top-8 duration-700 delay-150 fill-mode-both">
                    <Logo className="h-16 w-auto hover:scale-105 transition-transform duration-300 drop-shadow-sm" />
                    <div className="text-3xl font-bold tracking-tight">
                        <span className="text-black">Idea</span> <span className="text-blue-600">Fueled</span>
                    </div>
                </div>

                <div className="w-full max-w-md space-y-8 relative z-10 bg-white/70 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white animate-in fade-in zoom-in-95 duration-700 delay-300 fill-mode-both">

                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back</h2>
                        <p className="text-slate-500 mt-1.5 text-sm font-medium">Sign in to access your dashboard.</p>
                    </div>

                    <form className="space-y-6" onSubmit={(e) => {
                        e.preventDefault();
                        toast.success("Login successfully");
                        navigate("/admin/dashboard");
                    }}>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                            <input
                                type="email"
                                placeholder="name@ideafueled.com"
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 shadow-sm"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <input type="checkbox" className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded focus:outline-none focus:ring-4 focus:ring-blue-500/20 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer" />
                                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                            </label>

                            <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                Forgot password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
                        >
                            Sign In to Idea Fueled
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