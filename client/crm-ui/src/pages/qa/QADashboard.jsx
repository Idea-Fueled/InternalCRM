import React, { useState, useEffect, useMemo } from 'react';
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
  Activity,
  AlertTriangle,
  Download
} from 'lucide-react';
import { exportPDF } from '../../utils/pdfExport';

const PRIORITY_COLORS = {
    'Low': 'bg-slate-100 text-slate-600 border-slate-200',
    'Medium': 'bg-blue-50 text-blue-700 border-blue-100',
    'High': 'bg-orange-50 text-orange-700 border-orange-100',
    'Critical': 'bg-rose-50 text-rose-700 border-rose-100',
};

const QADashboard = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ pendingReviewTasks: 0, completedTasks: 0, doneTasks: 0, overdueTasks: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTask, setSelectedTask] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectFilter, setProjectFilter] = useState('All');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    
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

    const [allTasksForStats, setAllTasksForStats] = useState([]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, tasksRes] = await Promise.all([
                dashboardService.getQADashboard(),
                taskService.getAllTasks()
            ]);
            
            if (statsRes.data.success) {
                setStats(prev => ({ ...prev, ...statsRes.data.data }));
            }
            if (tasksRes.data.success) {
                const allTasks = tasksRes.data.tasks || [];
                setAllTasksForStats(allTasks);
                setTasks(allTasks.filter(t => t.status === "QA Review"));
                
                const activities = [];
                allTasks.forEach(t => {
                    (t.statusHistory || []).forEach(h => {
                        if (h.status === 'Completed') {
                            activities.push({
                                id: h._id,
                                type: 'Approve',
                                task: t.taskName,
                                note: h.notes,
                                timestamp: new Date(h.changedAt).getTime()
                            });
                        } else if (h.status === 'In Progress' && h.changedBy?.role === 'qa') {
                            activities.push({
                                id: h._id,
                                type: 'Reject',
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

    // Derived stats based on project filter
    const displayStats = useMemo(() => {
        if (projectFilter === 'All') {
            const overdueCount = allTasksForStats.filter(t => t.status === "QA Review" && t.endDate && new Date(t.endDate) < new Date()).length;
            return { ...stats, overdueTasks: overdueCount };
        }

        const filtered = allTasksForStats.filter(t => {
            const projectName = t.project?.projectName || t.project?.name || 'Unassigned';
            return projectName === projectFilter;
        });

        return {
            pendingReviewTasks: filtered.filter(t => t.status === "QA Review").length,
            completedTasks: filtered.filter(t => t.status === "Completed").length,
            doneTasks: filtered.filter(t => t.status === "Done").length,
            overdueTasks: filtered.filter(t => t.status === "QA Review" && t.endDate && new Date(t.endDate) < new Date()).length
        };
    }, [stats, allTasksForStats, projectFilter]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const projectOptions = React.useMemo(() => {
        const seen = new Set();
        const opts = [];
        tasks.forEach(t => {
            const name = t.project?.projectName || t.project?.name || 'Unassigned';
            if (name !== 'Unassigned' && !seen.has(name)) {
                seen.add(name);
                opts.push(name);
            }
        });
        return opts.sort();
    }, [tasks]);

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             task.project?.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             task.project?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const projectName = task.project?.projectName || task.project?.name || 'Unassigned';
        const matchesProject = projectFilter === 'All' || projectName === projectFilter;
        
        return matchesSearch && matchesProject;
    });

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

    const handleExportQueue = () => {
        const columns = ["Task Name", "Project", "Priority", "Developer", "Due Date"];
        const data = filteredTasks.map(t => [
            t.taskName,
            t.project?.projectName || t.project?.name || "N/A",
            t.priority || "Medium",
            t.assignedTo?.name || "Unassigned",
            t.endDate ? new Date(t.endDate).toLocaleDateString() : "N/A"
        ]);
        exportPDF({
            title: "QA Pending Reviews Queue",
            filename: `qa_queue_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    const handleApprove = (taskId, e) => openActionModal(taskId, 'Approve', e);
    const handleReject = (taskId, e) => openActionModal(taskId, 'Reject', e);

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="qa" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="QA Dashboard" role="qa" />
                
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar">
                        
                        {/* KPI Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'PENDING', value: displayStats.pendingReviewTasks, icon: <Clock className="w-6 h-6" />, color: 'rose-600', border: 'border-rose-500', bg: 'bg-rose-50', iconColor: 'text-rose-500', iconBg: 'bg-white', labelColor: 'text-rose-400' },
                                { label: 'COMPLETED', value: displayStats.completedTasks, icon: <CheckCircle2 className="w-6 h-6" />, color: 'emerald-600', border: 'border-emerald-500', bg: 'bg-emerald-50', iconColor: 'text-emerald-500', iconBg: 'bg-white', labelColor: 'text-emerald-400' },
                                { label: 'OVERDUE', value: displayStats.overdueTasks, icon: <AlertTriangle className="w-6 h-6" />, color: 'rose-600', border: 'border-rose-500', bg: 'bg-rose-50', iconColor: 'text-rose-500', iconBg: 'bg-white', labelColor: 'text-rose-400' },
                                { label: 'REJECTED', value: displayStats.doneTasks, icon: <XCircle className="w-6 h-6" />, color: 'blue-600', border: 'border-blue-500', bg: 'bg-blue-50', iconColor: 'text-blue-500', iconBg: 'bg-white', labelColor: 'text-blue-400' },
                            ].map((stat, i) => (
                                <div key={i} className={`${stat.bg} h-[100px] p-5 rounded-2xl border-b-4 ${stat.border} shadow-sm flex items-center gap-6 transition-transform hover:scale-[1.02]`}>
                                    <div className={`w-12 h-12 ${stat.iconBg} rounded-full flex items-center justify-center ${stat.iconColor} shadow-sm border border-slate-100`}>
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-black ${stat.color} leading-none mb-1.5`}>{stat.value}</p>
                                        <p className={`text-[10px] font-black ${stat.labelColor} uppercase tracking-widest`}>{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            {/* Main List Section */}
                            <div className="xl:col-span-2 space-y-6">
                                <div className="flex items-center justify-between bg-white/50 p-4 rounded-2xl mb-2">
                                    <h2 className="section-title flex items-center">
                                        <ShieldCheck className="w-5 h-5 mr-2 text-indigo-500" />
                                        Pending Reviews
                                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full ml-3">
                                            {tasks.length}
                                        </span>
                                    </h2>
                                     <div className="flex items-center gap-2">
                                        <button 
                                            onClick={handleExportQueue}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Queue
                                        </button>
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

                                        {/* Project Filter Dropdown */}
                                        <div className="relative">
                                            <button 
                                                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                                className={`flex items-center justify-center p-2 bg-white border ${projectFilter !== 'All' ? 'border-indigo-500 text-indigo-600 ring-2 ring-indigo-500/10' : 'border-slate-200 text-slate-600'} rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm group`}
                                                title="Filter by Project"
                                            >
                                                <Filter className={`w-4 h-4 ${projectFilter !== 'All' ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                                            </button>

                                            {isFilterDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
                                                        <div className="px-4 py-2 border-b border-slate-50">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter by Project</p>
                                                        </div>
                                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                            <button
                                                                onClick={() => {
                                                                    setProjectFilter('All');
                                                                    setIsFilterDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${projectFilter === 'All' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}
                                                            >
                                                                All Projects
                                                                {projectFilter === 'All' && <ShieldCheck className="w-4 h-4" />}
                                                            </button>
                                                            {projectOptions.map(proj => (
                                                                <button
                                                                    key={proj}
                                                                    onClick={() => {
                                                                        setProjectFilter(proj);
                                                                        setIsFilterDropdownOpen(false);
                                                                    }}
                                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${projectFilter === proj ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}
                                                                >
                                                                    {proj}
                                                                    {projectFilter === proj && <ShieldCheck className="w-4 h-4" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="text-center p-8 text-slate-500 font-medium italic">Loading tasks...</div>
                                    ) : filteredTasks.map(task => (
                                        <div 
                                            key={task._id}
                                            onClick={() => setSelectedTask(task)}
                                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                                        {task.project?.projectName || task.project?.name || "No Project"}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium']}`}>
                                                        {task.priority || "Medium"}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-600 flex items-center border border-amber-100">
                                                        <Clock className="w-3 h-3 mr-1" /> QA Review
                                                    </span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-2">
                                                    {task.taskName}
                                                </h3>
                                                <div className="flex flex-wrap gap-4 mt-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold overflow-hidden shrink-0">
                                                            {task.assignedTo?.profilePic ? (
                                                                <img src={task.assignedTo.profilePic} alt={task.assignedTo.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                task.assignedTo?.name?.charAt(0) || "U"
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-slate-700 leading-tight">{task.assignedTo?.name || "Unassigned"}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Developer</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold overflow-hidden shrink-0">
                                                            {task.assignedQA?.profilePic ? (
                                                                <img src={task.assignedQA.profilePic} alt={task.assignedQA.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                task.assignedQA?.name?.charAt(0) || "Q"
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-slate-700 leading-tight">{task.assignedQA?.name || "Not Assigned"}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">QA Reviewer</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mt-3">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>Due {task.endDate ? new Date(task.endDate).toLocaleDateString() : "N/A"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-slate-300">
                                                        <Paperclip className="w-3.5 h-3.5" />
                                                        <span>{task.attachments?.length || 0}</span>
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
                                    {filteredTasks.length === 0 && !loading && (
                                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center opacity-60">
                                            <ShieldCheck className="w-12 h-12 text-slate-300 mb-4" />
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
                                            <div key={activity.id} className="relative pl-12">
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
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Developer</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                                                {selectedTask.assignedTo?.profilePic ? (
                                                    <img src={selectedTask.assignedTo.profilePic} alt={selectedTask.assignedTo.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    selectedTask.assignedTo?.name?.charAt(0) || "U"
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 truncate">{selectedTask.assignedTo?.name || "Unassigned"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">QA Reviewer</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                                                {selectedTask.assignedQA?.profilePic ? (
                                                    <img src={selectedTask.assignedQA.profilePic} alt={selectedTask.assignedQA.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    selectedTask.assignedQA?.name?.charAt(0) || "Q"
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 truncate">{selectedTask.assignedQA?.name || "Not Assigned"}</span>
                                        </div>
                                    </div>
                                </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                                        <span className="text-sm font-bold text-slate-700">{selectedTask.endDate ? new Date(selectedTask.endDate).toLocaleDateString() : "N/A"}</span>
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
                                                     <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                         <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{h.status}</span>
                                                         <span className="text-[10px] text-slate-400 font-bold">{new Date(h.changedAt).toLocaleString()}</span>
                                                         <span className="text-[10px] text-slate-300">•</span>
                                                         <span className="text-[10px] text-indigo-500 font-bold">by {h.changedBy?.name || 'System'}</span>
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
