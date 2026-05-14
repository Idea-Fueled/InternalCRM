import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Bell, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    AlertTriangle,
    MessageSquare,
    ChevronRight,
    Trash2,
    Check
} from 'lucide-react';

const NotificationDropdown = ({ role }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const getTimeAgo = (timestamp) => {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await notificationService.getMyNotifications();
            if (res.data.success) {
                const notifs = res.data.notifications || [];
                setNotifications(notifs);
                setUnreadCount(notifs.filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        try {
            await notificationService.markAllAsRead();
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark all read:", error);
        }
    };

    const handleClearAll = async (e) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to clear all notifications?")) {
            try {
                await notificationService.clearAllNotifications();
                setNotifications([]);
                setUnreadCount(0);
            } catch (error) {
                console.error("Failed to clear notifications:", error);
            }
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await notificationService.deleteNotification(id);
            setNotifications(notifications.filter(n => n._id !== id));
            setUnreadCount(notifications.filter(n => n._id !== id && !n.isRead).length);
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const handleNotificationClick = async (n) => {
        if (!n.isRead) {
            try {
                await notificationService.markAsRead(n._id);
            } catch (error) {
                console.error("Failed to mark as read:", error);
            }
        }
        setIsOpen(false);
        if (n.link) {
            navigate(n.link);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={toggleDropdown}
                className="relative w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition group"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-600' : 'text-gray-500'} group-hover:scale-110 transition-transform`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{unreadCount} New</span>
                                )}
                            </h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
                                title="Mark all as read"
                            >
                                <Check className="w-3 h-3" /> Mark Read
                            </button>
                            <button 
                                onClick={handleClearAll}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                title="Clear all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                        {loading && notifications.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 italic">Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                    <Bell className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-sm font-medium text-slate-400">Your inbox is empty</p>
                                <p className="text-[11px] text-slate-300 mt-1 uppercase tracking-widest font-black">All caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((n) => {
                                    const isApprove = n.category === 'approval';
                                    const isReject = n.category === 'rejection';
                                    
                                    return (
                                        <div 
                                            key={n._id} 
                                            className={`p-4 hover:bg-slate-50 transition-all relative ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                                        >
                                            <div className="flex gap-4">
                                                <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 ${
                                                    isApprove ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                    isReject ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                                    'bg-blue-50 border-blue-100 text-blue-600'
                                                }`}>
                                                    {isApprove ? <CheckCircle2 className="w-6 h-6" /> :
                                                     isReject ? <XCircle className="w-6 h-6" /> :
                                                     n.type === 'project' ? <MessageSquare className="w-6 h-6" /> :
                                                     <Clock className="w-6 h-6" />}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                                                            isApprove ? 'text-emerald-600' :
                                                            isReject ? 'text-rose-600' :
                                                            'text-blue-600'
                                                        }`}>
                                                            {n.title}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">{getTimeAgo(n.createdAt)}</span>
                                                    </div>
                                                    
                                                    <p className={`text-[13px] leading-relaxed ${!n.isRead ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                                                        {n.message}
                                                    </p>
                                                    
                                                </div>
                                                
                                                <button 
                                                    onClick={(e) => handleDelete(e, n._id)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {!n.isRead && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-slate-50 text-center bg-slate-50/30">
                        <button 
                            onClick={() => {
                                setIsOpen(false);
                                navigate(`/${role === 'teamLead' ? 'teamLead' : role}/audit-logs`);
                            }}
                            className="text-[11px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition"
                        >
                            Activity Center
                        </button>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />
        </div>
    );
};

export default NotificationDropdown;
