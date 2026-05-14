import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";

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

            <ProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                role={role}
                displayName={displayName}
                displayRole={displayRole}
                initial={initial}
            />
        </>
    );
};

export default Topbar;