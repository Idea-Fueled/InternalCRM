import React, { useState, useEffect, useRef } from 'react';
import { taskService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { 
    Bell, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    AlertTriangle,
    MessageSquare,
    ChevronRight
} from 'lucide-react';

const NotificationDropdown = ({ role }) => {
    const { user } = useAuth();
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
            const res = await taskService.getAllTasks();
            if (res.data.success) {
                const allTasks = res.data.tasks || [];
                const updates = [];

                allTasks.forEach(task => {
                    const history = task.statusHistory || [];
                    history.forEach(h => {
                        // Logic to decide if this notification is relevant to the current user
                        let relevant = false;
                        if (role === 'admin') relevant = true;
                        else if (role === 'teamLead' && task.project?.teamLead === user?._id) relevant = true;
                        else if (role === 'developer' && task.assignedTo?._id === user?._id) relevant = true;
                        else if (role === 'qa') relevant = true; // QA sees everything relevant to review

                        if (relevant) {
                            updates.push({
                                id: h._id,
                                taskId: task._id,
                                taskName: task.taskName,
                                status: h.status,
                                notes: h.notes,
                                timestamp: h.changedAt,
                                type: h.status === 'Completed' ? 'approve' : 
                                      h.status === 'In Progress' ? 'reject' : 'update'
                            });
                        }
                    });
                });

                // Sort by timestamp descending
                const sorted = updates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setNotifications(sorted.slice(0, 10)); // Top 10 notifications
                setUnreadCount(sorted.filter(n => new Date(n.timestamp) > new Date(Date.now() - 3600000)).length); // Count last hour as unread for demo
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [user, role]);

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
        if (!isOpen) setUnreadCount(0); // Mark as read when opening
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
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            Notifications
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Recent</span>
                        </h3>
                        <button className="text-[11px] font-bold text-blue-600 hover:underline">Mark all as read</button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading && notifications.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 italic">Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <Bell className="w-10 h-10 text-slate-100 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-400">All caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((n) => (
                                    <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <div className="flex gap-4">
                                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                                                n.type === 'approve' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                n.type === 'reject' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                                'bg-blue-50 border-blue-100 text-blue-600'
                                            }`}>
                                                {n.type === 'approve' ? <CheckCircle2 className="w-5 h-5" /> :
                                                 n.type === 'reject' ? <XCircle className="w-5 h-5" /> :
                                                 <Clock className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                                                        n.type === 'approve' ? 'text-emerald-600' :
                                                        n.type === 'reject' ? 'text-rose-600' :
                                                        'text-blue-600'
                                                    }`}>
                                                        {n.status}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">{getTimeAgo(n.timestamp)}</span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 truncate mb-1">
                                                    {n.taskName}
                                                </p>
                                                {n.notes && (
                                                    <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-100/50 p-2 rounded-lg border border-slate-100">
                                                        "{n.notes}"
                                                    </p>
                                                )}
                                                <div className="mt-2 flex items-center text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                    View Task <ChevronRight className="w-3 h-3 ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-slate-50 text-center">
                        <button className="text-xs font-bold text-slate-500 hover:text-slate-800 transition">View all activity</button>
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
