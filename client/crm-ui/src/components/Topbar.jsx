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
                        className="bg-white w-full max-w-sm rounded-[24px] shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 relative border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsProfileModalOpen(false)}
                            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="pt-10 pb-8 px-6 text-center">
                            {/* Simple Profile Icon */}
                            <div className="flex justify-center mb-5">
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-md ${role === 'teamLead' ? 'bg-indigo-500' : role === 'qa' ? 'bg-amber-500' : role === 'developer' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                    {initial}
                                </div>
                            </div>

                            {/* Name & Role - Less Bold */}
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-slate-800 mb-1">{displayName}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${role === 'teamLead' ? 'text-indigo-600 bg-indigo-50' : role === 'qa' ? 'text-amber-600 bg-amber-50' : role === 'developer' ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>
                                        {displayRole}
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                    </span>
                                </div>
                            </div>

                            {/* Info Fields - Stacked for full visibility */}
                            <div className="space-y-3 text-left">
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email Address</p>
                                    <p className="text-sm font-medium text-slate-700 break-all">{user?.email || "N/A"}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Role</p>
                                        <p className="text-sm font-medium text-slate-700">{displayRole}</p>
                                    </div>
                                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department</p>
                                        <p className="text-sm font-medium text-slate-700">{user?.department || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Account Joined</p>
                                    <p className="text-sm font-medium text-slate-700">
                                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "N/A"}
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsProfileModalOpen(false)}
                                className={`w-full mt-8 py-3 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] ${role === 'teamLead' ? 'bg-indigo-600 hover:bg-indigo-700' : role === 'qa' ? 'bg-amber-500 hover:bg-amber-600' : role === 'developer' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
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