import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { userService, taskService, projectService } from "../../api/services";
import { exportPDF, exportOverallReport } from "../../utils/pdfExport";
import { Download, ChevronLeft, ChevronRight, FolderOpen, AlertCircle } from "lucide-react";
import StatDetailModal from "../../components/StatDetailModal";
import { useAuth } from "../../context/AuthContext";

const ReportsDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [fromDate, setFromDate] = useState("2026-04-01");
    const [toDate, setToDate] = useState("2026-05-31");
    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const [taskRes, userRes, projRes] = await Promise.all([
                    taskService.getAllTasks(),
                    userService.getAllUsers(),
                    projectService.getAllProjects()
                ]);
                setTasks(taskRes.data.tasks || []);
                setUsers(userRes.data.data || []);
                
                const allProjects = projRes.data.projects || [];
                let scopedProjects = [];
                if (user?.role === "admin") {
                    scopedProjects = allProjects;
                } else if (user?.role === "TL") {
                    scopedProjects = allProjects.filter(p => p.teamLead?._id === user._id || p.teamLead === user._id);
                } else {
                    scopedProjects = allProjects.filter(p => p.teamMembers?.some(m => (m._id || m) === user?._id));
                }
                setProjects(scopedProjects);
            } catch (err) {
                console.error("Failed to fetch reports data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const filteredTasks = !selectedProjectId ? [] : tasks.filter(t => {
        const matchesProject = selectedProjectId === "All" || t.project?._id === selectedProjectId;
        if (!matchesProject) return false;

        const taskDate = t.updatedAt ? new Date(t.updatedAt) : new Date();
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;

        if (from) {
            from.setHours(0, 0, 0, 0);
            if (taskDate < from) return false;
        }
        if (to) {
            to.setHours(23, 59, 59, 999);
            if (taskDate > to) return false;
        }

        return true;
    });

    const currentProjectIndex = projects.findIndex(p => p._id === selectedProjectId);

    const handleSlidePrev = () => {
        if (projects.length === 0) return;
        let newIndex = currentProjectIndex - 1;
        if (newIndex < 0) {
            newIndex = projects.length - 1;
        }
        setSelectedProjectId(projects[newIndex]._id);
    };

    const handleSlideNext = () => {
        if (projects.length === 0) return;
        let newIndex = currentProjectIndex + 1;
        if (newIndex >= projects.length) {
            newIndex = 0;
        }
        setSelectedProjectId(projects[newIndex]._id);
    };

    const insights = [
        { label: "New", value: filteredTasks.filter(t => t.status === "New").length, data: filteredTasks.filter(t => t.status === "New"), color: "text-slate-500", bg: "bg-slate-100", dot: "bg-slate-400" },
        { label: "In Progress", value: filteredTasks.filter(t => t.status === "In Progress").length, data: filteredTasks.filter(t => t.status === "In Progress"), color: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500" },
        { label: "In QA", value: filteredTasks.filter(t => t.status === "QA Review").length, data: filteredTasks.filter(t => t.status === "QA Review"), color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
        { label: "Completed", value: filteredTasks.filter(t => t.status === "Completed").length, data: filteredTasks.filter(t => t.status === "Completed"), color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
        { label: "Done", value: filteredTasks.filter(t => t.status === "Done").length, data: filteredTasks.filter(t => t.status === "Done"), color: "text-indigo-600", bg: "bg-indigo-50", dot: "bg-indigo-500" },
        { label: "Overdue", value: filteredTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length, data: filteredTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done"), color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500" }
    ];

    const activeProject = selectedProjectId === "All" ? projects[0] : projects.find(p => p._id === selectedProjectId);

    const developers = users
        .filter(u => {
            if (u.role !== "developer") return false;
            if (selectedProjectId === "All") return true;
            // Show if user is in project team or has tasks in this project
            const isMember = activeProject?.teamMembers?.some(m => (m._id || m) === u._id);
            const hasTasks = tasks.some(t => t.project?._id === selectedProjectId && t.assignedTo?._id === u._id);
            return isMember || hasTasks;
        })
        .map(dev => {
            const devTasks = filteredTasks.filter(t => t.assignedTo?._id === dev._id);
            const completed = devTasks.filter(t => t.status === "Completed" || t.status === "Done").length;
            const total = devTasks.length;
            const performance = total > 0 ? Math.round((completed / total) * 100) : 0;
            const overdue = devTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length;
            
            return {
                name: dev.name,
                initials: dev.name?.charAt(0) || "U",
                role: "Developer",
                total,
                completed,
                overdue,
                performance,
                firstTask: devTasks.length > 0 ? "Assigned" : "-",
                lastActivity: devTasks.length > 0 ? "Active" : "Idle",
                color: "bg-indigo-100 text-indigo-700",
                profilePic: dev.profilePic
            };
        });

    const projectReport = activeProject ? {
        name: activeProject.projectName,
        lead: activeProject.teamLead?.name || "Unassigned",
        totalTasks: tasks.filter(t => t.project?._id === activeProject._id).length,
        completedTasks: tasks.filter(t => t.project?._id === activeProject._id && (t.status === "Completed" || t.status === "Done")).length,
        start: new Date(activeProject.startDate).toLocaleDateString(),
        end: new Date(activeProject.endDate).toLocaleDateString(),
        progress: tasks.filter(t => t.project?._id === activeProject._id).length > 0 
            ? Math.round((tasks.filter(t => t.project?._id === activeProject._id && (t.status === "Completed" || t.status === "Done")).length / tasks.filter(t => t.project?._id === activeProject._id).length) * 100)
            : 0
    } : null;

    const activities = filteredTasks.slice(0, 10).map(t => ({
        id: t._id,
        user: { 
            name: t.assignedTo?.name || "System", 
            initials: t.assignedTo?.name?.charAt(0) || "S", 
            color: "bg-indigo-100 text-indigo-700",
            profilePic: t.assignedTo?.profilePic
        },
        task: t.taskName,
        action: t.status,
        note: t.description || "-",
        file: t.attachments?.length > 0 ? `${t.attachments.length} files` : "-",
        time: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : "N/A"
    }));

    // PDF Handlers
    const handleExportOverallReport = () => {
        const sections = [
            {
                title: "Task Overview Summary",
                columns: ["Status", "Count"],
                data: insights.map(s => [s.label, s.value])
            },
            {
                title: "Developer Performance",
                columns: ["Developer Name", "Total Tasks", "Completed", "Overdue", "Performance %"],
                data: developers.map(d => [d.name, d.total, d.completed, d.overdue, `${d.performance}%`])
            },
            {
                title: "Recent Activity Log",
                columns: ["User", "Task", "Action", "Time"],
                data: activities.map(a => [a.user.name, a.task, a.action, a.time])
            }
        ];

        if (projectReport && selectedProjectId !== "All") {
            sections.splice(1, 0, {
                title: `Project Details: ${projectReport.name}`,
                columns: ["Metric", "Value"],
                data: [
                    ["Lead", projectReport.lead],
                    ["Timeline", `${projectReport.start} - ${projectReport.end}`],
                    ["Tasks", `${projectReport.completedTasks} / ${projectReport.totalTasks}`],
                    ["Completion", `${projectReport.progress}%`]
                ]
            });
        }

        exportOverallReport({
            title: `Overall CRM Report - ${selectedProjectId === "All" ? "All Projects" : activeProject?.projectName}`,
            filename: `overall_report_${new Date().getTime()}.pdf`,
            sections
        });
    };

    const handleExportTasks = () => {
        const columns = ["Task Name", "Project", "Status", "Priority", "Assignee", "Due Date"];
        const data = filteredTasks.map(t => [
            t.taskName,
            t.project?.projectName || "N/A",
            t.status,
            t.priority,
            t.assignedTo?.name || "Unassigned",
            t.endDate ? new Date(t.endDate).toLocaleDateString() : "N/A"
        ]);
        exportPDF({
            title: `Task Report - ${selectedProjectId === "All" ? "All Projects" : activeProject?.projectName}`,
            filename: `tasks_report_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    const handleExportPerformance = () => {
        const columns = ["Developer Name", "Total Tasks", "Completed", "Overdue", "Performance %"];
        const data = developers.map(d => [
            d.name,
            d.total,
            d.completed,
            d.overdue,
            `${d.performance}%`
        ]);
        exportPDF({
            title: "Developer Performance Report",
            filename: `dev_performance_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    const handleExportActivity = () => {
        const columns = ["User", "Task", "Action", "Time"];
        const data = activities.map(a => [
            a.user.name,
            a.task,
            a.action,
            a.time
        ]);
        exportPDF({
            title: "Recent Activity Log",
            filename: `activity_log_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar role={user?.role === 'TL' ? 'teamLead' : (user?.role === 'qa' ? 'qa' : (user?.role === 'admin' ? 'admin' : 'employee'))} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Reports" />
                
                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
                    
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="dashboard-heading">Reports & Analytics</h1>
                            <p className="dashboard-subheading">Data snapshot for {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-wrap lg:flex-nowrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Project</label>
                            <div className="relative">
                                <select 
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer appearance-none"
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                >
                                    <option value="">Select Project</option>
                                    {projects.map(p => (
                                        <option key={p._id} value={p._id}>{p.projectName}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">From Date</label>
                            <input 
                                type="date" 
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer" 
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">To Date</label>
                            <input 
                                type="date" 
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer" 
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {!selectedProjectId ? (
                        <div className="bg-white rounded-3xl p-16 border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="w-20 h-20 bg-blue-50 text-blue-600 border border-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <FolderOpen className="w-10 h-10 animate-bounce" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Select a Project to View Reports</h2>
                            <p className="text-slate-500 font-semibold text-sm max-w-md mt-2 leading-relaxed">
                                Get a complete operational overview of task completion timelines, developer performance metrics, and system-wide activity logs. Select one of your assigned projects to load analytics.
                            </p>
                            
                            {projects.length > 0 && (
                                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl">
                                    {projects.slice(0, 6).map((proj) => (
                                        <button
                                            key={proj._id}
                                            onClick={() => setSelectedProjectId(proj._id)}
                                            className="px-4 py-3 bg-slate-50 border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/20 text-slate-700 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all text-left flex items-center justify-between group cursor-pointer"
                                        >
                                            <span className="truncate group-hover:text-blue-600 transition-colors mr-2">{proj.projectName}</span>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Top Insights */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                                Task Overview
                            </h2>
                            <button 
                                onClick={handleExportOverallReport}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" /> Export Overall Report
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                            {insights.map((stat, i) => (
                                <div key={i} onClick={() => setStatModal({ isOpen: true, title: stat.label + " Tasks", data: stat.data, type: "task" })} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] hover:border-blue-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${stat.dot}`}></div>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                                    </div>
                                    <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Two Column Layout: Dev Performance & Project Report */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        
                        {/* Developer Performance */}
                        <div className="xl:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                                    Developer Performance
                                </h2>
                                <button 
                                    onClick={handleExportPerformance}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition shadow-sm"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export PDF
                                </button>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="p-4 pl-6 font-semibold">Developer</th>
                                                <th className="p-4 font-semibold text-center">Tasks (Done/Total)</th>
                                                <th className="p-4 font-semibold text-center">Overdue</th>
                                                <th className="p-4 font-semibold w-1/4">Performance</th>
                                                <th className="p-4 font-semibold">Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {developers.map((dev, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-4 pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white overflow-hidden ${dev.color}`}>
                                                                {dev.profilePic ? (
                                                                    <img src={dev.profilePic} alt={dev.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    dev.initials
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{dev.name}</div>
                                                                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{dev.role}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="inline-flex items-baseline gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                                                            <span className="font-bold text-slate-800 text-sm">{dev.completed}</span>
                                                            <span className="text-xs font-semibold text-slate-400">/{dev.total}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {dev.overdue > 0 ? (
                                                            <span className="inline-flex px-2 py-1 bg-red-50 text-red-600 font-bold text-xs rounded-lg border border-red-100">
                                                                {dev.overdue}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 font-bold text-sm">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                                                            <span>{dev.performance}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                                            <div 
                                                                className={`h-2 rounded-full ${dev.performance < 50 ? 'bg-amber-400' : dev.performance < 80 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                                                style={{ width: `${dev.performance}%` }}
                                                            ></div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs text-slate-600 font-medium whitespace-nowrap"><span className="text-slate-400">First:</span> {dev.firstTask}</span>
                                                            <span className="text-xs text-slate-600 font-medium whitespace-nowrap"><span className="text-slate-400">Last:</span> {dev.lastActivity}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Project Report */}
                        <div className="xl:col-span-1 space-y-4">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                Active Project Focus
                            </h2>
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg shadow-blue-900/20 text-white relative overflow-hidden h-[calc(100%-2rem)] min-h-[350px] flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                                {/* Decor */}
                                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-[40px] pointer-events-none"></div>
                                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[40px] pointer-events-none"></div>
                                
                                <div className="relative z-10 flex-1 flex flex-col justify-between">
                                    {projectReport ? (
                                        <>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/10 shrink-0">
                                                            {activeProject?.status || "Active"}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-2xl font-black tracking-tight truncate" title={projectReport.name}>{projectReport.name}</h3>
                                                    <div className="flex items-center gap-2 mt-2 text-blue-100 text-sm font-semibold">
                                                        <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                                        Lead: {projectReport.lead}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 my-auto border-y border-white/10 py-5">
                                                <div>
                                                    <span className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Timeline</span>
                                                    <div className="text-xs font-bold">{projectReport.start}</div>
                                                    <div className="text-xs font-bold opacity-80">{projectReport.end}</div>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Tasks</span>
                                                    <div className="text-xl font-bold">{projectReport.completedTasks}<span className="text-sm opacity-70">/{projectReport.totalTasks}</span></div>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-xs font-bold text-blue-100 tracking-wide uppercase">Completion</span>
                                                    <span className="text-2xl font-black">{projectReport.progress}%</span>
                                                </div>
                                                <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm border border-white/10">
                                                    <div className="bg-white h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500" style={{ width: `${projectReport.progress}%` }}></div>
                                                </div>
                                            </div>

                                            {/* Slider Navigation */}
                                            {projects.length > 1 && (
                                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                                                    <button 
                                                        onClick={handleSlidePrev}
                                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white border border-white/5 active:scale-95 cursor-pointer"
                                                        title="Previous Project"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex items-center gap-1">
                                                        {projects.map((p, idx) => (
                                                            <button
                                                                key={p._id}
                                                                onClick={() => setSelectedProjectId(p._id)}
                                                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                                                    idx === currentProjectIndex ? 'w-4 bg-white' : 'bg-white/40 hover:bg-white/60'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <button 
                                                        onClick={handleSlideNext}
                                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white border border-white/5 active:scale-95 cursor-pointer"
                                                        title="Next Project"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-3 animate-pulse">
                                                <FolderOpen className="w-6 h-6 text-blue-100" />
                                            </div>
                                            <h4 className="text-lg font-black tracking-tight">Select Project First</h4>
                                            <p className="text-xs text-blue-100/70 font-medium max-w-[200px] mt-1.5 leading-relaxed">
                                                Choose a project from the filters or slider list to view performance insight.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Recent Activity Log */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                Recent Activity Log
                            </h2>
                            <button 
                                onClick={handleExportActivity}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5" /> Export PDF
                            </button>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="p-4 pl-6 font-semibold">User</th>
                                            <th className="p-4 font-semibold">Task</th>
                                            <th className="p-4 font-semibold">Action</th>
                                            <th className="p-4 font-semibold">Note</th>
                                            <th className="p-4 font-semibold">File</th>
                                            <th className="p-4 font-semibold">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activities.map((act) => (
                                            <tr key={act.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-4 pl-6">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-xs shadow-sm overflow-hidden ${act.user.color}`}>
                                                            {act.user.profilePic ? (
                                                                <img src={act.user.profilePic} alt={act.user.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                act.user.initials
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition-colors">{act.user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-sm text-slate-800">{act.task}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                                                        act.action.includes('QA') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        act.action === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        act.action === 'Assigned' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                        'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                        {act.action}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-slate-500 font-medium min-w-[200px]" title={act.note}>{act.note}</td>
                                                <td className="p-4">
                                                    {act.file !== "-" ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold text-xs rounded-lg cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap">
                                                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                                                            {act.file}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 font-bold">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-xs font-semibold text-slate-400 whitespace-nowrap">{act.time}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                        </>
                    )}

                </main>
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

export default ReportsDashboard;