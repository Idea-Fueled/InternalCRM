import React, { useState, useEffect } from 'react';
import { dashboardService, taskService } from '../../api/services';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    CheckCircle2, Clock, AlertCircle, PlayCircle, ShieldCheck,
    Calendar, FileText, MessageSquare, AlertTriangle, ArrowRight,
    Activity, Star, ClipboardList
} from 'lucide-react';

// RECENT_ACTIVITY will be handled by state

const STATUS_COLORS = {
    'New': 'bg-slate-100 text-slate-700 border-slate-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'QA Review': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Done': 'bg-emerald-500 text-white border-emerald-600',
};

const DeveloperDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboardData = async () => {
        if (!user?._id) return;
        try {
            setLoading(true);
            const [dashRes, tasksRes] = await Promise.all([
                dashboardService.getDeveloperDashboard(),
                taskService.getTasksByUser(user._id)
            ]);
            
            // Format tasks
            const formattedTasks = (tasksRes.data.tasks || []).map(t => ({
                id: t._id,
                taskName: t.taskName,
                project: t.project?.projectName || t.project?.name || "Unassigned",
                status: t.status || "New",
                startDate: t.startDate ? new Date(t.startDate).toLocaleDateString() : "N/A",
                endDate: t.endDate ? new Date(t.endDate).toLocaleDateString() : "N/A",
                priority: t.priority || "Medium",
                description: t.description || "",
                qaNotes: t.qaNotes || null,
                updates: (t.statusHistory || []).map(h => ({
                    id: h._id,
                    type: h.status === 'QA Review' ? 'qa' : 'status',
                    status: h.status,
                    notes: h.notes,
                    time: new Date(h.changedAt).toLocaleString()
                })).reverse()
            }));
            
            setTasks(formattedTasks);
            if (formattedTasks.length > 0) setSelectedTask(formattedTasks[0]);
            
            // Extract recent activity from all tasks
            const activities = [];
            (tasksRes.data.tasks || []).forEach(t => {
                (t.statusHistory || []).forEach(h => {
                    activities.push({
                        id: h._id,
                        text: `${t.taskName} marked as ${h.status}`,
                        time: new Date(h.changedAt).toLocaleString(),
                        icon: h.status === 'QA Review' ? <ShieldCheck className="w-4 h-4 text-indigo-500" /> : <Activity className="w-4 h-4 text-blue-500" />,
                        timestamp: new Date(h.changedAt).getTime()
                    });
                });
            });
            
            setRecentActivity(activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
            
            if (formattedTasks.length > 0) setSelectedTask(formattedTasks[0]);
            
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            if (err.response?.status === 401) {
                navigate("/");
            }
            setError(err.response?.data?.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // 30s polling
        return () => clearInterval(interval);
    }, [user]);

    // Calculate KPIs
    const totalAssigned = tasks.length;
    const tasksNew = tasks.filter(t => t.status === 'New').length;
    const tasksInProgress = tasks.filter(t => t.status === 'In Progress').length;
    const tasksQA = tasks.filter(t => t.status === 'QA Review').length;

    // Simulate an overdue task
    const overdueTasks = tasks.filter(t => new Date(t.endDate) < new Date());

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="developer" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="My Workspace" role="developer" />

                <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back, Developer!</h1>
                        <p className="text-sm text-slate-500 mt-1">Here is a summary of your assigned tasks and current workload.</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium">
                            {error}
                        </div>
                    ) : (
                    <>
                    {/* KPI Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                        <div className="premium-stat-card slate flex-row items-center gap-4 p-4 h-[90px]">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-slate-800 leading-none mb-1">{totalAssigned}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tasks</p>
                            </div>
                        </div>
                        <div className="premium-stat-card slate flex-row items-center gap-4 p-4 h-[90px]">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-slate-800 leading-none mb-1">{tasksNew}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New</p>
                            </div>
                        </div>
                        <div className="premium-stat-card blue flex-row items-center gap-4 p-4 h-[90px]">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                                <PlayCircle className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-blue-700 leading-none mb-1">{tasksInProgress}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">In Progress</p>
                            </div>
                        </div>
                        <div className="premium-stat-card indigo flex-row items-center gap-4 p-4 h-[90px]">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-indigo-700 leading-none mb-1">{tasksQA}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">QA Review</p>
                            </div>
                        </div>
                        <div className="premium-stat-card rose flex-row items-center gap-4 p-4 h-[90px]">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-rose-100 text-rose-600">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-rose-600 leading-none mb-1">{overdueTasks.length}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Overdue</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Tasks List & Deadlines */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Upcoming / Overdue Deadlines Highlight */}
                            {overdueTasks.length > 0 && (
                                <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5">
                                    <h3 className="text-sm font-bold text-rose-800 mb-3 flex items-center">
                                        <AlertTriangle className="w-4 h-4 mr-2 text-rose-600" />
                                        Requires Immediate Attention
                                    </h3>
                                    <div className="space-y-3">
                                        {overdueTasks.map(task => (
                                            <div key={task.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-rose-100 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800 text-sm">{task.taskName}</span>
                                                    <span className="text-xs text-rose-600 font-medium mt-0.5">Due: {task.endDate} (Overdue)</span>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedTask(task)}
                                                    className="px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* My Tasks Overview */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-blue-500" />
                                        My Tasks Overview
                                    </h2>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {tasks.length === 0 ? (
                                        <div className="p-20 text-center flex flex-col items-center justify-center opacity-40">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                <FileText className="w-10 h-10 text-slate-400" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800">No tasks assigned</h3>
                                            <p className="text-sm font-medium text-slate-500 mt-1">Enjoy your free time or contact your Admin!</p>
                                        </div>
                                    ) : (
                                        tasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedTask(task)}
                                                className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${selectedTask?.id === task.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                            {task.project}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_COLORS[task.status]}`}>
                                                            {task.status}
                                                        </span>
                                                    </div>
                                                    <h3 className={`font-semibold text-base ${selectedTask?.id === task.id ? 'text-blue-700' : 'text-slate-800'}`}>
                                                        {task.taskName}
                                                    </h3>
                                                    <div className="flex items-center text-xs text-slate-500 mt-2 font-medium">
                                                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                        {task.startDate} - <span className={new Date(task.endDate) < new Date() ? 'text-rose-500 ml-1 font-bold' : 'ml-1'}>{task.endDate}</span>
                                                    </div>
                                                </div>
                                                <div className="ml-4 text-slate-400">
                                                    <ArrowRight className={`w-5 h-5 transition-transform ${selectedTask?.id === task.id ? 'text-blue-500 translate-x-1' : ''}`} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Right Column: Task Details & Activity */}
                        <div className="space-y-8">

                            {/* Task Details Preview */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-fit mb-8 relative z-10">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        Task Details
                                    </h2>
                                </div>

                                {selectedTask ? (
                                    <div className="p-6">
                                        <div className="mb-4">
                                            <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-md border mb-3 ${STATUS_COLORS[selectedTask.status]}`}>
                                                {selectedTask.status}
                                            </span>
                                            <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2">{selectedTask.taskName}</h3>
                                            <p className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block">Project: {selectedTask.project}</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                                                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Description
                                                </h4>
                                                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    {selectedTask.description}
                                                </p>
                                            </div>

                                            {selectedTask.qaNotes && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center">
                                                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> QA Feedback
                                                    </h4>
                                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800 leading-relaxed">
                                                        {selectedTask.qaNotes}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Task Updates</h4>
                                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {selectedTask.updates.map(update => (
                                                        <div key={update.id} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0">
                                                            <div className="mt-0.5 shrink-0">
                                                                {update.type === 'status' && <Activity className="w-4 h-4 text-blue-400" />}
                                                                {update.type === 'comment' && <MessageSquare className="w-4 h-4 text-slate-400" />}
                                                                {update.type === 'qa' && <ShieldCheck className="w-4 h-4 text-indigo-400" />}
                                                                {update.type === 'assignment' && <Star className="w-4 h-4 text-amber-400" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold text-slate-700">{update.status}</p>
                                                                    {!update.notes && <p className="text-sm text-slate-400 font-medium">— No notes</p>}
                                                                </div>
                                                                {update.notes && (
                                                                    <div className={`mt-1.5 p-3 rounded-xl text-sm leading-relaxed ${
                                                                        update.status === 'In Progress' 
                                                                        ? 'bg-blue-50 border border-blue-100 text-blue-700 shadow-sm shadow-blue-50/50' 
                                                                        : 'bg-slate-50 border border-slate-100 text-slate-600'
                                                                    }`}>
                                                                        {update.notes}
                                                                    </div>
                                                                )}
                                                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">{update.time}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {selectedTask.updates.length === 0 && (
                                                        <p className="text-xs text-slate-400 italic">No updates recorded yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-5 border-t border-slate-100">
                                            {['QA Review', 'Completed', 'Done'].includes(selectedTask.status) ? (
                                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                                    <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-1 flex items-center justify-center">
                                                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Action Restricted
                                                    </p>
                                                    <p className="text-[11px] text-amber-600 font-medium">
                                                        Status is currently <span className="font-bold underline">{selectedTask.status}</span>. 
                                                        Only Admins or Team Leads can modify this task now.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={() => navigate(`/developer/kanban?project=${encodeURIComponent(selectedTask.project)}`)}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm text-sm"
                                                    >
                                                        Update Status
                                                    </button>
                                                    <button 
                                                        onClick={() => navigate(`/developer/kanban?project=${encodeURIComponent(selectedTask.project)}`)}
                                                        className="px-4 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                                    >
                                                        Add Comment
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                                        <FileText className="w-12 h-12 mb-3 text-slate-200" />
                                        <p>Select a task to view details</p>
                                    </div>
                                )}
                            </div>

                            {/* Global Recent Activity */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
                                        <Activity className="w-4 h-4 mr-2 text-indigo-500" />
                                        Recent Notifications
                                    </h2>
                                </div>
                                <div className="p-5">
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {recentActivity.map(activity => (
                                            <div key={activity.id} className="flex gap-3 items-start pb-3 border-b border-slate-50 last:border-0">
                                                <div className="p-2 bg-slate-50 rounded-xl shrink-0">{activity.icon}</div>
                                                <div>
                                                    <p className="text-sm text-slate-700 font-medium leading-tight">{activity.text}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{activity.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {recentActivity.length === 0 && (
                                            <div className="py-10 text-center">
                                                <p className="text-sm text-slate-400">No recent activity recorded.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    </>
                    )}
                </main>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}} />
            </div>
        </div>
    );
};

export default DeveloperDashboard;
