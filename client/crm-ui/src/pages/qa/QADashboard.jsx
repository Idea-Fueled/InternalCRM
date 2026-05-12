import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { dashboardService, taskService } from '../../api/services';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Calendar, 
  Paperclip, 
  X, 
  ShieldCheck, 
  FileText,
  Activity
} from 'lucide-react';

const PRIORITY_COLORS = {
    'Low': 'bg-slate-100 text-slate-600 border-slate-200',
    'Medium': 'bg-blue-50 text-blue-700 border-blue-100',
    'High': 'bg-orange-50 text-orange-700 border-orange-100',
    'Critical': 'bg-rose-50 text-rose-700 border-rose-100',
};

const QADashboard = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ pendingReviewTasks: 0, completedTasks: 0, doneTasks: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTask, setSelectedTask] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState(null); // 'Approve' or 'Reject'
    const [actionTaskId, setActionTaskId] = useState(null);
    const [actionNote, setActionNote] = useState("");
    const [actionAttachment, setActionAttachment] = useState("");

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "N/A";
        const seconds = Math.floor((new Date() - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, tasksRes] = await Promise.all([
                dashboardService.getQADashboard(),
                taskService.getAllTasks()
            ]);
            
            if (statsRes.data.success) {
                setStats(statsRes.data.data);
            }
            if (tasksRes.data.success) {
                const allTasks = tasksRes.data.tasks || [];
                setTasks(allTasks.filter(t => t.status === "QA Review"));
                
                const activities = [];
                allTasks.forEach(t => {
                    (t.statusHistory || []).forEach(h => {
                        if (h.status === 'Completed' || h.status === 'In Progress') {
                            activities.push({
                                id: h._id,
                                type: h.status === 'Completed' ? 'Approve' : 'Reject',
                                task: t.taskName,
                                note: h.notes,
                                timestamp: new Date(h.changedAt).getTime()
                            });
                        }
                    });
                });
                setRecentActivity(activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
            }
        } catch (error) {
            console.error("Failed to fetch QA dashboard data:", error);
            if (error.response?.status === 401) {
                navigate("/");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const filteredTasks = tasks.filter(task => 
        task.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        task.project?.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openActionModal = (taskId, type, e) => {
        if (e) e.stopPropagation();
        setActionTaskId(taskId);
        setActionType(type);
        setActionNote("");
        setActionAttachment("");
        setIsActionModalOpen(true);
    };

    const handleActionSubmit = async () => {
        if (!actionTaskId || !actionType) return;
        const newStatus = actionType === 'Approve' ? 'Completed' : 'In Progress';
        try {
            await taskService.updateTaskStatus(actionTaskId, newStatus, actionNote, actionAttachment);
            setTasks(prev => prev.filter(t => t._id !== actionTaskId));
            if (selectedTask?._id === actionTaskId) setSelectedTask(null);
            setIsActionModalOpen(false);
            fetchDashboardData();
        } catch (error) {
            console.error(`Failed to ${actionType.toLowerCase()} task`, error);
        }
    };

    const handleApprove = (taskId, e) => openActionModal(taskId, 'Approve', e);
    const handleReject = (taskId, e) => openActionModal(taskId, 'Reject', e);

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="qa" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="QA Dashboard" role="qa" />
                
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        
                        {/* KPI Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {[
                                { label: 'Pending Reviews', value: stats.pendingReviewTasks, icon: <Clock className="w-5 h-5 text-amber-500" />, color: 'border-amber-500', bg: 'bg-amber-50/50' },
                                { label: 'Completed Today', value: stats.completedTasks, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, color: 'border-emerald-500', bg: 'bg-emerald-50/50' },
                                { label: 'Rejections Sent', value: stats.doneTasks, icon: <XCircle className="w-5 h-5 text-rose-500" />, color: 'border-rose-500', bg: 'bg-rose-50/50' },
                            ].map((stat, i) => (
                                <div key={i} className={`bg-white h-[90px] p-5 rounded-2xl border-b-4 ${stat.color} ${stat.bg} shadow-sm flex items-center justify-between transition-transform hover:scale-[1.02]`}>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                                        <p className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                                        {stat.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            {/* Main List Section */}
                            <div className="xl:col-span-2 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 p-4 rounded-2xl">
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center">
                                        <ShieldCheck className="w-6 h-6 mr-3 text-indigo-600" />
                                        Pending Reviews
                                        <span className="bg-indigo-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full ml-3 shadow-sm shadow-indigo-200">
                                            {tasks.length}
                                        </span>
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search reviews..." 
                                                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all w-full sm:w-64 shadow-sm"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <button className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                                            <Filter className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="flex items-center justify-center p-12">
                                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : filteredTasks.map(task => (
                                        <div 
                                            key={task._id}
                                            onClick={() => setSelectedTask(task)}
                                            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                                            {task.project?.projectName || task.project?.name || "No Project"}
                                                        </span>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium']}`}>
                                                            {task.priority || "Medium"}
                                                        </span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5" /> QA Review
                                                        </span>
                                                    </div>

                                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                                                        {task.taskName}
                                                    </h3>

                                                    <div className="flex flex-wrap items-center gap-5 text-sm font-bold text-slate-500">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                                                                {task.assignedTo?.name?.substring(0, 2).toUpperCase() || "U"}
                                                            </div>
                                                            <span className="text-slate-700">{task.assignedTo?.name || "Unassigned"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-400">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>Due {task.endDate ? new Date(task.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-300">
                                                            <Paperclip className="w-4 h-4" />
                                                            <span>{task.attachments?.length || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
                                                    <button 
                                                        onClick={(e) => handleReject(task._id, e)}
                                                        className="flex-1 lg:flex-none flex items-center justify-center px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold rounded-2xl transition-all border border-rose-100 active:scale-95"
                                                    >
                                                        <XCircle className="w-5 h-5 mr-2" />
                                                        Reject
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleApprove(task._id, e)}
                                                        className="flex-1 lg:flex-none flex items-center justify-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-emerald-200 active:scale-95"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                                        Approve
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredTasks.length === 0 && !loading && (
                                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                                <ShieldCheck className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-700">All caught up!</h3>
                                            <p className="text-slate-500 text-sm">No tasks pending QA review.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Activity Section */}
                            <div className="xl:col-span-1">
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sticky top-0">
                                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                                        <Activity className="w-5 h-5 mr-2 text-blue-500" />
                                        Recent Activity
                                    </h2>
                                    <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                                        {recentActivity.map((activity) => (
                                            <div key={activity.id} className="relative pl-8">
                                                <div className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${
                                                    activity.type === 'Approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                                }`}>
                                                    {activity.type === 'Approve' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        You <span className={activity.type === 'Approve' ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {activity.type === 'Approve' ? 'approved' : 'rejected'}
                                                        </span> task
                                                    </p>
                                                    <p className="text-sm font-bold text-indigo-600 my-0.5 hover:underline cursor-pointer transition-all leading-tight">
                                                        {activity.task}
                                                    </p>
                                                    {activity.note && (
                                                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 my-2">
                                                            <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                                                <span className="font-bold not-italic mr-1 text-slate-400">Note:</span> "{activity.note}"
                                                            </p>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                                        {getTimeAgo(activity.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {recentActivity.length === 0 && (
                                            <p className="text-sm text-slate-400 text-center py-4 italic">No recent activity.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Task Details Drawer */}
                {selectedTask && (
                    <div className="absolute inset-0 z-50 flex justify-end">
                        <div 
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setSelectedTask(null)}
                        />
                        <div className="w-full max-w-lg bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
                            
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-amber-100 text-amber-700 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" /> Pending Review
                                    </span>
                                </div>
                                <button onClick={() => setSelectedTask(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="flex gap-2 mb-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${PRIORITY_COLORS[selectedTask.priority] || PRIORITY_COLORS['Medium']}`}>
                                        {selectedTask.priority || 'Medium'} Priority
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                        {selectedTask.project?.projectName || selectedTask.project?.name || "No Project"}
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">{selectedTask.taskName}</h2>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assignee</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">
                                                {selectedTask.assignedTo?.name?.substring(0,2).toUpperCase() || "U"}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{selectedTask.assignedTo?.name || "Unassigned"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                                        <span className="text-sm font-bold text-slate-700">{selectedTask.endDate ? new Date(selectedTask.endDate).toLocaleDateString() : "N/A"}</span>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" /> Task Description
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        {selectedTask.description || "No description provided."}
                                    </p>
                                </div>

                                {selectedTask.statusHistory && selectedTask.statusHistory.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-indigo-500" /> Task Updates
                                        </h3>
                                        <div className="space-y-4">
                                            {selectedTask.statusHistory.slice().reverse().map((h, i) => (
                                                <div key={i} className="border-l-2 border-slate-100 pl-4 py-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{h.status}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{new Date(h.changedAt).toLocaleString()}</span>
                                                    </div>
                                                    {h.notes && <p className="text-xs text-slate-600 italic">"{h.notes}"</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                                <button 
                                    onClick={(e) => handleReject(selectedTask._id, e)}
                                    className="flex-1 flex items-center justify-center px-5 py-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-bold rounded-xl transition-all shadow-sm"
                                >
                                    <XCircle className="w-5 h-5 mr-2" /> Reject
                                </button>
                                <button 
                                    onClick={(e) => handleApprove(selectedTask._id, e)}
                                    className="flex-1 flex items-center justify-center px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-200"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" /> Approve
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Action Modal (Approve/Reject) */}
                {isActionModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <div 
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setIsActionModalOpen(false)}
                        />
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                            <div className={`p-6 flex items-center justify-between border-b ${actionType === 'Approve' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                <h3 className={`text-lg font-bold flex items-center gap-2 ${actionType === 'Approve' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {actionType === 'Approve' ? (
                                        <><CheckCircle2 className="w-5 h-5" /> Approve Task</>
                                    ) : (
                                        <><XCircle className="w-5 h-5" /> Reject Task</>
                                    )}
                                </h3>
                                <button onClick={() => setIsActionModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        {actionType === 'Approve' ? 'Approval Note' : 'Reason for Rejection'}
                                    </label>
                                    <textarea 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[120px] resize-none"
                                        placeholder={actionType === 'Approve' ? "Excellent work! Any final comments?" : "Please describe what needs to be fixed..."}
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                        <span>Attachment (Optional)</span>
                                        <span className="text-[10px] font-medium text-slate-400 normal-case">Link or File Name</span>
                                    </label>
                                    <div className="relative">
                                        <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                            placeholder="Paste attachment link or file name..."
                                            value={actionAttachment}
                                            onChange={(e) => setActionAttachment(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <button onClick={() => setIsActionModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleActionSubmit}
                                    className={`flex-[2] px-4 py-3 text-white font-bold rounded-xl transition-all shadow-lg ${
                                        actionType === 'Approve' 
                                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' 
                                        : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                                    }`}
                                >
                                    Confirm {actionType}
                                </button>
                            </div>
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
        </div>
    );
};

export default QADashboard;
