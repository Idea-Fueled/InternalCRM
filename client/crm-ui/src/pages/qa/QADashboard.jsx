import React, { useState, useEffect } from 'react';
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
  MoreVertical, 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  X, 
  ShieldCheck, 
  FileText, 
  Send,
  AlertTriangle
} from 'lucide-react';

const PRIORITY_COLORS = {
    'Low': 'bg-slate-100 text-slate-600',
    'Medium': 'bg-blue-100 text-blue-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-rose-100 text-rose-700',
};

const QADashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ pendingReviewTasks: 0, completedTasks: 0, doneTasks: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTask, setSelectedTask] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

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
                setTasks(tasksRes.data.tasks.filter(t => t.status === "QA Review"));
            }
        } catch (error) {
            console.error("Failed to fetch QA dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const filteredTasks = tasks.filter(task => 
        task.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        task.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleApprove = async (taskId, e) => {
        if (e) e.stopPropagation();
        try {
            await taskService.updateTaskStatus(taskId, "Completed");
            setTasks(prev => prev.filter(t => t._id !== taskId));
            if (selectedTask?._id === taskId) setSelectedTask(null);
            fetchDashboardData();
        } catch (error) {
            console.error("Failed to approve task", error);
        }
    };

    const handleReject = async (taskId, e) => {
        if (e) e.stopPropagation();
        try {
            await taskService.updateTaskStatus(taskId, "In Progress");
            setTasks(prev => prev.filter(t => t._id !== taskId));
            if (selectedTask?._id === taskId) setSelectedTask(null);
            fetchDashboardData();
        } catch (error) {
            console.error("Failed to reject task", error);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="qa" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="QA Dashboard" role="qa" />
                
                <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quality Assurance Control</h1>
                            <p className="text-sm text-slate-500 mt-1">Review pending tasks and maintain quality standards.</p>
                        </div>
                    </div>

                    {/* KPI Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Total Tasks</p>
                                <p className="text-3xl font-bold text-slate-800">{stats.pendingReviewTasks + stats.completedTasks + stats.doneTasks}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <ClipboardCheck className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Pending Reviews</p>
                                <p className="text-3xl font-bold text-amber-600">{stats.pendingReviewTasks}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Approved Tasks</p>
                                <p className="text-3xl font-bold text-emerald-600">{stats.completedTasks}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Done Tasks</p>
                                <p className="text-3xl font-bold text-rose-600">{stats.doneTasks}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <XCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Pending Reviews Section */}
                        <div className="xl:col-span-2 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                    <ShieldCheck className="w-5 h-5 mr-2 text-indigo-500" />
                                    Pending Reviews
                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full ml-3">
                                        {tasks.length}
                                    </span>
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search reviews..." 
                                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-48 shadow-sm"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <button className="flex items-center justify-center p-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                                        <Filter className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {loading ? (
                                    <div className="text-center p-8 text-slate-500">Loading tasks...</div>
                                ) : filteredTasks.map(task => (
                                    <div 
                                        key={task._id}
                                        onClick={() => setSelectedTask(task)}
                                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                                    {task.project?.name || "No Project"}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium']}`}>
                                                    {task.priority || "Medium"}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-600 flex items-center border border-amber-100">
                                                    <Clock className="w-3 h-3 mr-1" /> {task.status}
                                                </span>
                                            </div>
                                            <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-2">
                                                {task.taskName}
                                            </h3>
                                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold uppercase">
                                                        {task.assignedTo?.name?.substring(0, 2) || "U"}
                                                    </div>
                                                    <span>{task.assignedTo?.name || "Unassigned"}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>Due {task.endDate ? new Date(task.endDate).toLocaleDateString() : "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 sm:pl-4 sm:border-l border-slate-100">
                                            <button 
                                                onClick={(e) => handleReject(task._id, e)}
                                                className="flex items-center justify-center px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold rounded-xl transition-colors border border-rose-100 w-full sm:w-auto"
                                            >
                                                <XCircle className="w-4 h-4 mr-1.5" />
                                                Reject
                                            </button>
                                            <button 
                                                onClick={(e) => handleApprove(task._id, e)}
                                                className="flex items-center justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200 w-full sm:w-auto"
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredTasks.length === 0 && (
                                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <ShieldCheck className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">All caught up!</h3>
                                        <p className="text-slate-500 text-sm">There are no tasks pending QA review at the moment.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity Section */}
                        <div className="xl:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                                    <ActivityIcon className="w-5 h-5 mr-2 text-blue-500" />
                                    Recent Activity
                                </h2>
                                <div className="space-y-6">
                                    {recentActivity.map((activity, index) => (
                                        <div key={activity.id} className="relative pl-6">
                                            {/* Timeline line */}
                                            {index !== recentActivity.length - 1 && (
                                                <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-slate-200" />
                                            )}
                                            
                                            {/* Timeline dot */}
                                            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
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
                                                <p className="text-sm font-bold text-indigo-600 my-0.5">{activity.task}</p>
                                                {activity.note && (
                                                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-2 mb-1">
                                                        Note: "{activity.note}"
                                                    </p>
                                                )}
                                                <p className="text-xs font-medium text-slate-400 mt-1">{activity.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {recentActivity.length === 0 && (
                                        <p className="text-sm text-slate-500 text-center py-4">No recent activity found.</p>
                                    )}
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
                                <button 
                                    onClick={() => setSelectedTask(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="flex gap-2 mb-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${PRIORITY_COLORS[selectedTask.priority]}`}>
                                        {selectedTask.priority} Priority
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                        {selectedTask.project}
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
                                    {selectedTask.title}
                                </h2>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assignee</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold uppercase">
                                                {selectedTask.assignedTo?.name?.substring(0,2) || "U"}
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
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-slate-400" />
                                        Task Description
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        {selectedTask.description}
                                    </p>
                                </div>

                                {selectedTask.developerNotes && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center">
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Developer Notes
                                        </h3>
                                        <p className="text-sm text-blue-800 leading-relaxed p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                            {selectedTask.developerNotes}
                                        </p>
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                                        <Paperclip className="w-4 h-4 mr-2 text-slate-400" />
                                        Attachments ({selectedTask.attachments.length})
                                    </h3>
                                    <div className="flex flex-col gap-2">
                                        {selectedTask.attachments.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors cursor-pointer group">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">{file.name}</p>
                                                        <p className="text-xs text-slate-400">{file.size}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-indigo-600 mb-3 flex items-center">
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        QA Review Notes
                                    </h3>
                                    <textarea 
                                        placeholder="Add notes before approving or rejecting..."
                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[120px] resize-none"
                                        defaultValue={selectedTask.qaNotes}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
                                <button 
                                    onClick={() => handleReject(selectedTask._id)}
                                    className="flex-1 flex items-center justify-center px-5 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-bold rounded-xl transition-colors shadow-sm"
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject & Return
                                </button>
                                <button 
                                    onClick={() => handleApprove(selectedTask._id)}
                                    className="flex-1 flex items-center justify-center px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-emerald-200"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Approve Task
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <style dangerouslySetInnerHTML={{__html: `
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                        height: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                `}} />
            </div>
        </div>
    );
};

// Simple Activity Icon component to avoid lucide-react import bloat at top
const ActivityIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

export default QADashboard;
