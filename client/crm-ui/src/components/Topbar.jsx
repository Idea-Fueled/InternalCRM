import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationDropdown from "./NotificationDropdown";
import { X, User, Mail, Shield, Briefcase, Calendar } from "lucide-react";

const Topbar = ({ DashboardTile, role = "admin" }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    // Fallback display values if user context isn't ready
    const displayName = user?.name || (role === "teamLead" ? "Team Lead" : role === "developer" ? "Developer" : role === "qa" ? "QA" : "Admin");
    const displayRole = user?.role === 'TL' ? 'Team Lead' : (user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)) || "Role";
    const initial = displayName.charAt(0).toUpperCase();

    const toggleMobileSidebar = () => {
        document.dispatchEvent(new CustomEvent('toggleMobileSidebar'));
    };

    return (
        <>
            <div className="w-full bg-white px-4 sm:px-6 py-4 flex justify-between items-center shadow-sm z-40 relative">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleMobileSidebar}
                        className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex flex-col">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{DashboardTile}</h2>
                        <span className="text-xs text-gray-500 hidden sm:block">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <NotificationDropdown role={role} />

                    <div 
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-1 sm:px-2 py-1 rounded-lg transition group"
                    >
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-sm group-hover:scale-105 transition-transform ${role === 'teamLead' ? 'bg-indigo-600' : role === 'qa' ? 'bg-amber-500' : role === 'developer' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                            {initial}
                        </div>
                        <div className="hidden sm:flex flex-col">
                            <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{displayName}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">{displayRole}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Profile Modal */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsProfileModalOpen(false)}>
                    <div 
                        className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsProfileModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="pt-12 pb-10 px-8 text-center">
                            {/* Top Middle Icon */}
                            <div className="flex justify-center mb-6">
                                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500 ${role === 'teamLead' ? 'bg-indigo-600 shadow-indigo-200' : role === 'qa' ? 'bg-amber-500 shadow-amber-100' : role === 'developer' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-blue-600 shadow-blue-100'}`}>
                                    {initial}
                                </div>
                            </div>

                            {/* Name & Role */}
                            <div className="mb-10">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{displayName}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${role === 'teamLead' ? 'text-indigo-600 border-indigo-100 bg-indigo-50' : role === 'qa' ? 'text-amber-600 border-amber-100 bg-amber-50' : role === 'developer' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-blue-600 border-blue-100 bg-blue-50'}`}>
                                        {displayRole}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                    </span>
                                </div>
                            </div>

                            {/* Fields Grid */}
                            <div className="grid grid-cols-2 gap-3 text-left">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Email</p>
                                    <p className="text-[11px] font-bold text-slate-700 truncate">{user?.email || "N/A"}</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Role</p>
                                    <p className="text-[11px] font-bold text-slate-700 truncate">{displayRole}</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Department</p>
                                    <p className="text-[11px] font-bold text-slate-700 truncate">{user?.department || "Engineering"}</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Joined</p>
                                    <p className="text-[11px] font-bold text-slate-700 truncate">
                                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsProfileModalOpen(false)}
                                className={`w-full mt-8 py-3.5 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.98] shadow-lg ${role === 'teamLead' ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : role === 'qa' ? 'bg-amber-500 shadow-amber-50 hover:bg-amber-600' : role === 'developer' ? 'bg-emerald-600 shadow-emerald-50 hover:bg-emerald-700' : 'bg-blue-600 shadow-blue-50 hover:bg-blue-700'}`}
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Topbar;