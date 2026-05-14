import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";

import { dashboardService, projectService, userService, taskService } from "../../api/services";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { exportPDF } from "../../utils/pdfExport";

// Reusable Card Component
const Card = ({ children, className = "" }) => (
    <div className={`premium-card ${className}`}>
        {children}
    </div>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [recentTasks, setRecentTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [newProject, setNewProject] = useState({
        projectName: "",
        description: "",
        teamLead: "",
        startDate: "",
        endDate: "",
        teamMembers: []
    });
    const [isCreating, setIsCreating] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dashRes, projRes, userRes, taskRes] = await Promise.all([
                dashboardService.getAdminDashboard(),
                projectService.getAllProjects(),
                userService.getAllUsers(),
                taskService.getAllTasks()
            ]);
            
            setDashboardData(dashRes.data.data);
            setProjects(projRes.data.projects || []);
            setUsers(userRes.data.data || []);
            
            // Sort tasks by most recently created
            const sortedTasks = (taskRes.data.tasks || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRecentTasks(sortedTasks.slice(0, 5));
        } catch (err) {
            if (err.response?.status === 401) {
                navigate("/");
            }
            setError(err.response?.data?.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleExportDashboard = () => {
        if (!dashboardData) {
            toast.error("No data available to export");
            return;
        }
        
        const columns = ["Metric", "Count/Value"];
        const data = [
            ["Total Employees", dashboardData.totalEmployees],
            ["Total Projects", dashboardData.totalProjects],
            ["Total Tasks", dashboardData.totalTasks],
            ["Tasks in QA Review", dashboardData.qaReviewTasks],
            ["Overdue Tasks", dashboardData.overdueTasks]
        ];

        exportPDF({
            title: "System Overview Summary",
            filename: `system_overview_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            await projectService.createProject(newProject);
            toast.success("Project created successfully");
            setIsProjectModalOpen(false);
            setNewProject({
                projectName: "",
                description: "",
                teamLead: "",
                startDate: "",
                endDate: "",
                teamMembers: []
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create project");
        } finally {
            setIsCreating(false);
        }
    };

    const toggleMember = (userId) => {
        setNewProject(prev => {
            const exists = prev.teamMembers.includes(userId);
            if (exists) {
                return { ...prev, teamMembers: prev.teamMembers.filter(id => id !== userId) };
            } else {
                return { ...prev, teamMembers: [...prev.teamMembers, userId] };
            }
        });
    };

    const teamLeads = users.filter(u => u.role === "TL" || u.role === "admin");

    const kpis = dashboardData ? [
        { label: "Total Employees", value: dashboardData.totalEmployees, trend: "", color: "text-blue-500", variant: "blue", bg: "bg-blue-50" },
        { label: "Total Projects", value: dashboardData.totalProjects, trend: "", color: "text-indigo-500", variant: "indigo", bg: "bg-indigo-50" },
        { label: "Total Tasks", value: dashboardData.totalTasks, trend: "", color: "text-emerald-500", variant: "emerald", bg: "bg-emerald-50" },
        { label: "In QA Review", value: dashboardData.qaReviewTasks, trend: "", color: "text-amber-500", variant: "amber", bg: "bg-amber-50" },
        { label: "Overdue Tasks", value: dashboardData.overdueTasks, trend: "", color: "text-red-500", variant: "rose", bg: "bg-rose-50" },
    ] : [];

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Dashboard" />
                <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Overview</h1>
                            <p className="text-sm text-slate-500 mt-1">Here's what's happening across your CRM today.</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleExportDashboard}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Export Report
                            </button>
                            <button onClick={() => setIsProjectModalOpen(true)} className="px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm shadow-blue-200/50 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                New Project
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium">
                            {error}
                        </div>
                    ) : (
                        <>
                            {/* KPIs - Modern Compact Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {kpis.map((kpi, i) => (
                                    <div key={i} className={`premium-stat-card ${kpi.variant} flex-row items-center gap-4 p-4 h-[90px]`}>
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${kpi.bg.replace('50', '100')} ${kpi.color}`}>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                {kpi.variant === 'blue' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
                                                {kpi.variant === 'indigo' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />}
                                                {kpi.variant === 'emerald' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
                                                {kpi.variant === 'amber' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                                {kpi.variant === 'rose' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                            </svg>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <h4 className="text-2xl font-bold tracking-tight text-slate-800 leading-none mb-1">{kpi.value}</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                    {/* Main Content Sections */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        
                        {/* Left Column (Span 2) - Projects & Team */}
                        <div className="xl:col-span-2 space-y-6">
                            {/* Projects Overview */}
                            <Card className="!p-0 overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Active Projects</h3>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">Milestone progress across top initiatives</p>
                                    </div>
                                    <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                                    </button>
                                </div>
                                <div className="p-6 space-y-6 flex-1">
                                    {projects.slice(0, 4).map((proj, i) => {
                                        // Calculate progress based on dates or tasks (using a mock calculation for now since backend doesn't return progress)
                                        const progress = proj.status === "Completed" ? 100 : 50; 
                                        const color = progress === 100 ? "bg-emerald-500" : "bg-blue-500";
                                        
                                        return (
                                        <div key={proj._id || i}>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="font-bold text-slate-700">{proj.projectName}</span>
                                                <span className="font-bold text-slate-700">{progress}%</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    )})}
                                    {projects.length === 0 && <div className="text-slate-400 text-sm font-medium text-center py-4">No active projects</div>}
                                </div>
                            </Card>

                            {/* Team Availability */}
                            <Card className="!p-0 overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Team Workload</h3>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">Current availability and assignments</p>
                                    </div>
                                    <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">Manage Team</button>
                                </div>
                                <div className="divide-y divide-slate-100 flex-1">
                                    {users.slice(0, 5).map((member, i) => {
                                        const isBusy = member.status === "busy"; 
                                        const status = isBusy ? "Busy" : "Available";
                                        const statusColor = isBusy ? "bg-red-500" : "bg-emerald-500";
                                        
                                        return (
                                        <div key={member._id || i} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 border border-blue-200 uppercase">
                                                        {member.name?.charAt(0) || "U"}
                                                    </div>
                                                    <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${statusColor}`}></span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800">{member.name}</h4>
                                                    <p className="text-xs font-medium text-slate-500 capitalize">{member.role} <span className="mx-1">•</span> <span className="text-slate-400">{status}</span></p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Dept</span>
                                                <span className="text-sm font-bold text-slate-700 capitalize">{member.department || "Engineering"}</span>
                                            </div>
                                        </div>
                                    )})}
                                    {users.length === 0 && <div className="text-slate-400 text-sm font-medium text-center py-4">No team members found</div>}
                                </div>
                            </Card>
                        </div>

                        {/* Right Column (Span 1) - Activity Feed */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Real-Time Feed</h3>
                            </div>
                            <Card className="flex-1 flex flex-col gap-4 !p-0 overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Updates</span>
                                    <span className="relative flex h-2.5 w-2.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-6 pt-5">
                                    {/* Feed Items */}
                                    {recentTasks.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center py-10 opacity-60">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500 text-center">No recent activity found</p>
                                        </div>
                                    ) : (
                                        recentTasks.map((task, i) => (
                                            <div key={task._id || i} className="flex gap-4 text-sm relative">
                                                {i !== recentTasks.length - 1 && <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-slate-100"></div>}
                                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[10px] z-10 ring-4 ring-white bg-blue-100 text-blue-700 uppercase`}>
                                                    {task.taskName.charAt(0)}
                                                </div>
                                                <div className="pt-1.5">
                                                    <p className="text-slate-600 leading-snug">
                                                        Task <span className="font-semibold text-slate-800">{task.taskName}</span> was created
                                                    </p>
                                                    <span className="text-xs font-medium text-slate-400 mt-1 block">Status: {task.status}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                    <button className="w-full py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition">View Full History</button>
                                </div>
                            </Card>
                        </div>
                    </div>
                    </>
                    )}
                </main>
            </div>

            {/* Create Project Modal */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/50 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                                <div className="text-[#1d4ed8] relative flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                                    <svg className="w-2.5 h-2.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                                </div>
                                Create New Project
                            </h2>
                            <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-6 py-5 space-y-4 text-sm overflow-y-auto flex-1 scrollbar-thin">
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newProject.projectName}
                                        onChange={(e) => setNewProject({...newProject, projectName: e.target.value})}
                                        placeholder="e.g. E-Commerce Platform" 
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700" 
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Description</label>
                                    <textarea 
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                                        placeholder="Brief project description" 
                                        rows="3" 
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none font-medium text-slate-700"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Team Lead <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select 
                                            required
                                            value={newProject.teamLead}
                                            onChange={(e) => setNewProject({...newProject, teamLead: e.target.value})}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer appearance-none text-slate-700 font-bold"
                                        >
                                            <option value="">Select Team Lead</option>
                                            {teamLeads.map(tl => (
                                                <option key={tl._id} value={tl._id}>{tl.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            required
                                            value={newProject.startDate}
                                            onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-700 font-medium" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">End Date <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            required
                                            value={newProject.endDate}
                                            onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-700 font-medium" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Team Members</label>
                                    <div className="w-full border border-slate-200 rounded-lg h-[140px] overflow-y-auto scrollbar-thin">
                                        {users.map((user) => (
                                            <label key={user._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition">
                                                <input 
                                                    type="checkbox" 
                                                    checked={newProject.teamMembers.includes(user._id)}
                                                    onChange={() => toggleMember(user._id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer" 
                                                />
                                                <span className="text-slate-700 font-bold text-sm">{user.name} <span className="text-slate-400 font-medium ml-1">({user.role})</span></span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-5 flex items-center gap-4 shrink-0 border-t border-slate-100/50">
                                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 justify-center px-6 py-2.5 text-slate-800 font-bold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm">
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 justify-center flex items-center gap-2 px-6 py-2.5 bg-[#1d4ed8] text-white font-bold rounded-xl hover:bg-blue-800 transition shadow-sm disabled:opacity-50"
                                >
                                    {isCreating ? "Creating..." : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard;