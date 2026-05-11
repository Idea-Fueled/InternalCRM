import React, { useState, useEffect } from 'react';
import { dashboardService, taskService } from '../../api/services';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import {
    CheckCircle2, Clock, AlertCircle, PlayCircle, ShieldCheck,
    Calendar, FileText, MessageSquare, AlertTriangle, ArrowRight,
    Activity, Star
} from 'lucide-react';

// RECENT_ACTIVITY will be handled by state

const STATUS_COLORS = {
    'New': 'bg-slate-100 text-slate-700 border-slate-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'QA Review': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const DeveloperDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [dashRes, tasksRes] = await Promise.all([
                dashboardService.getDeveloperDashboard(),
                taskService.getAllTasks()
            ]);
            
            // Format tasks
            const formattedTasks = (tasksRes.data.tasks || []).map(t => ({
                id: t._id,
                taskName: t.taskName,
                project: t.project?.name || "Unassigned",
                status: t.status || "New",
                startDate: t.startDate ? new Date(t.startDate).toLocaleDateString() : "N/A",
                endDate: t.endDate ? new Date(t.endDate).toLocaleDateString() : "N/A",
                priority: t.priority || "Medium",
                description: t.description || "",
                qaNotes: t.qaNotes || null,
                updates: [] // Backend doesn't support updates yet
            }));
            
            setTasks(formattedTasks);
            if (formattedTasks.length > 0) setSelectedTask(formattedTasks[0]);
            
        } catch (err) {
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
    }, []);

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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Tasks</p>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-extrabold text-slate-800">{totalAssigned}</span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> New</p>
                            <span className="text-3xl font-extrabold text-slate-700">{tasksNew}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center border-b-4 border-b-blue-500">
                            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center"><PlayCircle className="w-3.5 h-3.5 mr-1" /> In Progress</p>
                            <span className="text-3xl font-extrabold text-blue-700">{tasksInProgress}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center border-b-4 border-b-indigo-500">
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 flex items-center"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> QA Review</p>
                            <span className="text-3xl font-extrabold text-indigo-700">{tasksQA}</span>
                        </div>
                        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-center border-b-4 border-b-rose-500">
                            <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2 flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1" /> Overdue</p>
                            <span className="text-3xl font-extrabold text-rose-600">{overdueTasks.length}</span>
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
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-fit sticky top-8">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Task Details</h2>
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
                                                <div className="space-y-3">
                                                    {selectedTask.updates.map(update => (
                                                        <div key={update.id} className="flex items-start gap-3">
                                                            <div className="mt-0.5">
                                                                {update.type === 'status' && <Activity className="w-4 h-4 text-blue-400" />}
                                                                {update.type === 'comment' && <MessageSquare className="w-4 h-4 text-slate-400" />}
                                                                {update.type === 'qa' && <ShieldCheck className="w-4 h-4 text-rose-400" />}
                                                                {update.type === 'assignment' && <Star className="w-4 h-4 text-amber-400" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700">{update.text}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{update.time}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-5 border-t border-slate-100 flex gap-3">
                                            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm text-sm">
                                                Update Status
                                            </button>
                                            <button className="px-4 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                                                Add Comment
                                            </button>
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
                                <div className="p-5 space-y-4">
                                        <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col gap-3">
                                            <h4 className="font-semibold text-slate-800 text-sm mb-2">Recent Activity</h4>
                                            {recentActivity.map(activity => (
                                                <div key={activity.id} className="flex gap-3 items-start">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg">{activity.icon}</div>
                                                    <div>
                                                        <p className="text-sm text-slate-700 font-medium">{activity.text}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {recentActivity.length === 0 && <p className="text-sm text-slate-400">No recent activity</p>}
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
