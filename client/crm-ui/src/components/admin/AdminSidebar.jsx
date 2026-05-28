import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logoImg from "../../assets/IF-white.png";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import ProfileModal from "../ProfileModal";

const AdminSidebar = ({ role = "admin" }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        return localStorage.getItem("sidebarMinimized") === "true";
    });
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Profile Modal data
    const userRole = user?.role || (role === "teamLead" ? "TL" : role);
    const isEmployee = !["admin", "TL", "qa"].includes(userRole);
    const displayName = user?.name || (userRole === "TL" ? "Team Lead" : userRole === "qa" ? "QA" : isEmployee ? (userRole?.charAt(0).toUpperCase() + userRole?.slice(1)) : "Admin");
    const displayRole = userRole === 'TL' ? 'Team Lead' : (userRole?.charAt(0).toUpperCase() + userRole?.slice(1)) || "Role";
    const initial = displayName.charAt(0).toUpperCase();

    useEffect(() => {
        const handleToggle = () => setIsMobileOpen(prev => !prev);
        document.addEventListener('toggleMobileSidebar', handleToggle);
        return () => document.removeEventListener('toggleMobileSidebar', handleToggle);
    }, []);

    const toggleSidebar = () => {
        const newState = !isMinimized;
        setIsMinimized(newState);
        localStorage.setItem("sidebarMinimized", newState);
    };

    const handleLogout = async () => {
        try {
            setLoggingOut(true);
            await logout();
            toast.success("Logout successful");
            setTimeout(() => {
                navigate('/');
            }, 800);
        } catch (err) {
            console.error("Logout failed:", err);
            toast.error("Logout failed. Please try again.");
            setLoggingOut(false);
        }
    };

    const allPossibleTabs = [
        // Dashboards
        { path: "/admin/dashboard", label: "Dashboard", role: ["admin"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
        { path: "/teamLead/dashboard", label: "Dashboard", role: ["TL"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
        { path: "/employee/dashboard", label: "Dashboard", role: ["employee"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
        { path: "/qa/dashboard", label: "Dashboard", role: ["qa"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
        
        // Employees / Team
        { path: "/admin/employees", label: "Employees", permission: "users.create", orPermission: "users.update", orRole: ["admin"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { path: "/teamLead/team", label: "My Team", role: ["TL"], exceptPermission: "users.create", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
        { path: "/employee/my-team", label: "My Team", role: ["employee"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
        { path: "/qa/my-team", label: "My Team", role: ["qa"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },

        // Projects
        { path: "/admin/projects", label: "Projects", permission: "projects.create", orPermission: "projects.update", orRole: ["admin"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
        { path: "/teamLead/projects", label: "Projects", role: ["TL"], exceptPermission: "projects.create", icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
        { path: "/employee/projects", label: "Projects", role: ["employee"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
        { path: "/qa/projects", label: "Projects", role: ["qa"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },

        // Tasks / Kanban / Reviews
        { path: "/admin/kanban", label: "Kanban", role: ["admin"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h4v14H4zM10 5h4v14h-4zM16 5h4v14h-4z" /></svg> },
        { path: "/teamLead/kanban", label: "Kanban", role: ["TL"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h4v14H4zM10 5h4v14h-4zM16 5h4v14h-4z" /></svg> },
        { path: "/employee/my-tasks", label: "My Tasks", role: ["employee"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
        { path: "/employee/kanban", label: "Kanban", role: ["employee"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h4v14H4zM10 5h4v14h-4zM16 5h4v14h-4z" /></svg> },
        { path: "/qa/reviews", label: "Reviews", role: ["qa"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { path: "/qa/kanban", label: "Kanban", role: ["qa"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h4v14H4zM10 5h4v14h-4zM16 5h4v14h-4z" /></svg> },

        // Reports & Trash
        { path: "/admin/reports", label: "Reports", role: ["admin"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { path: "/teamLead/reports", label: "Reports", role: ["TL"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { path: "/employee/reports", label: "Reports", role: ["employee"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { path: "/qa/reports", label: "Reports", role: ["qa"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { path: "/admin/trash", label: "Trash", permission: "trash.view", orRole: ["admin"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> },
        
        // Audit Logs
        { path: "/admin/audit-logs", label: "Audit Logs", role: ["admin"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 9h.01M9 16h5m0 0h.01m-1.01 0H9" /></svg> },
        { path: "/teamLead/audit-logs", label: "Audit Logs", role: ["TL"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 9h.01M9 16h5m0 0h.01m-1.01 0H9" /></svg> },
        { path: "/employee/audit-logs", label: "Audit Logs", role: ["employee"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 9h.01M9 16h5m0 0h.01m-1.01 0H9" /></svg> },
        { path: "/qa/audit-logs", label: "Audit Logs", role: ["qa"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 9h.01M9 16h5m0 0h.01m-1.01 0H9" /></svg> },

        // Organization Tree
        { path: "/admin/organization-tree", label: "Org Tree", role: ["admin"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10a2 2 0 100-4 2 2 0 000 4zM12 10v4m0 0L8 18m4-4l4 4M4 18h16" /></svg> },
        { path: "/teamLead/organization-tree", label: "Org Tree", role: ["TL"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10a2 2 0 100-4 2 2 0 000 4zM12 10v4m0 0L8 18m4-4l4 4M4 18h16" /></svg> },
        { path: "/employee/organization-tree", label: "Org Tree", role: ["employee"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10a2 2 0 100-4 2 2 0 000 4zM12 10v4m0 0L8 18m4-4l4 4M4 18h16" /></svg> },
        { path: "/qa/organization-tree", label: "Org Tree", role: ["qa"], icon: <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10a2 2 0 100-4 2 2 0 000 4zM12 10v4m0 0L8 18m4-4l4 4M4 18h16" /></svg> }
    ];

    const userPermissions = user?.permissions || [];
    const isAdmin = userRole === 'admin';

    const getPortalName = () => {
        if (userRole === 'admin') return "Admin Portal";
        if (userRole === 'TL') return "Team Lead Portal";
        if (userRole === 'qa') return "QA Portal";
        if (isEmployee) return `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Portal`;
        return "Portal";
    };

    // Filter tabs dynamically based on user's role and custom permissions
    const filteredTabs = allPossibleTabs.filter(tab => {
        // 1. Check if the tab is excluded because of a specific granted permission (e.g. TL upgraded to admin menu)
        if (tab.exceptPermission && userPermissions.includes(tab.exceptPermission)) {
            return false;
        }

        // 2. If it has a specific permission requirement, let them see it if they have it (or if they are admin)
        if (tab.permission) {
            const hasRequiredPerm = userPermissions.includes(tab.permission) || 
                                   (tab.orPermission && userPermissions.includes(tab.orPermission));
            if (hasRequiredPerm || isAdmin) {
                return true;
            }
        }

        // 3. Otherwise, check if user has the specific role for this tab
        if (tab.role) {
            if (tab.role.includes("employee") && isEmployee) {
                return true;
            }
            if (tab.role.includes(userRole)) {
                return true;
            }
        }

        return false;
    });

    const currentConfig = {
        portalName: getPortalName(),
        tabs: filteredTabs
    };

    return (
        <>
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
            <div className={`fixed lg:static h-screen z-50 bg-[#0B1121] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1121] to-[#040814] text-slate-300 flex flex-col justify-between transition-all duration-300 border-r border-slate-800/60 no-scrollbar ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isMinimized ? 'lg:w-20' : 'lg:w-60 w-64'}`}>

            <button
                onClick={toggleSidebar}
                className="hidden lg:block absolute -right-3.5 top-9 bg-slate-800 text-slate-400 hover:text-white rounded-full p-1.5 shadow-lg shadow-black/40 border border-slate-700 z-50 hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
            >
                <svg className={`w-4 h-4 transition-transform duration-300 ${isMinimized ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <div className="p-4 flex-1 flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar">
                <div className={`flex flex-col mb-6 pb-4 border-b border-slate-800/60 transition-all duration-300 ${isMinimized ? 'items-center justify-center' : 'items-start px-3'}`}>
                    <div className="relative flex-shrink-0">
                        <img 
                            src={logoImg} 
                            alt="Idea Fueled" 
                            className={`transition-all duration-300 ${isMinimized ? 'w-10 h-10 object-cover object-left' : 'w-36 h-auto object-contain'}`} 
                        />
                    </div>
                </div>

                <nav className="flex flex-col gap-1 px-1">
                    {!isMinimized && <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1.5 px-3">Main Menu</div>}
                    {currentConfig.tabs.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `flex items-center gap-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group ${isMinimized ? 'justify-center px-0' : 'px-3'} ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30 font-semibold transform scale-[1.01]' : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-100'}`}
                            title={isMinimized ? item.label : ""}
                        >
                            <span className={`transition-colors ${isMinimized ? 'ml-0' : ''}`}>{item.icon}</span>
                            {!isMinimized && <span className="whitespace-nowrap text-sm">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className={`p-4 mt-auto transition-all duration-300 ${isMinimized ? 'flex flex-col items-center px-2' : 'px-5'}`}>
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={`group flex items-center justify-center gap-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-600 transition-all duration-300 font-medium tracking-wide shadow-sm disabled:opacity-70 disabled:cursor-not-allowed ${isMinimized ? 'px-0 w-10 h-10' : 'w-full px-4'}`}
                    title={isMinimized ? "Logout" : ""}
                >
                    {loggingOut ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 flex-shrink-0 transition-transform ${isMinimized ? '' : 'group-hover:-translate-x-1'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    )}
                    {!isMinimized && <span className="text-sm">{loggingOut ? 'Logging out...' : 'Logout'}</span>}
                </button>
            </div>
        </div>
        </>
    )
}

export default AdminSidebar;