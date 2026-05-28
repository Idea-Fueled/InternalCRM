import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { dashboardService, projectService, userService, taskService } from '../../api/services';
import { 
  CheckCircle2, 
  Clock, 
  FolderKanban, 
  ListTodo, 
  TrendingUp, 
  Users, 
  AlertCircle,
  Activity,
  Calendar,
  Bell,
  ArrowRight,
  AlertTriangle,
  Percent,
  ChevronRight
} from 'lucide-react';
import StatDetailModal from '../../components/StatDetailModal';

const TeamLeadDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalTeamTasks: 0,
        activeProjects: 0,
        qaReviewTasks: 0,
        overdueTasks: 0,
        totalTeamMembers: 0,
        completedTasks: 0,
        pendingTasks: 0,
        teamProductivity: 0
    });
    const [teamMembers, setTeamMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [pendingQAReviews, setPendingQAReviews] = useState([]);
    const [overdueTasksList, setOverdueTasksList] = useState([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "N/A";
        const seconds = Math.floor((new Date() - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [dashRes, projRes, usersRes, tasksRes] = await Promise.all([
                    dashboardService.getTeamLeadDashboard(),
                    projectService.getAllProjects(),
                    userService.getAllUsers(),
                    taskService.getAllTasks()
                ]);

                let allTasksFetched = [];
                if (tasksRes.data?.success) {
                    allTasksFetched = tasksRes.data.tasks || [];
                    setAllTasks(allTasksFetched);
                }

                let mappedProjects = [];
                if (projRes.data?.success) {
                    mappedProjects = (projRes.data.projects || []).map(p => ({
                        ...p,
                        id: p._id,
                        name: p.projectName
                    }));
                    setProjects(mappedProjects);
                }

                let computedMembers = [];
                if (usersRes.data?.success) {
                    const allUsers = usersRes.data.data || [];
                    const teamUsers = allUsers.filter(u => u.role === "developer" || u.role === "qa");
                    
                    computedMembers = teamUsers.map((u, i) => {
                        const userTasks = allTasksFetched.filter(t => t.assignedTo?._id === u._id);
                        const completed = userTasks.filter(t => t.status === "Completed" || t.status === "Done").length;
                        const overdue = userTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length;
                        const total = userTasks.length;
                        const pending = total - completed;
                        const status = u.status === "inactive" ? "Inactive" : (pending === 0 ? "Free" : "Busy");
                        const workload = total > 0 ? Math.round((pending / total) * 100) : 0;
                        const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-orange-500', 'bg-slate-500'];
                        
                        return {
                            id: u._id,
                            name: u.name,
                            role: u.role,
                            email: u.email,
                            initial: u.name?.substring(0, 2).toUpperCase() || "U",
                            total,
                            completed,
                            overdue,
                            status,
                            workload,
                            color: colors[i % colors.length],
                            profilePic: u.profilePic
                        };
                    });
                    setTeamMembers(computedMembers);
                }

                // Compute KPI States
                const totalTasksCount = allTasksFetched.length;
                const completedTasksCount = allTasksFetched.filter(t => t.status === "Completed" || t.status === "Done").length;
                const qaTasksCount = allTasksFetched.filter(t => t.status === "QA Review").length;
                const overdueTasksCount = allTasksFetched.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length;
                const pendingTasksCount = totalTasksCount - completedTasksCount - qaTasksCount;
                const productivity = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

                setStats({
                    totalTeamTasks: totalTasksCount,
                    activeProjects: mappedProjects.filter(p => p.status === "Active" || !p.status).length,
                    qaReviewTasks: qaTasksCount,
                    overdueTasks: overdueTasksCount,
                    totalTeamMembers: computedMembers.length,
                    completedTasks: completedTasksCount,
                    pendingTasks: pendingTasksCount,
                    teamProductivity: productivity
                });

                // Set Functional Sub-lists
                const qaList = allTasksFetched.filter(t => t.status === "QA Review");
                setPendingQAReviews(qaList);

                const overdueList = allTasksFetched.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done");
                setOverdueTasksList(overdueList);

                // Upcoming deadlines (next 4 days)
                const now = new Date();
                const limitDate = new Date();
                limitDate.setDate(now.getDate() + 4);
                const upcoming = allTasksFetched.filter(t => 
                    t.status !== "Completed" && 
                    t.status !== "Done" && 
                    t.endDate && 
                    new Date(t.endDate) >= now && 
                    new Date(t.endDate) <= limitDate
                ).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
                setUpcomingDeadlines(upcoming);

                // Compute Live Activity Log
                const activities = [];
                allTasksFetched.forEach(t => {
                    (t.statusHistory || []).forEach(h => {
                        activities.push({
                            id: h._id,
                            type: h.status,
                            task: t.taskName,
                            user: h.changedBy?.name || "Someone",
                            timestamp: new Date(h.changedAt).getTime()
                        });
                    });
                });
                setRecentActivity(activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15));

                // Compute Dynamic Notifications List
                const notifs = [];
                if (overdueTasksCount > 0) {
                    notifs.push({
                        id: 'notif-overdue',
                        type: 'danger',
                        title: 'Overdue Backlog Threat',
                        message: `${overdueTasksCount} sprint tasks are past their deadline. Immediate re-assignment required.`,
                        time: 'Just now'
                    });
                }
                if (qaTasksCount > 0) {
                    notifs.push({
                        id: 'notif-qa',
                        type: 'warning',
                        title: 'QA Review Bottleneck',
                        message: `${qaTasksCount} task(s) are awaiting verification. Deploy developers for QA.`,
                        time: '12m ago'
                    });
                }
                // Add task assignment events
                allTasksFetched.slice(0, 3).forEach((t, index) => {
                    notifs.push({
                        id: `notif-assign-${index}`,
                        type: 'info',
                        title: 'Workload Allocated',
                        message: `"${t.taskName}" assigned to ${t.assignedTo?.name || 'Unassigned Developer'}.`,
                        time: t.updatedAt ? getTimeAgo(new Date(t.updatedAt).getTime()) : `${index + 1 * 15}m ago`
                    });
                });
                setNotifications(notifs.slice(0, 4));

            } catch (error) {
                console.error("Failed to fetch Team Lead Dashboard records", error);
                if (error.response?.status === 401) {
                    navigate("/");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [navigate]);

    // KPI configurations
    const kpiWidgets = [
        {
            title: "Team Members",
            value: stats.totalTeamMembers,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "blue",
            onClick: () => setStatModal({ isOpen: true, title: "Team Members", data: teamMembers, type: "employee" })
        },
        {
            title: "Active Projects",
            value: stats.activeProjects,
            icon: FolderKanban,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "indigo",
            onClick: () => setStatModal({ isOpen: true, title: "Active Projects", data: projects, type: "project" })
        },
        {
            title: "Pending Tasks",
            value: stats.pendingTasks,
            icon: ListTodo,
            color: "text-sky-600",
            bg: "bg-sky-50",
            border: "sky",
            onClick: () => setStatModal({ isOpen: true, title: "Pending Tasks Queue", data: allTasks.filter(t => t.status !== "Completed" && t.status !== "Done" && t.status !== "QA Review"), type: "task" })
        },
        {
            title: "Completed Tasks",
            value: stats.completedTasks,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "emerald",
            onClick: () => setStatModal({ isOpen: true, title: "Completed Tasks", data: allTasks.filter(t => t.status === "Completed" || t.status === "Done"), type: "task" })
        },
        {
            title: "QA Review Tasks",
            value: stats.qaReviewTasks,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "amber",
            onClick: () => setStatModal({ isOpen: true, title: "Awaiting QA Reviews", data: pendingQAReviews, type: "task" })
        },
        {
            title: "Overdue Tasks",
            value: stats.overdueTasks,
            icon: AlertCircle,
            color: "text-rose-600",
            bg: "bg-rose-50",
            border: "rose",
            onClick: () => setStatModal({ isOpen: true, title: "Overdue Backlog List", data: overdueTasksList, type: "task" })
        }
    ];


    // Overdue tasks groupings
    const overdueGroupHigh = overdueTasksList.filter(t => t.priority === "High" || t.priority === "Critical").length;
    const overdueGroupMed = overdueTasksList.filter(t => t.priority === "Normal").length;
    const overdueGroupLow = overdueTasksList.filter(t => t.priority === "Low" || !t.priority).length;

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800 selection:bg-blue-200 selection:text-blue-900">
            <AdminSidebar role="teamLead" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Team Lead Workspace" role="teamLead" />
                
                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-500">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Overview</h1>
                            <p className="text-slate-500 text-sm font-semibold mt-1">Operational analytics and workload distribution overview.</p>
                        </div>
                    </div>

                    {/* KPI Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-6 animate-in fade-in duration-700 delay-100 fill-mode-both">
                        {kpiWidgets.map((kpi, idx) => (
                            <div 
                                key={idx} 
                                onClick={kpi.onClick}
                                className={`premium-stat-card ${kpi.border} flex flex-col sm:flex-row sm:items-center items-start gap-3 sm:gap-4 p-4 sm:p-5 h-[115px] sm:h-[90px] w-full justify-start cursor-pointer`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                                    <kpi.icon className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex flex-col justify-center min-w-0 w-full">
                                    <h4 className="text-2xl font-extrabold tracking-tight text-slate-800 leading-none mb-1">{kpi.value}</h4>
                                    <p className="text-[10px] font-semibold text-slate-400 truncate">{kpi.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Visual Analytics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-700 delay-200 fill-mode-both">
                        
                        {/* Task Progress donut */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <ListTodo className="w-4 h-4 text-blue-500" />
                                    Team Task Progress
                                </h3>
                                <div className="flex items-center justify-center py-4 relative">
                                    {/* SVG Donut */}
                                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                        {stats.totalTeamTasks > 0 ? (
                                            <>
                                                {/* Completed */}
                                                <circle 
                                                    cx="60" cy="60" r="50" fill="transparent" 
                                                    stroke="#10b981" strokeWidth="12" 
                                                    strokeDasharray={`${(stats.completedTasks / stats.totalTeamTasks) * 314.16} 314.16`}
                                                    strokeDashoffset="0"
                                                    className="transition-all duration-1000"
                                                />
                                                {/* QA Review */}
                                                <circle 
                                                    cx="60" cy="60" r="50" fill="transparent" 
                                                    stroke="#f59e0b" strokeWidth="12" 
                                                    strokeDasharray={`${(stats.qaReviewTasks / stats.totalTeamTasks) * 314.16} 314.16`}
                                                    strokeDashoffset={`-${(stats.completedTasks / stats.totalTeamTasks) * 314.16}`}
                                                    className="transition-all duration-1000"
                                                />
                                                {/* Pending */}
                                                <circle 
                                                    cx="60" cy="60" r="50" fill="transparent" 
                                                    stroke="#3b82f6" strokeWidth="12" 
                                                    strokeDasharray={`${(stats.pendingTasks / stats.totalTeamTasks) * 314.16} 314.16`}
                                                    strokeDashoffset={`-${((stats.completedTasks + stats.qaReviewTasks) / stats.totalTeamTasks) * 314.16}`}
                                                    className="transition-all duration-1000"
                                                />
                                            </>
                                        ) : (
                                            <circle cx="60" cy="60" r="50" fill="transparent" stroke="#cbd5e1" strokeWidth="12" />
                                        )}
                                    </svg>
                                    <div className="absolute flex flex-col items-center justify-center text-center">
                                        <span className="text-3xl font-black text-slate-800 leading-none">{stats.totalTeamTasks}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Tasks</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-4 mt-2">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                        <span className="text-xs font-bold text-slate-700">{stats.completedTasks}</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-400">Done</span>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        <span className="text-xs font-bold text-slate-700">{stats.qaReviewTasks}</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-400">In QA</span>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                        <span className="text-xs font-bold text-slate-700">{stats.pendingTasks}</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-400">Todo</span>
                                </div>
                            </div>
                        </div>

                        {/* Team Member Workload Chart */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <Users className="w-4 h-4 text-indigo-500" />
                                    Team Performance Stack
                                </h3>
                                <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                    {teamMembers.slice(0, 4).map((dev, idx) => (
                                        <div key={idx} className="flex flex-col">
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-[10px] text-indigo-600 uppercase overflow-hidden shrink-0">
                                                        {dev.profilePic ? <img src={dev.profilePic} alt={dev.name} className="w-full h-full object-cover" /> : dev.initial}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{dev.name}</span>
                                                </div>
                                                <span className="text-slate-500 font-semibold">{dev.completed}/{dev.total} Completed</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                                    <div 
                                                        className="bg-emerald-500 h-full rounded-l-full transition-all"
                                                        style={{ width: `${dev.total > 0 ? (dev.completed / dev.total) * 100 : 0}%` }}
                                                    />
                                                    <div 
                                                        className="bg-blue-400 h-full rounded-r-full transition-all"
                                                        style={{ width: `${dev.total > 0 ? ((dev.total - dev.completed) / dev.total) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 w-8 text-right">
                                                    {dev.total > 0 ? Math.round((dev.completed / dev.total) * 100) : 0}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end pt-3 mt-2 border-t border-slate-50">
                                <Link to="/teamLead/team" className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group">
                                    Allocate Team Staff <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        {/* Project Progress Tracker */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <FolderKanban className="w-4 h-4 text-indigo-500" />
                                    Project Progress Overview
                                </h3>
                                <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                    {projects.slice(0, 3).map((project, idx) => {
                                        const total = project.tasks?.length || 0;
                                        const completed = project.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0;
                                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                                        const barColor = pct > 75 ? 'bg-emerald-500' : pct > 40 ? 'bg-indigo-500' : 'bg-amber-500';

                                        return (
                                            <div key={idx} className="flex flex-col">
                                                <div className="flex justify-between items-center text-xs mb-1.5">
                                                    <span className="font-bold text-slate-700 truncate max-w-[160px]">{project.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        {completed}/{total} Tasks
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 w-8 text-right">{pct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex justify-end pt-3 mt-2 border-t border-slate-50">
                                <Link to="/teamLead/projects" className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group">
                                    Track Milestones <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </div>
                        </div>
                        {/* Overdue Tasks Timeline priority card */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <AlertCircle className="w-4 h-4 text-rose-500" />
                                    Overdue Tasks Timeline & Risk Factor
                                </h3>
                                <p className="text-slate-500 text-xs font-semibold mb-4 leading-relaxed">
                                    Overdue tasks pose delivery blockers. Grouped below by assigned task urgency metrics:
                                </p>
                                <div className="space-y-4">
                                    {/* High Urgency */}
                                    <div className="flex items-center justify-between p-3.5 bg-red-50/50 border border-red-100 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                                                <AlertTriangle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-700">Critical / High Severity</h4>
                                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Overdue sprint backlog blocks</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-black text-red-600">{overdueGroupHigh}</span>
                                    </div>

                                    {/* Medium Urgency */}
                                    <div className="flex items-center justify-between p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-700">Normal Priority</h4>
                                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Secondary sprint components</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-black text-amber-600">{overdueGroupMed}</span>
                                    </div>

                                    {/* Low Urgency */}
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-700">Low Priority</h4>
                                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Flexible backlog items</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-black text-slate-600">{overdueGroupLow}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Functional Columns Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-700 delay-400 fill-mode-both">
                        
                        {/* Column 1: Team Members Table */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm xl:col-span-2 flex flex-col justify-between hover:shadow-md transition-shadow overflow-hidden">
                            <div>
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        Team Members Overview
                                    </h3>
                                    <Link to="/teamLead/team" className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group">
                                        Performance Panel <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>
                                <div className="overflow-x-auto scrollbar-thin">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                                <th className="px-6 py-3 font-bold">Staff Member</th>
                                                <th className="px-6 py-3 font-bold">Workload Status</th>
                                                <th className="px-6 py-3 font-bold text-center">Metrics</th>
                                                <th className="px-6 py-3 font-bold">Load Indicator</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {teamMembers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400 text-sm font-medium">
                                                        No active developers or QAs configured
                                                    </td>
                                                </tr>
                                            ) : (
                                                teamMembers.map((member) => (
                                                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-xl ${member.color} text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden`}>
                                                                    {member.profilePic ? (
                                                                        <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        member.initial
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{member.name}</p>
                                                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 capitalize">{member.role}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                                                member.status === 'Inactive' ? 'bg-slate-50 text-slate-500 border border-slate-200' :
                                                                member.status === 'Free' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                                    member.status === 'Inactive' ? 'bg-slate-400' : 'bg-emerald-500'
                                                                }`}></span>
                                                                {member.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="inline-flex items-baseline gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                                                                <span className="text-slate-800">{member.completed}</span>
                                                                <span className="text-slate-400">/{member.total}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full ${
                                                                            member.workload > 80 ? 'bg-rose-500' : 
                                                                            member.workload > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                                                        }`}
                                                                        style={{ width: `${member.workload}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-500">{member.workload}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Log column */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    Recent Team Activity
                                </h3>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {recentActivity.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center text-center py-12 text-slate-400">
                                            <Activity className="w-8 h-8 text-slate-200 mb-2" />
                                            <p className="text-xs font-semibold">No recent work activity logged</p>
                                        </div>
                                    ) : (
                                        recentActivity.map((activity, idx) => (
                                            <div key={idx} className="flex gap-3 relative pb-1">
                                                {idx !== recentActivity.length - 1 && (
                                                    <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-slate-100" />
                                                )}
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                                                    activity.type === 'Completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                                                    activity.type === 'QA Review' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                                                }`}>
                                                    <Activity className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-700 leading-normal">
                                                        <span className="font-bold text-slate-800">{activity.user}</span> updated <span className="font-semibold text-slate-900">"{activity.task}"</span> to <span className="font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">{activity.type}</span>
                                                    </p>
                                                    <span className="text-[9px] font-bold text-slate-400 mt-1 block uppercase tracking-wider">{getTimeAgo(activity.timestamp)}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Operational Rows Strip */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-700 delay-500 fill-mode-both">
                        
                        {/* Pending QA reviews */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow xl:col-span-2 overflow-hidden flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    Pending QA Reviews Queue ({pendingQAReviews.length})
                                </h3>
                                <div className="overflow-x-auto scrollbar-thin">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                                <th className="px-6 py-2.5 font-bold">Task Name</th>
                                                <th className="px-6 py-2.5 font-bold">Assigned Staff</th>
                                                <th className="px-6 py-2.5 font-bold text-center">Urgency</th>
                                                <th className="px-6 py-2.5 font-bold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {pendingQAReviews.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-medium">
                                                        QA Review Queue is fully empty and cleared!
                                                    </td>
                                                </tr>
                                            ) : (
                                                pendingQAReviews.map((task) => (
                                                    <tr key={task._id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-3 font-semibold text-slate-800 max-w-[200px] truncate">
                                                            {task.taskName}
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-500 font-medium">
                                                            {task.assignedTo?.name || 'Unassigned'}
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${
                                                                task.priority === 'High' || task.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                            }`}>
                                                                {task.priority || 'Normal'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <button 
                                                                onClick={() => navigate('/teamLead/tasks')}
                                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 cursor-pointer"
                                                            >
                                                                Review <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Recent System Notifications Feed */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <Bell className="w-4 h-4 text-violet-500" />
                                    Workspace Notifications
                                </h3>
                                <div className="space-y-4 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center text-center py-10 text-slate-400">
                                            <Bell className="w-8 h-8 text-slate-200 mb-2" />
                                            <p className="text-xs font-semibold">No new alerts</p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div key={notif.id} className="flex items-start gap-3 py-2 border-b border-slate-100/50 last:border-0">
                                                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                                    notif.type === 'danger' ? 'bg-rose-500 animate-pulse' : 
                                                    notif.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                                }`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-slate-700 leading-normal">
                                                        {notif.message}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">{notif.time}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Overdue Task Items & Upcoming deadlines alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-700 delay-500 fill-mode-both">
                        
                        {/* Overdue queue detail */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <AlertCircle className="w-4 h-4 text-rose-500" />
                                    Critical Overdue Tasks ({overdueTasksList.length})
                                </h3>
                                <div className="overflow-x-auto scrollbar-thin">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                                <th className="px-6 py-2.5 font-bold">Delayed Task</th>
                                                <th className="px-6 py-2.5 font-bold">Assignee</th>
                                                <th className="px-6 py-2.5 font-bold">Expired Due Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {overdueTasksList.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="px-6 py-8 text-center text-slate-400 font-medium">
                                                        No overdue sprint tasks detected.
                                                    </td>
                                                </tr>
                                            ) : (
                                                overdueTasksList.slice(0, 5).map((task) => (
                                                    <tr key={task._id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-3 font-semibold text-slate-800 truncate max-w-[180px]">
                                                            {task.taskName}
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-500 font-semibold">
                                                            {task.assignedTo?.name || 'Unassigned'}
                                                        </td>
                                                        <td className="px-6 py-3 text-rose-600 font-bold">
                                                            {task.endDate ? new Date(task.endDate).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming deadlines queue */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                    Upcoming Deadlines (Next 96 Hours)
                                </h3>
                                <div className="overflow-x-auto scrollbar-thin">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                                <th className="px-6 py-2.5 font-bold">Upcoming Task</th>
                                                <th className="px-6 py-2.5 font-bold">Assignee</th>
                                                <th className="px-6 py-2.5 font-bold">Target Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {upcomingDeadlines.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="px-6 py-8 text-center text-slate-400 font-medium">
                                                        No upcoming deadlines in the next 96 hours.
                                                    </td>
                                                </tr>
                                            ) : (
                                                upcomingDeadlines.slice(0, 5).map((task) => (
                                                    <tr key={task._id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-3 font-semibold text-slate-800 truncate max-w-[180px]">
                                                            {task.taskName}
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-500 font-semibold">
                                                            {task.assignedTo?.name || 'Unassigned'}
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-800 font-bold">
                                                            {task.endDate ? new Date(task.endDate).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>

                </main>
                
                {/* Embedded global styling for clean scrollbars */}
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
            
            <StatDetailModal 
                isOpen={statModal.isOpen} 
                onClose={() => setStatModal({ ...statModal, isOpen: false })} 
                title={statModal.title} 
                data={statModal.data} 
                type={statModal.type} 
            />
        </div>
    );
};

export default TeamLeadDashboard;