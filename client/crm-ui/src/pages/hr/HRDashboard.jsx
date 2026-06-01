import React, { useState, useEffect, useRef } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { leaveService, userService } from "../../api/services";
import { toast } from "sonner";
import { 
    Users, UserCheck, UserX, Calendar, ClipboardList, UserPlus, 
    Activity, TrendingUp, BarChart3, PieChart, ChevronRight
} from "lucide-react";

// Hook to dynamically monitor container dimensions for responsive SVG drawing
const useResize = (ref) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        resizeObserver.observe(element);
        return () => {
            if (element) resizeObserver.unobserve(element);
            resizeObserver.disconnect();
        };
    }, [ref]);
    return dimensions;
};

// ─── Custom Chart 1: Active vs Inactive Employee Donut (Interactive) ──────────
const ActiveInactiveDonut = ({ activeCount, inactiveCount }) => {
    const containerRef = useRef(null);
    const { width } = useResize(containerRef);
    const total = activeCount + inactiveCount || 0;
    const [hoveredIndex, setHoveredIndex] = useState(null);
    
    const data = [
        { name: "Active", count: activeCount, color: "#10b981", bg: "bg-emerald-500", rawBg: "rgba(16, 185, 129, 0.15)" },
        { name: "Inactive", count: inactiveCount, color: "#94a3b8", bg: "bg-slate-400", rawBg: "rgba(148, 163, 184, 0.15)" }
    ];
    
    let accumulatedPercentage = 0;
    const r = 38;
    const strokeWidth = 10;
    const circ = 2 * Math.PI * r;

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-center select-none min-h-[220px]">
            {width > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-full">
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                        <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                            {data.map((s, idx) => {
                                const percent = total > 0 ? (s.count / total) * 100 : 0;
                                if (percent === 0) return null;
                                const segmentOffset = -((circ * accumulatedPercentage) / 100);
                                accumulatedPercentage += percent;
                                
                                const isHovered = hoveredIndex === idx;
                                return (
                                    <circle
                                        key={s.name}
                                        cx="50"
                                        cy="50"
                                        r={r}
                                        fill="transparent"
                                        stroke={s.color}
                                        strokeWidth={isHovered ? strokeWidth + 2.5 : strokeWidth}
                                        strokeDasharray={`${(circ * percent) / 100} ${circ}`}
                                        strokeDashoffset={segmentOffset}
                                        strokeLinecap="round"
                                        onMouseEnter={() => setHoveredIndex(idx)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        className="transition-all duration-300 origin-center cursor-pointer"
                                        style={{
                                            opacity: hoveredIndex !== null && !isHovered ? 0.45 : 1,
                                            transform: isHovered ? "scale(1.025)" : "scale(1)"
                                        }}
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                            {hoveredIndex !== null ? (
                                <>
                                    <span 
                                        className="text-2xl font-black tracking-tight leading-none"
                                        style={{ color: data[hoveredIndex].color }}
                                    >
                                        {data[hoveredIndex].count}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                        {data[hoveredIndex].name}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                                        {total}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Total Users</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-[45%]">
                        {data.map((s, idx) => {
                            const percent = total > 0 ? Math.round((s.count / total) * 100) : 0;
                            const isHovered = hoveredIndex === idx;
                            return (
                                <div 
                                    key={s.name} 
                                    onMouseEnter={() => setHoveredIndex(idx)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                                        isHovered 
                                            ? "border-slate-300 shadow-sm" 
                                            : "border-slate-100"
                                    }`}
                                    style={{
                                        backgroundColor: isHovered ? s.rawBg : "rgba(255, 255, 255, 0.7)",
                                        opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${s.bg}`} />
                                        <span className="text-xs font-bold text-slate-700 truncate">{s.name}</span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-500 font-mono">{s.count} ({percent}%)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Custom Chart 2: Employee Growth Curve (Interactive Bezier Curve) ─────────
const GrowthCurve = ({ growthData }) => {
    const containerRef = useRef(null);
    const { width, height } = useResize(containerRef);
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const points = [];
    const activeWidth = width || 320;
    const activeHeight = height || 220;

    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 25;
    const paddingBottom = 30;

    const chartWidth = Math.max(100, activeWidth - paddingLeft - paddingRight);
    const chartHeight = Math.max(100, activeHeight - paddingTop - paddingBottom);

    const counts = growthData && growthData.length > 0 ? growthData.map(d => d.count) : [0];
    const maxVal = Math.max(...counts, 4);

    if (growthData && growthData.length > 0) {
        growthData.forEach((d, i) => {
            const x = paddingLeft + (i * (chartWidth / Math.max(1, growthData.length - 1)));
            const y = activeHeight - paddingBottom - (d.count / maxVal) * chartHeight;
            points.push({ x, y, count: d.count, label: d.month });
        });
    }

    let linePath = "";
    if (points.length > 0) {
        linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) / 3;
            const cp1y = p0.y;
            const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
            const cp2y = p1.y;
            linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
        }
    }
    const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} ${activeHeight - paddingBottom} L ${points[0].x} ${activeHeight - paddingBottom} Z` : "";

    return (
        <div ref={containerRef} className="w-full h-full relative min-h-[220px] select-none">
            {width > 0 && points.length > 0 ? (
                <>
                    <svg width={activeWidth} height={activeHeight} viewBox={`0 0 ${activeWidth} ${activeHeight}`} className="overflow-visible select-none">
                        <defs>
                            <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                            const y = activeHeight - paddingBottom - ratio * chartHeight;
                            const val = Math.round(ratio * maxVal);
                            return (
                                <g key={idx} className="opacity-40">
                                    <line x1={paddingLeft} y1={y} x2={activeWidth - paddingRight} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                                    <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-mono">{val}</text>
                                </g>
                            );
                        })}
                        {areaPath && <path d={areaPath} fill="url(#growthAreaGrad)" />}
                        {linePath && <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
                        {points.map((p, i) => {
                            const isHovered = hoveredPoint === i;
                            return (
                                <g key={i}>
                                    <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r={isHovered ? "7" : "4.5"} 
                                        fill="#ffffff" 
                                        stroke="#6366f1" 
                                        strokeWidth="2.5"
                                        onMouseEnter={() => setHoveredPoint(i)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                        className="transition-all duration-200 cursor-pointer"
                                    />
                                    <text x={p.x} y={activeHeight - 8} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">{p.label.split(" ")[0]}</text>
                                </g>
                            );
                        })}
                    </svg>
                    
                    {/* Floating Tooltip inside the card relative to active dot */}
                    {hoveredPoint !== null && (
                        <div 
                            className="absolute bg-slate-900/90 text-white rounded-xl px-2.5 py-1.5 text-[10px] font-bold shadow-lg backdrop-blur-sm pointer-events-none border border-slate-700/50 z-20 animate-in fade-in zoom-in-95 duration-150"
                            style={{
                                left: `${points[hoveredPoint].x - 45}px`,
                                top: `${points[hoveredPoint].y - 45}px`
                            }}
                        >
                            <span className="block font-semibold text-[8px] text-slate-350 tracking-wider uppercase">{points[hoveredPoint].label}</span>
                            <span className="text-xs font-mono font-black mt-0.5 block">{points[hoveredPoint].count} Joinees</span>
                        </div>
                    )}
                </>
            ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading Growth Data...</div>
            )}
        </div>
    );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const HRDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [allLeaves, setAllLeaves] = useState([]);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        employeesOnLeave: 0,
        pendingLeaveRequests: 0,
        newJoinees: 0
    });
    const [graphs, setGraphs] = useState({
        deptDistribution: [],
        leaveDistribution: [],
        monthlyGrowth: []
    });
    const [recentActivity, setRecentActivity] = useState([]);
    
    // Interactive tooltips state for horizontal bars
    const [deptHoveredIdx, setDeptHoveredIdx] = useState(null);
    const [leaveHoveredIdx, setLeaveHoveredIdx] = useState(null);
    const [tooltipCoords, setTooltipCoords] = useState({ x: 0, y: 0 });

    // Click details modal state
    const [detailModal, setDetailModal] = useState({ isOpen: false, title: "", data: [], type: "" });

    useEffect(() => {
        const fetchHRStats = async () => {
            try {
                setLoading(true);
                const [statsRes, usersRes, leavesRes] = await Promise.all([
                    leaveService.getHRStats(),
                    userService.getAllUsers({ status: "all" }),
                    leaveService.getLeaves()
                ]);
                
                if (statsRes.data?.success) {
                    setStats(statsRes.data.data.stats);
                    setGraphs(statsRes.data.data.graphs);
                    setRecentActivity(statsRes.data.data.recentActivity || []);
                }
                if (usersRes.data?.success) {
                    setAllUsers(usersRes.data.data);
                }
                if (leavesRes.data?.success) {
                    setAllLeaves(leavesRes.data.data);
                }
            } catch (err) {
                console.error("Failed to load HR Dashboard metrics:", err);
                toast.error("Failed to load HR dashboard analytics!");
            } finally {
                setLoading(false);
            }
        };
        fetchHRStats();
    }, []);

    // Mouse movement inside bar stack for positioning tooltips
    const handleBarMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipCoords({
            x: e.clientX - rect.left + 15,
            y: e.clientY - rect.top - 20
        });
    };

    const statCards = [
        { 
            title: "Total Employees", 
            value: stats.totalEmployees, 
            icon: <Users className="w-4.5 h-4.5" />, 
            themeColor: "blue",
            bg: "bg-blue-50",
            color: "text-blue-600",
            onClick: () => setDetailModal({ 
                isOpen: true, 
                title: "Active CRM Employees Directory", 
                data: allUsers.filter(u => u.isActive), 
                type: "employee" 
            })
        },
        { 
            title: "Active Employees", 
            value: stats.activeEmployees, 
            icon: <UserCheck className="w-4.5 h-4.5" />, 
            themeColor: "emerald",
            bg: "bg-emerald-50",
            color: "text-emerald-600",
            onClick: () => setDetailModal({ 
                isOpen: true, 
                title: "Operational / Active Staff List", 
                data: allUsers.filter(u => u.isActive && u.status !== "inactive"), 
                type: "employee" 
            })
        },
        { 
            title: "Inactive Employees", 
            value: stats.inactiveEmployees, 
            icon: <UserX className="w-4.5 h-4.5" />, 
            themeColor: "slate",
            bg: "bg-slate-100/80",
            color: "text-slate-600",
            onClick: () => setDetailModal({ 
                isOpen: true, 
                title: "Temporarily Inactive / Off-Duty Staff", 
                data: allUsers.filter(u => !u.isActive || u.status === "inactive"), 
                type: "employee" 
            })
        },
        { 
            title: "Employees On Leave", 
            value: stats.employeesOnLeave, 
            icon: <Calendar className="w-4.5 h-4.5" />, 
            themeColor: "amber",
            bg: "bg-amber-50",
            color: "text-amber-600",
            onClick: () => {
                const onLeaveList = allLeaves.filter(l => 
                    l.status === "Approved" && 
                    new Date(l.startDate) <= new Date() && 
                    new Date(l.endDate) >= new Date()
                ).map(l => ({
                    ...l.employee,
                    leaveDetails: `${l.leaveType} (${l.totalDays} Days: ${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()})`
                }));
                setDetailModal({ 
                    isOpen: true, 
                    title: "Employees On Leave Today", 
                    data: onLeaveList, 
                    type: "employee-leave" 
                });
            }
        },
        { 
            title: "Pending Leaves", 
            value: stats.pendingLeaveRequests, 
            icon: <ClipboardList className="w-4.5 h-4.5" />, 
            themeColor: "rose",
            bg: "bg-rose-50",
            color: "text-rose-600",
            onClick: () => setDetailModal({ 
                isOpen: true, 
                title: "Awaiting Leaves Reviews Queue", 
                data: allLeaves.filter(l => l.status === "Pending"), 
                type: "leave-request" 
            })
        },
        { 
            title: "New Joinees (30d)", 
            value: stats.newJoinees, 
            icon: <UserPlus className="w-4.5 h-4.5" />, 
            themeColor: "indigo",
            bg: "bg-indigo-50",
            color: "text-indigo-600",
            onClick: () => {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const newList = allUsers.filter(u => u.isActive && new Date(u.createdAt) >= thirtyDaysAgo);
                setDetailModal({ 
                    isOpen: true, 
                    title: "Onboarded Employees (Last 30 Days)", 
                    data: newList, 
                    type: "employee" 
                });
            }
        }
    ];

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800 selection:bg-blue-200 selection:text-blue-900">
            <AdminSidebar role="hr" />
            
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="HR Workspace" role="hr" />
                
                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-500">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Overview</h1>
                            <p className="text-slate-500 text-sm font-semibold mt-1">Operational HR metrics, leave distribution, and onboarding analytics.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                            <h3 className="text-lg font-bold text-slate-700">Compiling HR analytics...</h3>
                        </div>
                    ) : (
                        <>
                            {/* KPI Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-6 animate-in fade-in duration-700 delay-100 fill-mode-both">
                                {statCards.map((kpi, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={kpi.onClick}
                                        className={`premium-stat-card ${kpi.themeColor} flex flex-col sm:flex-row sm:items-center items-start gap-3 sm:gap-4 p-4 sm:p-5 h-[115px] sm:h-[90px] w-full justify-start cursor-pointer`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                                            {kpi.icon}
                                        </div>
                                        <div className="flex flex-col justify-center min-w-0 w-full">
                                            <h4 className="text-2xl font-extrabold tracking-tight text-slate-800 leading-none mb-1">{kpi.value}</h4>
                                            <p className="text-[10px] font-semibold text-slate-400 truncate uppercase tracking-wider">{kpi.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Visual Analytics Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-700 delay-200 fill-mode-both">
                                
                                {/* Department Distribution */}
                                <div className="premium-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BarChart3 className="w-4 h-4 text-blue-500" />
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Department Distribution</h3>
                                    </div>
                                    <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 relative">
                                        {graphs.deptDistribution.length > 0 ? (
                                            graphs.deptDistribution.map((d, i) => {
                                                const maxCount = Math.max(...graphs.deptDistribution.map(x => x.count), 1);
                                                const percent = Math.round((d.count / maxCount) * 100);
                                                const isHovered = deptHoveredIdx === i;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className="space-y-1.5 cursor-pointer"
                                                        onMouseEnter={() => setDeptHoveredIdx(i)}
                                                        onMouseLeave={() => setDeptHoveredIdx(null)}
                                                        onMouseMove={handleBarMouseMove}
                                                    >
                                                        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                                                            <span className="truncate">{d.department}</span>
                                                            <span className="font-semibold text-slate-450 font-mono">{d.count} Users</span>
                                                        </div>
                                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden transition-all duration-300">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" 
                                                                style={{ 
                                                                    width: `${percent}%`,
                                                                    opacity: deptHoveredIdx !== null && !isHovered ? 0.5 : 1
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-xs text-slate-400 text-center py-10 font-semibold">No department distribution logs found.</div>
                                        )}
                                    </div>

                                    {/* Department Tooltip */}
                                    {deptHoveredIdx !== null && (
                                        <div 
                                            className="absolute bg-slate-900/90 text-white rounded-xl px-3 py-2 text-[10px] font-bold shadow-lg backdrop-blur-sm pointer-events-none border border-slate-700/50 z-20 animate-in fade-in zoom-in-95 duration-150"
                                            style={{
                                                left: `${tooltipCoords.x}px`,
                                                top: `${tooltipCoords.y}px`
                                            }}
                                        >
                                            <span className="block font-bold text-slate-350 tracking-wider uppercase text-[8px]">Department Scopes</span>
                                            <span className="text-xs font-bold mt-0.5 block">{graphs.deptDistribution[deptHoveredIdx].department}</span>
                                            <span className="text-[11px] text-slate-300 mt-1 block font-mono font-medium">{graphs.deptDistribution[deptHoveredIdx].count} Total Employees</span>
                                        </div>
                                    )}
                                </div>

                                {/* User Status Breakdown (PieChart / Donut) */}
                                <div className="premium-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-4">
                                        <PieChart className="w-4 h-4 text-emerald-500" />
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">User Status Breakdown</h3>
                                    </div>
                                    <ActiveInactiveDonut activeCount={stats.activeEmployees} inactiveCount={stats.inactiveEmployees} />
                                </div>

                                {/* Employee Growth Curve */}
                                <div className="premium-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Onboarding Growth Trend</h3>
                                    </div>
                                    <GrowthCurve growthData={graphs.monthlyGrowth} />
                                </div>

                                {/* Leave Usages Distribution */}
                                <div className="premium-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calendar className="w-4 h-4 text-rose-500" />
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leave Usages Distribution</h3>
                                    </div>
                                    <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 relative">
                                        {graphs.leaveDistribution.length > 0 ? (
                                            graphs.leaveDistribution.map((l, i) => {
                                                const maxCount = Math.max(...graphs.leaveDistribution.map(x => x.count), 1);
                                                const percent = Math.round((l.count / maxCount) * 100);
                                                const isHovered = leaveHoveredIdx === i;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className="space-y-1.5 cursor-pointer"
                                                        onMouseEnter={() => setLeaveHoveredIdx(i)}
                                                        onMouseLeave={() => setLeaveHoveredIdx(null)}
                                                        onMouseMove={handleBarMouseMove}
                                                    >
                                                        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                                                            <span>{l.type}</span>
                                                            <span className="font-semibold text-slate-450 font-mono">{l.count} requests</span>
                                                        </div>
                                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden transition-all duration-300">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500" 
                                                                style={{ 
                                                                    width: `${percent}%`,
                                                                    opacity: leaveHoveredIdx !== null && !isHovered ? 0.5 : 1
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-xs text-slate-400 text-center py-10 font-semibold">No leave application history found.</div>
                                        )}
                                    </div>

                                    {/* Leave Tooltip */}
                                    {leaveHoveredIdx !== null && (
                                        <div 
                                            className="absolute bg-slate-900/90 text-white rounded-xl px-3 py-2 text-[10px] font-bold shadow-lg backdrop-blur-sm pointer-events-none border border-slate-700/50 z-20 animate-in fade-in zoom-in-95 duration-150"
                                            style={{
                                                left: `${tooltipCoords.x}px`,
                                                top: `${tooltipCoords.y}px`
                                            }}
                                        >
                                            <span className="block font-bold text-slate-350 tracking-wider uppercase text-[8px]">Leave Distribution</span>
                                            <span className="text-xs font-bold mt-0.5 block">{graphs.leaveDistribution[leaveHoveredIdx].type}</span>
                                            <span className="text-[11px] text-slate-300 mt-1 block font-mono font-medium">{graphs.leaveDistribution[leaveHoveredIdx].count} Total Applications</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Activity Log Strip */}
                            <div className="premium-card p-6 hover:shadow-md transition-shadow animate-in fade-in duration-700 delay-300 fill-mode-both">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                    <Activity className="w-4.5 h-4.5 text-blue-500" />
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent HR Lifecycle logs</h3>
                                </div>
                                <div className="space-y-3.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {recentActivity.length > 0 ? (
                                        recentActivity.map((act, i) => {
                                            const isLeave = act.type === "leave";
                                            const isInactive = act.action.includes("Inactive");
                                            
                                            let badgeStyle = "bg-blue-50 text-blue-700 border-blue-100";
                                            if (isLeave) {
                                                if (act.action.includes("Approved")) badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                                                else if (act.action.includes("Rejected")) badgeStyle = "bg-rose-50 text-rose-700 border-rose-100";
                                                else badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                                            } else if (isInactive) {
                                                badgeStyle = "bg-slate-50 text-slate-500 border-slate-200";
                                            } else {
                                                badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-100";
                                            }

                                            return (
                                                <div key={i} className="flex items-center justify-between gap-4 p-3.5 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all group">
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <span className={`px-2.5 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 shadow-sm ${badgeStyle}`}>
                                                            {act.action}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{act.detail}</p>
                                                            {act.reason && <p className="text-[10px] font-semibold text-slate-450 truncate mt-0.5">Reason: {act.reason}</p>}
                                                        </div>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 shrink-0 font-mono uppercase tracking-wider">
                                                        {new Date(act.timestamp).toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-slate-400 text-center py-10 font-semibold">No recent lifecycle events.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* High-Fidelity HR Detail Modal (Clickable Stats popup) */}
            {detailModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
                        onClick={() => setDetailModal({ isOpen: false, title: "", data: [], type: "" })} 
                    />
                    
                    {/* Modal Content */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-600 shrink-0">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{detailModal.title}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{detailModal.data?.length || 0} Records Found</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setDetailModal({ isOpen: false, title: "", data: [], type: "" })}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
                            {detailModal.data && detailModal.data.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {detailModal.data.map((item, idx) => {
                                        if (detailModal.type === "employee") {
                                            const initial = item.name?.charAt(0).toUpperCase() || "E";
                                            return (
                                                <div key={item._id || idx} className="flex items-center justify-between py-3 hover:bg-slate-50/30 rounded-xl px-1">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden shrink-0 border border-blue-100">
                                                            {item.profilePic ? <img src={item.profilePic} alt="" className="w-full h-full object-cover" /> : initial}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                                            <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">{item.designation || item.role} • {item.department || "Unassigned"}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                                        item.status === 'inactive' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    }`}>
                                                        {item.status || 'Active'}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        
                                        if (detailModal.type === "employee-leave") {
                                            const initial = item.name?.charAt(0).toUpperCase() || "E";
                                            return (
                                                <div key={item._id || idx} className="flex flex-col gap-2 py-3 hover:bg-slate-50/30 rounded-xl px-1">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden shrink-0 border border-amber-100">
                                                            {item.profilePic ? <img src={item.profilePic} alt="" className="w-full h-full object-cover" /> : initial}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                                            <p className="text-[11px] font-semibold text-slate-450 truncate mt-0.5">{item.designation || item.role} • {item.department || "Unassigned"}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-amber-50 border border-amber-100/60 rounded-xl p-2.5 text-xs text-amber-800 font-semibold space-y-1">
                                                        <div className="flex justify-between">
                                                            <span>Active Leave Status:</span>
                                                            <span className="font-bold text-amber-900">{item.leaveDetails}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (detailModal.type === "leave-request") {
                                            const emp = item.employee || {};
                                            const initial = emp.name?.charAt(0).toUpperCase() || "E";
                                            return (
                                                <div key={item._id || idx} className="flex flex-col gap-2.5 py-3 hover:bg-slate-50/30 rounded-xl px-1">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden shrink-0 border border-indigo-100">
                                                            {emp.profilePic ? <img src={emp.profilePic} alt="" className="w-full h-full object-cover" /> : initial}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate">{emp.name}</p>
                                                            <p className="text-[11px] font-semibold text-slate-450 truncate mt-0.5">{emp.designation || (emp.role ? (emp.role === 'TL' ? 'Team Lead' : (emp.role === 'qa' ? 'QA' : (emp.role === 'admin' ? 'Admin' : emp.role.charAt(0).toUpperCase() + emp.role.slice(1)))) : 'Employee')} • {emp.department || "Unassigned"}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 text-xs space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-semibold text-slate-400">Leave Category:</span>
                                                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[9px] uppercase tracking-wider">{item.leaveType}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-semibold text-slate-400">Request Dates:</span>
                                                            <span className="font-bold text-slate-700">{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()} ({item.totalDays} Days)</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 pt-2 border-t border-slate-250/35">
                                                            <span className="font-semibold text-slate-400">Application Reason:</span>
                                                            <span className="text-slate-600 italic font-medium leading-relaxed">"{item.reason}"</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return null;
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                    <Users className="w-10 h-10 text-slate-200 mb-2 animate-pulse" />
                                    <p className="text-sm font-bold">No records found</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                            <button 
                                onClick={() => setDetailModal({ isOpen: false, title: "", data: [], type: "" })}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-55 transition-colors shadow-sm cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRDashboard;
