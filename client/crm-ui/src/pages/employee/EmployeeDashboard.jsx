import React, { useState, useEffect, useMemo } from 'react';
import { dashboardService, taskService } from '../../api/services';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    CheckCircle2, Clock, AlertCircle, PlayCircle, ShieldCheck,
    Calendar, FileText, MessageSquare, AlertTriangle, ArrowRight,
    Activity, Star, ClipboardList, Download, Paperclip, ExternalLink
} from 'lucide-react';
import { exportPDF } from '../../utils/pdfExport';
import StatDetailModal from '../../components/StatDetailModal';

const STATUS_COLORS = {
    'New': 'bg-slate-100 text-slate-700 border-slate-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'QA Review': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Done': 'bg-emerald-500 text-white border-emerald-600',
};

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [projectFilter, setProjectFilter] = useState('All');
    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const [barTooltip, setBarTooltip] = useState(null);

    const fetchDashboardData = async () => {
        if (!user?._id) return;
        try {
            setLoading(true);
            const [dashRes, tasksRes] = await Promise.all([
                dashboardService.getEmployeeDashboard(),
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
                assignedTo: t.assignedTo,
                assignedQA: t.assignedQA,
                createdAt: t.createdAt,
                updates: (t.statusHistory || []).map(h => ({
                    id: h._id,
                    type: h.status === 'QA Review' ? 'qa' : 'status',
                    status: h.status,
                    notes: h.notes,
                    time: new Date(h.changedAt).toLocaleString(),
                    changedAt: h.changedAt,
                    changedBy: h.changedBy,
                    attachments: h.attachments || [],
                    screenshotLinks: h.screenshotLinks || [],
                    attachment: h.attachment || ""
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

    const projectOptions = useMemo(() => {
        const seen = new Set();
        const opts = [];
        tasks.forEach(t => {
            if (t.project && t.project !== 'Unassigned' && !seen.has(t.project)) {
                seen.add(t.project);
                opts.push(t.project);
            }
        });
        return opts.sort();
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => projectFilter === 'All' || t.project === projectFilter);
    }, [tasks, projectFilter]);

    // Update selected task when filtered tasks change
    useEffect(() => {
        if (filteredTasks.length > 0 && (!selectedTask || !filteredTasks.find(t => t.id === selectedTask.id))) {
            setSelectedTask(filteredTasks[0]);
        } else if (filteredTasks.length === 0) {
            setSelectedTask(null);
        }
    }, [filteredTasks]);

    const handleExportTasks = () => {
        const columns = ["Task Name", "Project", "Status", "Priority", "Due Date"];
        const data = filteredTasks.map(t => [
            t.taskName,
            t.project,
            t.status,
            t.priority,
            t.endDate
        ]);
        exportPDF({
            title: `My Assigned Tasks - ${user?.name || 'Employee'} (${user?.role || 'Employee'}) ${projectFilter !== 'All' ? `(${projectFilter})` : ''}`,
            filename: `my_tasks_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // 30s polling
        return () => clearInterval(interval);
    }, [user]);

    // Calculate KPIs
    const displayStats = useMemo(() => {
        const baseTasks = filteredTasks;
        return {
            totalAssigned: baseTasks.length,
            tasksNew: baseTasks.filter(t => t.status === 'New').length,
            tasksInProgress: baseTasks.filter(t => t.status === 'In Progress').length,
            tasksQA: baseTasks.filter(t => t.status === 'QA Review').length,
            tasksCompleted: baseTasks.filter(t => ['Completed', 'Done'].includes(t.status)).length,
            overdueTasks: baseTasks.filter(t => new Date(t.endDate) < new Date() && !['Completed', 'Done'].includes(t.status))
        };
    }, [filteredTasks]);

    // Donut chart calculations
    const donutData = useMemo(() => {
        const total = displayStats.totalAssigned;
        const counts = [
            { label: 'New', count: displayStats.tasksNew, color: '#94a3b8', hoverColor: '#64748b' },
            { label: 'In Progress', count: displayStats.tasksInProgress, color: '#3b82f6', hoverColor: '#2563eb' },
            { label: 'QA Review', count: displayStats.tasksQA, color: '#6366f1', hoverColor: '#4f46e5' },
            { label: 'Completed', count: displayStats.tasksCompleted, color: '#10b981', hoverColor: '#059669' }
        ];

        const circumference = 2 * Math.PI * 50; // ~314.159
        let accumulatedCircumference = 0;

        return counts.map(item => {
            const percentage = total === 0 ? 0 : (item.count / total);
            const strokeLength = percentage * circumference;
            const strokeOffset = -accumulatedCircumference;
            accumulatedCircumference += strokeLength;

            return {
                ...item,
                percentage: (percentage * 100).toFixed(0),
                strokeDasharray: `${strokeLength} ${circumference}`,
                strokeDashoffset: strokeOffset
            };
        });
    }, [displayStats]);

    // Weekly created vs completed data calculation
    const weeklyData = useMemo(() => {
        const dayNames = [];
        const createdCounts = [];
        const completedCounts = [];
        const createdTasksList = [];
        const completedTasksList = [];
        
        // Generate last 7 days starting from 6 days ago
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dayNames.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            createdCounts.push(0);
            completedCounts.push(0);
            createdTasksList.push([]);
            completedTasksList.push([]);
        }

        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toDateString());
        }
        
        tasks.forEach(task => {
            const createdDate = task.createdAt ? new Date(task.createdAt).toDateString() : null;
            if (createdDate) {
                const idx = days.indexOf(createdDate);
                if (idx !== -1) {
                    createdCounts[idx]++;
                    createdTasksList[idx].push(task.taskName);
                }
            }
            
            const completionUpdates = task.updates.filter(u => ['Completed', 'Done'].includes(u.status));
            completionUpdates.forEach(update => {
                const compDate = update.changedAt ? new Date(update.changedAt).toDateString() : (update.time ? new Date(update.time).toDateString() : null);
                if (compDate) {
                    const idx = days.indexOf(compDate);
                    if (idx !== -1) {
                        completedCounts[idx]++;
                        if (!completedTasksList[idx].includes(task.taskName)) {
                            completedTasksList[idx].push(task.taskName);
                        }
                    }
                }
            });
        });

        return { dayNames, createdCounts, completedCounts, createdTasksList, completedTasksList };
    }, [tasks]);

    const handleBarHover = (e, day, type, tasksList) => {
        const svgElement = e.currentTarget.ownerSVGElement || e.currentTarget.viewportElement;
        if (!svgElement) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const svgRect = svgElement.getBoundingClientRect();
        
        // Calculate coordinate relative to the SVG/container
        const x = rect.left - svgRect.left + rect.width / 2;
        const y = rect.top - svgRect.top;
        
        setBarTooltip({
            x,
            y,
            day,
            type,
            tasks: tasksList
        });
    };

    // Max count for scaling the vertical bars
    const maxWeeklyValue = useMemo(() => {
        const allValues = [...weeklyData.createdCounts, ...weeklyData.completedCounts];
        const max = Math.max(...allValues, 2); // Default to at least 2 for scaling
        return Math.ceil(max / 2) * 2; // Round to next even number
    }, [weeklyData]);

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="employee" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="My Workspace" role="employee" />

                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="dashboard-heading">Welcome back, {user?.name || 'Employee'}!</h1>
                            <p className="dashboard-subheading">Here is your customized portal as a <span className="font-bold text-blue-600">{user?.role || 'Employee'}</span>.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {projectOptions.length > 0 && (
                                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                                    <button 
                                        onClick={() => setProjectFilter('All')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${projectFilter === 'All' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        All
                                    </button>
                                    {projectOptions.map(proj => (
                                        <button 
                                            key={proj}
                                            onClick={() => setProjectFilter(proj)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${projectFilter === proj ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {proj}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {filteredTasks.length > 0 && (
                                <button 
                                    onClick={handleExportTasks}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm text-sm cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Tasks
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium">
                            {error}
                        </div>
                    ) : (
                    <>
                    {/* KPI Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div onClick={() => setStatModal({ isOpen: true, title: "Total Tasks", data: filteredTasks, type: "task" })} className="premium-stat-card slate flex-row items-center gap-4 p-4 h-[90px] cursor-pointer hover:scale-[1.02] transition-all">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-slate-800 leading-none mb-1">{displayStats.totalAssigned}</h4>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</p>
                            </div>
                        </div>
                        <div onClick={() => setStatModal({ isOpen: true, title: "New Tasks", data: filteredTasks.filter(t => t.status === 'New'), type: "task" })} className="premium-stat-card slate flex-row items-center gap-4 p-4 h-[90px] cursor-pointer hover:scale-[1.02] transition-all">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-slate-800 leading-none mb-1">{displayStats.tasksNew}</h4>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">New</p>
                            </div>
                        </div>
                        <div onClick={() => setStatModal({ isOpen: true, title: "Tasks In Progress", data: filteredTasks.filter(t => t.status === 'In Progress'), type: "task" })} className="premium-stat-card blue flex-row items-center gap-4 p-4 h-[90px] cursor-pointer hover:scale-[1.02] transition-all">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                                <PlayCircle className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-blue-700 leading-none mb-1">{displayStats.tasksInProgress}</h4>
                                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">In progress</p>
                            </div>
                        </div>
                        <div onClick={() => setStatModal({ isOpen: true, title: "Tasks in QA Review", data: filteredTasks.filter(t => t.status === 'QA Review'), type: "task" })} className="premium-stat-card indigo flex-row items-center gap-4 p-4 h-[90px] cursor-pointer hover:scale-[1.02] transition-all">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-indigo-700 leading-none mb-1">{displayStats.tasksQA}</h4>
                                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">QA Review</p>
                            </div>
                        </div>
                        <div onClick={() => setStatModal({ isOpen: true, title: "Overdue Tasks", data: displayStats.overdueTasks, type: "task" })} className="premium-stat-card rose flex-row items-center gap-4 p-4 h-[90px] cursor-pointer hover:scale-[1.02] transition-all">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-rose-100 text-rose-600">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-2xl font-bold tracking-tight text-rose-600 leading-none mb-1">{displayStats.overdueTasks.length}</h4>
                                <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Overdue</p>
                            </div>
                        </div>
                    </div>

                    {/* SVG Analytics Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Donut Graph Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between h-[380px]">
                            <div className="mb-4">
                                <h3 className="text-base font-bold text-slate-800">Productivity Distribution</h3>
                                <p className="text-xs text-slate-500">Breakdown of tasks assigned to you by status.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2 flex-1">
                                {/* SVG Donut */}
                                <div className="relative w-[190px] h-[190px] shrink-0">
                                    <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                                        {/* Background gray circle */}
                                        <circle 
                                            cx="60" 
                                            cy="60" 
                                            r="50" 
                                            stroke="#e2e8f0" 
                                            strokeWidth="10" 
                                            fill="transparent" 
                                        />
                                        
                                        {/* Slices */}
                                        {displayStats.totalAssigned > 0 && donutData.map((slice, i) => {
                                            const isHovered = hoveredSlice === slice.label;
                                            const isAnyHovered = hoveredSlice !== null;
                                            return slice.count > 0 && (
                                                <circle
                                                    key={i}
                                                    cx="60"
                                                    cy="60"
                                                    r="50"
                                                    stroke={slice.color}
                                                    strokeWidth={isHovered ? "14" : "10"}
                                                    strokeDasharray={slice.strokeDasharray}
                                                    strokeDashoffset={slice.strokeDashoffset}
                                                    strokeLinecap="round"
                                                    fill="transparent"
                                                    className="transition-all duration-300 ease-out cursor-pointer"
                                                    style={{
                                                        opacity: isAnyHovered && !isHovered ? 0.8 : 1,
                                                        filter: isHovered ? 'drop-shadow(0px 2px 6px rgba(0,0,0,0.15))' : 'none'
                                                    }}
                                                    onMouseEnter={() => setHoveredSlice(slice.label)}
                                                    onMouseLeave={() => setHoveredSlice(null)}
                                                />
                                            );
                                        })}
                                    </svg>
                                    
                                    {/* Middle Text Overlay */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                                        <span className="text-3xl font-black text-slate-800 leading-none">
                                            {hoveredSlice 
                                                ? (donutData.find(d => d.label === hoveredSlice)?.count || 0)
                                                : displayStats.totalAssigned
                                            }
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {hoveredSlice ? hoveredSlice : 'Tasks'}
                                        </span>
                                    </div>
                                </div>

                                {/* Custom Legend */}
                                <div className="flex flex-col gap-3.5 w-full sm:max-w-[200px]">
                                    {donutData.map((item, idx) => {
                                        const isHovered = hoveredSlice === item.label;
                                        const isAnyHovered = hoveredSlice !== null;
                                        return (
                                            <div 
                                                key={idx} 
                                                className="flex items-center justify-between group cursor-pointer"
                                                onMouseEnter={() => setHoveredSlice(item.label)}
                                                onMouseLeave={() => setHoveredSlice(null)}
                                                style={{
                                                    opacity: isAnyHovered && !isHovered ? 0.8 : 1,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div 
                                                        className={`w-3.5 h-3.5 rounded-md transition-transform duration-200 ${isHovered ? 'scale-125 shadow-sm' : 'group-hover:scale-110'}`} 
                                                        style={{ backgroundColor: item.color }} 
                                                    />
                                                    <span className={`text-xs transition-colors duration-200 ${isHovered ? 'text-slate-900 font-extrabold' : 'text-slate-600 group-hover:text-slate-800 font-semibold'}`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs transition-colors duration-200 ${isHovered ? 'text-slate-900 font-extrabold' : 'text-slate-800 font-bold'}`}>{item.count}</span>
                                                    <span className="text-[10px] font-medium text-slate-400">({item.percentage}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Weekly Created vs Completed Bar Graph Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between h-[380px]">
                            <div className="mb-2 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Weekly Productivity</h3>
                                    <p className="text-xs text-slate-500">Created vs. completed tasks in the last 7 days.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Created</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic SVG Bar Chart */}
                            <div className="relative w-full h-[280px] py-1 flex-1 flex items-center justify-center">
                                <svg className="w-full h-full max-h-[260px]" viewBox="0 0 500 220" preserveAspectRatio="xMidYMid meet">
                                    {/* Definitions for gradients */}
                                    <defs>
                                        <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#60a5fa" />
                                            <stop offset="100%" stopColor="#3b82f6" />
                                        </linearGradient>
                                        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#34d399" />
                                            <stop offset="100%" stopColor="#10b981" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid Lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                                        const y = 15 + ratio * 160;
                                        const labelVal = (maxWeeklyValue - (ratio * maxWeeklyValue)).toFixed(0);
                                        return (
                                            <g key={idx}>
                                                <line 
                                                    x1="35" 
                                                    y1={y} 
                                                    x2="480" 
                                                    y2={y} 
                                                    stroke="#f1f5f9" 
                                                    strokeWidth="1.5" 
                                                />
                                                <text 
                                                    x="15" 
                                                    y={y + 3.5} 
                                                    fill="#94a3b8" 
                                                    fontSize="10" 
                                                    fontWeight="bold" 
                                                    textAnchor="middle"
                                                >
                                                    {labelVal}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Bars */}
                                    {weeklyData.dayNames.map((day, idx) => {
                                        const xGroup = 55 + idx * 62;
                                        
                                        const createdVal = weeklyData.createdCounts[idx];
                                        const completedVal = weeklyData.completedCounts[idx];
                                        
                                        // Scale heights: max height of chart is 160px (y from 15 to 175)
                                        const createdHeight = (createdVal / maxWeeklyValue) * 160;
                                        const completedHeight = (completedVal / maxWeeklyValue) * 160;
                                        
                                        const yCreated = 175 - createdHeight;
                                        const yCompleted = 175 - completedHeight;

                                        return (
                                            <g key={idx} className="group">
                                                {/* Created Bar */}
                                                <rect
                                                    x={xGroup}
                                                    y={yCreated}
                                                    width="16"
                                                    height={Math.max(createdHeight, 0)}
                                                    rx="4"
                                                    fill="url(#createdGrad)"
                                                    className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                                                    onMouseEnter={(e) => handleBarHover(e, day, 'Created', weeklyData.createdTasksList[idx])}
                                                    onMouseMove={(e) => handleBarHover(e, day, 'Created', weeklyData.createdTasksList[idx])}
                                                    onMouseLeave={() => setBarTooltip(null)}
                                                />
                                                {/* Tooltip or Value label on hover for Created */}
                                                {createdVal > 0 && (
                                                    <text
                                                        x={xGroup + 8}
                                                        y={yCreated - 5}
                                                        fill="#3b82f6"
                                                        fontSize="9.5"
                                                        fontWeight="black"
                                                        textAnchor="middle"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                                                    >
                                                        {createdVal}
                                                    </text>
                                                )}

                                                {/* Completed Bar */}
                                                <rect
                                                    x={xGroup + 20}
                                                    y={yCompleted}
                                                    width="16"
                                                    height={Math.max(completedHeight, 0)}
                                                    rx="4"
                                                    fill="url(#completedGrad)"
                                                    className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                                                    onMouseEnter={(e) => handleBarHover(e, day, 'Completed', weeklyData.completedTasksList[idx])}
                                                    onMouseMove={(e) => handleBarHover(e, day, 'Completed', weeklyData.completedTasksList[idx])}
                                                    onMouseLeave={() => setBarTooltip(null)}
                                                />
                                                {/* Tooltip or Value label on hover for Completed */}
                                                {completedVal > 0 && (
                                                    <text
                                                        x={xGroup + 28}
                                                        y={yCompleted - 5}
                                                        fill="#10b981"
                                                        fontSize="9.5"
                                                        fontWeight="black"
                                                        textAnchor="middle"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                                                    >
                                                        {completedVal}
                                                    </text>
                                                )}

                                                {/* Day of Week Label */}
                                                <text
                                                    x={xGroup + 18}
                                                    y="196"
                                                    fill="#64748b"
                                                    fontSize="10"
                                                    fontWeight="bold"
                                                    textAnchor="middle"
                                                >
                                                    {day}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    
                                    {/* Bottom Axis Line */}
                                    <line 
                                        x1="35" 
                                        y1="175" 
                                        x2="480" 
                                        y2="175" 
                                        stroke="#cbd5e1" 
                                        strokeWidth="1.5" 
                                    />
                                </svg>

                                {barTooltip && (
                                    <div 
                                        className="absolute z-50 bg-slate-950/95 backdrop-blur-md text-white text-xs rounded-xl p-3.5 shadow-2xl border border-slate-800 pointer-events-none max-w-[240px] transition-all duration-150 animate-in fade-in zoom-in-95"
                                        style={{ 
                                            left: `${barTooltip.x}px`, 
                                            top: `${barTooltip.y}px`,
                                            transform: 'translate(-50%, -105%)', // position above the cursor/bar
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-4 mb-2 border-b border-slate-800/80 pb-1.5">
                                            <span className="font-extrabold tracking-wider uppercase text-[9px] text-slate-400">{barTooltip.day}</span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${barTooltip.type === 'Created' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'}`}>
                                                {barTooltip.type}
                                            </span>
                                        </div>
                                        {barTooltip.tasks.length > 0 ? (
                                            <ul className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                                {barTooltip.tasks.map((tName, i) => (
                                                    <li key={i} className="flex items-start gap-2 leading-snug">
                                                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${barTooltip.type === 'Created' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                                                        <span className="font-semibold text-[11px] text-slate-200">{tName}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-slate-400 italic text-[11px]">No tasks {barTooltip.type.toLowerCase()}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Tasks List & Deadlines */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Upcoming / Overdue Deadlines Highlight */}
                            {displayStats.overdueTasks.length > 0 && (
                                <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5">
                                    <h3 className="text-sm font-bold text-rose-800 mb-3 flex items-center">
                                        <AlertTriangle className="w-4 h-4 mr-2 text-rose-600" />
                                        Requires Immediate Attention
                                    </h3>
                                    <div className="space-y-3">
                                        {displayStats.overdueTasks.map(task => (
                                            <div key={task.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-rose-100 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800 text-sm">{task.taskName}</span>
                                                    <span className="text-xs text-rose-600 font-medium mt-0.5">Due: {task.endDate} (Overdue)</span>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedTask(task)}
                                                    className="px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors cursor-pointer"
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
                                        filteredTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedTask(task)}
                                                className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${selectedTask?.id === task.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                            {task.project}
                                                        </span>
                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${STATUS_COLORS[task.status]}`}>
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
                        <div className="space-y-6">

                            {/* Task Details Preview */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-fit mb-8 relative z-10">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
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
                                            <div className="flex flex-wrap gap-2">
                                                <p className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block">Project: {selectedTask.project}</p>
                                                {selectedTask.priority && (
                                                    <p className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md inline-block border border-amber-100">
                                                        {selectedTask.priority} Priority
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                                                    {selectedTask.assignedTo?.role ? (
                                                        selectedTask.assignedTo.role
                                                    ) : "Employee"}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                                                        {selectedTask.assignedTo?.profilePic ? (
                                                            <img src={selectedTask.assignedTo.profilePic} alt={selectedTask.assignedTo.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            selectedTask.assignedTo?.name?.charAt(0) || "U"
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 whitespace-normal break-words leading-tight">{selectedTask.assignedTo?.name || "Unassigned"}</span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                                                    {selectedTask.assignedQA?.role === 'qa' ? 'QA Engineer' : (selectedTask.assignedQA?.role || 'QA Reviewer')}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                                                        {selectedTask.assignedQA?.profilePic ? (
                                                            <img src={selectedTask.assignedQA.profilePic} alt={selectedTask.assignedQA.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            selectedTask.assignedQA?.name?.charAt(0) || "Q"
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 whitespace-normal break-words leading-tight">{selectedTask.assignedQA?.name || "Not Assigned"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center">
                                                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Description
                                                </h4>
                                                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    {selectedTask.description}
                                                </p>
                                            </div>

                                            {selectedTask.qaNotes && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-indigo-400 mb-2 flex items-center">
                                                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> QA Feedback
                                                    </h4>
                                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800 leading-relaxed">
                                                        {selectedTask.qaNotes}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="text-xs font-semibold text-slate-400 mb-3">Task Updates</h4>
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
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="text-sm font-bold text-slate-700">{update.status}</p>
                                                                    {!update.notes && <p className="text-sm text-slate-400 font-medium">— No notes</p>}
                                                                    <span className="text-[10px] font-semibold text-blue-500 ml-auto bg-blue-50 px-2 py-0.5 rounded">by {update.changedBy?.name || 'System'}</span>
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
                                                                {((update.attachments && update.attachments.length > 0) || (update.screenshotLinks && update.screenshotLinks.length > 0)) && (
                                                                    <div className="mt-2.5 space-y-2 border-t border-slate-100/50 pt-2.5">
                                                                        {update.attachments && update.attachments.length > 0 && (
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {update.attachments.map((file, idx) => (
                                                                                    <a
                                                                                        key={idx}
                                                                                        href={file.url}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-sm"
                                                                                        title="View / Download"
                                                                                    >
                                                                                        <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                                                                        <span className="truncate max-w-[150px]">{file.filename}</span>
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {update.screenshotLinks && update.screenshotLinks.length > 0 && (
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {update.screenshotLinks.map((url, idx) => {
                                                                                    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
                                                                                    return (
                                                                                        <a
                                                                                            key={idx}
                                                                                            href={cleanUrl}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/30 rounded-lg text-xs font-semibold text-indigo-700 transition-colors shadow-sm"
                                                                                            title="Open External Link"
                                                                                        >
                                                                                            <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                                                                                            <span className="truncate max-w-[180px]">{url}</span>
                                                                                        </a>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <p className="text-[10px] font-semibold text-slate-400 mt-2">{update.time}</p>
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
                                                    <p className="text-xs text-amber-700 font-bold mb-1 flex items-center justify-center">
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
                                                        onClick={() => navigate(`/employee/kanban?project=${encodeURIComponent(selectedTask.project)}`)}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm text-sm cursor-pointer"
                                                    >
                                                        Update Status
                                                    </button>
                                                    <button 
                                                        onClick={() => navigate(`/employee/kanban?project=${encodeURIComponent(selectedTask.project)}`)}
                                                        className="px-4 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm cursor-pointer"
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
                                    <h2 className="text-sm font-bold text-slate-800 flex items-center">
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
                                                    <p className="text-[10px] font-semibold text-slate-400 mt-1">{activity.time}</p>
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

export default EmployeeDashboard;
