import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";
import NotificationDropdown from "./NotificationDropdown";
import GlobalSearchModal from "./GlobalSearchModal";
import { Search } from "lucide-react";

const Topbar = ({ DashboardTile, role = "admin" }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    // Fallback display values if user context isn't ready
    const displayName = user?.name || (role === "teamLead" ? "Team Lead" : role === "developer" ? "Developer" : role === "qa" ? "QA" : "Admin");
    const displayRole = user?.role === 'TL' ? 'Team Lead' : (user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)) || "Role";
    const initial = displayName.charAt(0).toUpperCase();

    const toggleMobileSidebar = () => {
        document.dispatchEvent(new CustomEvent('toggleMobileSidebar'));
    };

    // Listen for global open-global-search event (from Ctrl+K)
    useEffect(() => {
        const handleOpenSearch = () => setIsSearchOpen(true);
        window.addEventListener("open-global-search", handleOpenSearch);
        return () => window.removeEventListener("open-global-search", handleOpenSearch);
    }, []);

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
                    {/* ─── Search Trigger Bar ───────────────────────── */}
                    <button
                        id="global-search-trigger"
                        onClick={() => setIsSearchOpen(true)}
                        className="hidden sm:flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 transition-all duration-200 group cursor-pointer"
                    >
                        <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[13px] text-slate-400 group-hover:text-slate-500 font-medium transition-colors whitespace-nowrap">
                            Search CRM...
                        </span>
                        <kbd className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 ml-2 shadow-sm group-hover:border-blue-200 transition-colors">
                            ⌘K
                        </kbd>
                    </button>

                    {/* Mobile search icon */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="sm:hidden p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    <NotificationDropdown role={role} />

                    <div 
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-1 sm:px-2 py-1 rounded-lg transition group"
                    >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-sm group-hover:scale-105 transition-transform bg-blue-600 overflow-hidden">
                            {user?.profilePic ? (
                                <img src={user.profilePic} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                initial
                            )}
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

            <GlobalSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </>
    );
};

export default Topbar;