import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationDropdown from "./NotificationDropdown";

const Topbar = ({ DashboardTile, role = "admin" }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Fallback display values if user context isn't ready
    const displayName = user?.name || (role === "teamLead" ? "Team Lead" : role === "developer" ? "Developer" : role === "qa" ? "QA" : "Admin");
    const displayRole = user?.role === 'TL' ? 'Team Lead' : (user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)) || "Role";
    const initial = displayName.charAt(0).toUpperCase();

    const toggleMobileSidebar = () => {
        document.dispatchEvent(new CustomEvent('toggleMobileSidebar'));
    };

    return (
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
                    <span className="text-xs text-gray-500 hidden sm:block">Today, Date</span>
                </div>
            </div>

            <div className="flex-1 flex justify-end md:justify-center px-4">
                <div className="relative w-full max-w-md hidden md:block">
                    <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
                    <div className="absolute left-3 top-2.5 text-gray-400">🔍</div>
                </div>
                <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    🔍
                </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <NotificationDropdown role={role} />

                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-1 sm:px-2 py-1 rounded-lg transition">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 text-white rounded-full flex items-center justify-center font-semibold text-sm ${role === 'teamLead' ? 'bg-indigo-600' : role === 'qa' ? 'bg-amber-500' : role === 'developer' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{initial}</div>
                    <div className="hidden sm:flex flex-col">
                        <span className="text-sm font-medium text-gray-700">{displayName}</span>
                        <span className="text-xs text-gray-400">{displayRole}</span>
                    </div>
                </div>

                <div className="hidden sm:flex w-9 h-9 bg-gray-100 rounded-full items-center justify-center hover:bg-gray-200 cursor-pointer transition">⚙️</div>
            </div>
        </div>
    );
};

export default Topbar;