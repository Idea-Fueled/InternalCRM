import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { notificationService } from "../../api/services";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
    Bell, Trash2, CheckCircle2, AlertCircle, XCircle, Info, 
    ArrowRight, MessageSquare, Trash, Sparkles
} from "lucide-react";

const getUserDesignationLabel = (m) => {
    if (!m) return "";
    const designation = m.designation || "";
    const role = m.role || "";
    
    const titleCase = (str) => {
        if (!str) return "";
        return str.split(" ")
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
    };

    if (designation && designation.trim() !== "" && designation.toLowerCase() !== role.toLowerCase()) {
        return titleCase(designation.trim());
    }

    const resolvedRole = role.toLowerCase();
    if (resolvedRole === "admin") return "Admin";
    if (resolvedRole === "tl" || resolvedRole === "teamlead" || resolvedRole === "team_lead") return "Technical Team Lead";
    if (resolvedRole === "qa") return "Senior QA";
    if (resolvedRole === "hr") return "HR Executive";
    if (resolvedRole === "developer") return "Developer";
    if (resolvedRole === "employee") return "Employee";
    
    if (designation) return titleCase(designation);
    return titleCase(role);
};

const HRNotifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const res = await notificationService.getMyNotifications();
            if (res.data?.success) {
                setNotifications(res.data.notifications || []);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            toast.error("Failed to load notifications.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            const res = await notificationService.markAsRead(id);
            if (res.data?.success) {
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
                toast.success("Notification marked as read!");
            }
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Avoid triggering click-through
        try {
            const res = await notificationService.deleteNotification(id);
            if (res.data?.success) {
                setNotifications(prev => prev.filter(n => n._id !== id));
                toast.success("Notification removed.");
            }
        } catch (err) {
            console.error("Failed to delete notification:", err);
            toast.error("Failed to remove notification.");
        }
    };

    const handleClearAll = async () => {
        try {
            const res = await notificationService.clearAllNotifications();
            if (res.data?.success) {
                setNotifications([]);
                toast.success("All notifications cleared!");
            }
        } catch (err) {
            console.error("Failed to clear notifications:", err);
            toast.error("Failed to clear notification center.");
        }
    };

    const handleNotificationClick = (notif) => {
        // Mark as read in background
        if (!notif.isRead) {
            handleMarkAsRead(notif._id);
        }

        // Navigate based on details or link
        if (notif.link) {
            navigate(notif.link);
        } else {
            // Fallbacks based on category
            if (notif.category === "creation" || notif.category === "update" || notif.category === "status_change") {
                navigate("/hr/employees");
            } else if (notif.category === "approval" || notif.category === "rejection") {
                navigate("/hr/leaves");
            }
        }
    };

    return (
        <div className="flex h-screen bg-slate-50/50 text-slate-800 overflow-hidden font-sans">
            <AdminSidebar role="hr" />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
                <Topbar DashboardTile="Notifications" role="hr" />
                
                <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-3xl w-full mx-auto">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/60 shadow-sm rounded-[24px] p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                                <Bell className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-black text-slate-800">Inbox Alerts</h1>
                                <p className="text-slate-500 text-xs font-semibold mt-0.5">Stay updated on leave applications, employee lifecycle changes, and workflow assignments.</p>
                            </div>
                        </div>
                        {notifications.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0"
                            >
                                <Trash className="w-3.5 h-3.5" />
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Feed Block */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-500 text-xs font-bold font-sans">Synchronizing alert logs...</span>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-slate-200/60 border-dashed rounded-[28px] p-6 shadow-sm">
                            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-500">All caught up!</h3>
                            <p className="text-slate-400 text-xs mt-1">There are no unread system notifications in your feed.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map(notif => {
                                const isUnread = !notif.isRead;
                                
                                let alertIcon = <Info className="w-4 h-4 text-blue-500" />;
                                let badgeColor = "bg-blue-50 text-blue-600 border-blue-200";
                                
                                if (notif.category === "approval" || notif.category === "creation") {
                                    alertIcon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                                    badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-200";
                                } else if (notif.category === "rejection" || notif.category === "deletion") {
                                    alertIcon = <XCircle className="w-4 h-4 text-rose-500" />;
                                    badgeColor = "bg-rose-50 text-rose-600 border-rose-200";
                                } else if (notif.category === "status_change") {
                                    alertIcon = <AlertCircle className="w-4 h-4 text-amber-500" />;
                                    badgeColor = "bg-amber-50 text-amber-600 border-amber-200";
                                }

                                return (
                                    <div
                                        key={notif._id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-4 bg-white border rounded-2xl cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex gap-4 items-start shadow-sm ${
                                            isUnread ? "border-blue-300 bg-blue-50/30 relative" : "border-slate-200/60 opacity-80"
                                        }`}
                                    >
                                        {/* Unread Glow Indicator */}
                                        {isUnread && (
                                            <span className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                        )}

                                        <div className={`p-2 border rounded-xl shrink-0 mt-0.5 ${badgeColor}`}>
                                            {alertIcon}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-xs font-black text-slate-800 truncate">{notif.title}</h4>
                                                <span className={`px-1.5 py-0.5 border rounded text-[8px] font-black uppercase tracking-wider ${badgeColor}`}>
                                                    {notif.category}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                                            <div className="flex items-center gap-3 mt-3 text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                                                <span>Sender: {notif.sender ? `${getUserDesignationLabel(notif.sender)} ${notif.sender.name}`.trim() : "System"}</span>
                                                <span>•</span>
                                                <span>{new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 shrink-0 self-center">
                                            <button
                                                onClick={(e) => handleDelete(notif._id, e)}
                                                className="p-2 border border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl transition-all cursor-pointer"
                                                title="Delete notification"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default HRNotifications;
