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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header/Cover */}
                        <div className={`h-24 relative ${role === 'teamLead' ? 'bg-indigo-600' : role === 'qa' ? 'bg-amber-500' : role === 'developer' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                            <button 
                                onClick={() => setIsProfileModalOpen(false)}
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="absolute -bottom-10 left-8">
                                <div className="w-20 h-20 bg-white rounded-2xl p-1 shadow-lg">
                                    <div className={`w-full h-full rounded-xl flex items-center justify-center text-white text-2xl font-black ${role === 'teamLead' ? 'bg-indigo-600' : role === 'qa' ? 'bg-amber-500' : role === 'developer' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                                        {initial}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="pt-14 pb-8 px-8">
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{displayName}</h3>
                                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{displayRole}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</p>
                                        <p className="text-sm font-bold text-slate-700">{user?.email || "No email provided"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Role</p>
                                        <p className="text-sm font-bold text-slate-700">{displayRole}</p>
                                    </div>
                                </div>

                                {user?.department && (
                                    <div className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</p>
                                            <p className="text-sm font-bold text-slate-700">{user.department}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Member Since</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "N/A"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsProfileModalOpen(false)}
                                className="w-full mt-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
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