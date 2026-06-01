import React, { useState, useEffect, useRef } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { leaveService } from "../../api/services";
import { toast } from "sonner";
import { 
    Users, UserCheck, UserX, Calendar, ClipboardList, UserPlus, 
    Activity, TrendingUp, BarChart3, PieChart
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

// ─── Custom Chart 1: Active vs Inactive Employee Donut ────────────────────────
const ActiveInactiveDonut = ({ activeCount, inactiveCount }) => {
    const containerRef = useRef(null);
    const { width } = useResize(containerRef);
    const total = activeCount + inactiveCount || 0;
    
    const data = [
        { name: "Active", count: activeCount, color: "#10b981", bg: "bg-emerald-500" },
        { name: "Inactive", count: inactiveCount, color: "#64748b", bg: "bg-slate-500" }
    ];
    
    let accumulatedPercentage = 0;
    const r = 38;
    const strokeWidth = 10;
    const circ = 2 * Math.PI * r;

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-center select-none min-h-[220px]">
            {width > 0 && (
                <div className="flex flex-row items-center justify-around gap-4 h-full">
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                        <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#1e293b" strokeWidth={strokeWidth} />
                            {data.map((s) => {
                                const percent = total > 0 ? (s.count / total) * 100 : 0;
                                if (percent === 0) return null;
                                const segmentOffset = -((circ * accumulatedPercentage) / 100);
                                accumulatedPercentage += percent;
                                return (
                                    <circle
                                        key={s.name}
                                        cx="50"
                                        cy="50"
                                        r={r}
                                        fill="transparent"
                                        stroke={s.color}
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={`${(circ * percent) / 100} ${circ}`}
                                        strokeDashoffset={segmentOffset}
                                        strokeLinecap="round"
                                        className="transition-all duration-300 origin-center"
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-extrabold text-slate-100 tracking-tight leading-none">
                                {total}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1">Total Users</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 w-[45%]">
                        {data.map(s => {
                            const percent = total > 0 ? Math.round((s.count / total) * 100) : 0;
                            return (
                                <div key={s.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${s.bg}`} />
                                        <span className="text-xs font-bold text-slate-300 truncate">{s.name}</span>
                                    </div>
                                    <span className="text-[11px] font-mono font-bold text-slate-400">{s.count} ({percent}%)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Custom Chart 2: Employee Growth Curve (Bezier Curve) ───────────────────
const GrowthCurve = ({ growthData }) => {
    const containerRef = useRef(null);
    const { width, height } = useResize(containerRef);
    const points = [];
    const activeWidth = width || 320;
    const activeHeight = height || 220;

    const paddingLeft = 32;
    const paddingRight = 12;
    const paddingTop = 15;
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
        <div ref={containerRef} className="w-full h-full relative min-h-[220px]">
            {width > 0 && points.length > 0 ? (
                <svg width={activeWidth} height={activeHeight} viewBox={`0 0 ${activeWidth} ${activeHeight}`} className="overflow-visible select-none">
                    <defs>
                        <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                        </linearGradient>
                    </defs>
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = activeHeight - paddingBottom - ratio * chartHeight;
                        const val = Math.round(ratio * maxVal);
                        return (
                            <g key={idx} className="opacity-30">
                                <line x1={paddingLeft} y1={y} x2={activeWidth - paddingRight} y2={y} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-mono">{val}</text>
                            </g>
                        );
                    })}
                    {areaPath && <path d={areaPath} fill="url(#growthAreaGrad)" />}
                    {linePath && <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
                    {points.map((p, i) => (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
                            <text x={p.x} y={activeHeight - 8} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">{p.label}</text>
                        </g>
                    ))}
                </svg>
            ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading Growth Data...</div>
            )}
        </div>
    );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const HRDashboard = () => {
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        const fetchHRStats = async () => {
            try {
                setLoading(true);
                const res = await leaveService.getHRStats();
                if (res.data?.success) {
                    setStats(res.data.data.stats);
                    setGraphs(res.data.data.graphs);
                    setRecentActivity(res.data.data.recentActivity || []);
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

    const statCards = [
        { title: "Total Employees", value: stats.totalEmployees, icon: <Users className="w-6 h-6 text-blue-400" />, glow: "from-blue-500/10 to-indigo-500/5", border: "border-blue-500/20" },
        { title: "Active Employees", value: stats.activeEmployees, icon: <UserCheck className="w-6 h-6 text-emerald-400" />, glow: "from-emerald-500/10 to-teal-500/5", border: "border-emerald-500/20" },
        { title: "Inactive Employees", value: stats.inactiveEmployees, icon: <UserX className="w-6 h-6 text-slate-400" />, glow: "from-slate-500/10 to-slate-400/5", border: "border-slate-500/20" },
        { title: "Employees On Leave", value: stats.employeesOnLeave, icon: <Calendar className="w-6 h-6 text-amber-400" />, glow: "from-amber-500/10 to-orange-500/5", border: "border-amber-500/20" },
        { title: "Pending Leaves", value: stats.pendingLeaveRequests, icon: <ClipboardList className="w-6 h-6 text-rose-400" />, glow: "from-rose-500/10 to-pink-500/5", border: "border-rose-500/20" },
        { title: "New Joinees (30d)", value: stats.newJoinees, icon: <UserPlus className="w-6 h-6 text-indigo-400" />, glow: "from-indigo-500/10 to-purple-500/5", border: "border-indigo-500/20" }
    ];

    return (
        <div className="flex h-screen bg-[#060B18] text-slate-200 overflow-hidden font-sans">
            <AdminSidebar role="hr" />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
                <Topbar title="Human Resources Portal" />
                
                <main className="flex-1 p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
                    {/* Glassmorphic Greeting Header */}
                    <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-[28px] p-6 sm:p-8 backdrop-blur-md">
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Enterprise HR Dashboard</h1>
                                <p className="text-slate-400 mt-1.5 text-sm font-medium">Monitor real-time company growth, departments distribution, leave requests, and lifecycle logs.</p>
                            </div>
                            <span className="px-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl text-xs font-bold text-slate-300 font-mono self-start md:self-auto shrink-0 shadow-sm">
                                {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-400 text-sm font-bold tracking-wide">Compiling analytics engine...</span>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                {statCards.map((card, i) => (
                                    <div key={i} className={`relative overflow-hidden bg-slate-900/35 border ${card.border} rounded-2xl p-5 backdrop-blur-sm group hover:scale-[1.02] transition-all duration-300`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${card.glow} opacity-100 transition-opacity`} />
                                        <div className="relative z-10 flex flex-col gap-3">
                                            <div className="p-2 bg-slate-800/60 border border-slate-700/40 rounded-xl w-fit shrink-0">
                                                {card.icon}
                                            </div>
                                            <div>
                                                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{card.title}</span>
                                                <h3 className="text-2xl font-black text-white mt-0.5 tracking-tight font-mono">{card.value}</h3>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Graphs Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Department Distribution */}
                                <div className="bg-slate-900/35 border border-slate-800/80 rounded-[24px] p-6 backdrop-blur-sm flex flex-col justify-between">
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                                        <BarChart3 className="w-5 h-5 text-blue-400" />
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Department Distribution</h3>
                                    </div>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                                        {graphs.deptDistribution.length > 0 ? (
                                            graphs.deptDistribution.map((d, i) => {
                                                const maxCount = Math.max(...graphs.deptDistribution.map(x => x.count), 1);
                                                const percent = Math.round((d.count / maxCount) * 100);
                                                return (
                                                    <div key={i} className="space-y-2">
                                                        <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                                            <span className="truncate">{d.department}</span>
                                                            <span className="font-mono text-slate-400">{d.count} employees</span>
                                                        </div>
                                                        <div className="h-3 bg-slate-950/60 rounded-full overflow-hidden border border-slate-800/50">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500" 
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-xs text-slate-500 text-center py-10">No department distribution logs found.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Active vs Inactive Employees */}
                                <div className="bg-slate-900/35 border border-slate-800/80 rounded-[24px] p-6 backdrop-blur-sm flex flex-col justify-between">
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                                        <PieChart className="w-5 h-5 text-emerald-400" />
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">User Status Breakdown</h3>
                                    </div>
                                    <ActiveInactiveDonut activeCount={stats.activeEmployees} inactiveCount={stats.inactiveEmployees} />
                                </div>

                                {/* Employee Growth Curve */}
                                <div className="bg-slate-900/35 border border-slate-800/80 rounded-[24px] p-6 backdrop-blur-sm flex flex-col justify-between">
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Onboarding Growth Trend</h3>
                                    </div>
                                    <GrowthCurve growthData={graphs.monthlyGrowth} />
                                </div>

                                {/* Leave Distribution Breakdown */}
                                <div className="bg-slate-900/35 border border-slate-800/80 rounded-[24px] p-6 backdrop-blur-sm flex flex-col justify-between">
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                                        <Calendar className="w-5 h-5 text-rose-400" />
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Leave Usages Distribution</h3>
                                    </div>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                                        {graphs.leaveDistribution.length > 0 ? (
                                            graphs.leaveDistribution.map((l, i) => {
                                                const maxCount = Math.max(...graphs.leaveDistribution.map(x => x.count), 1);
                                                const percent = Math.round((l.count / maxCount) * 100);
                                                return (
                                                    <div key={i} className="space-y-2">
                                                        <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                                            <span>{l.type}</span>
                                                            <span className="font-mono text-slate-400">{l.count} requests</span>
                                                        </div>
                                                        <div className="h-3 bg-slate-950/60 rounded-full overflow-hidden border border-slate-800/50">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500" 
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-xs text-slate-500 text-center py-10">No leave application history found.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity timeline */}
                            <div className="bg-slate-900/35 border border-slate-800/80 rounded-[28px] p-6 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
                                    <Activity className="w-5 h-5 text-blue-400" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Recent HR Lifecycle logs</h3>
                                </div>
                                <div className="space-y-4 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                                    {recentActivity.length > 0 ? (
                                        recentActivity.map((act, i) => {
                                            const isLeave = act.type === "leave";
                                            const isInactive = act.action.includes("Inactive");
                                            
                                            let badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                            if (isLeave) {
                                                if (act.action.includes("Approved")) badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                                else if (act.action.includes("Rejected")) badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                                                else badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                                            } else if (isInactive) {
                                                badgeStyle = "bg-slate-500/10 text-slate-400 border-slate-500/20";
                                            } else {
                                                badgeStyle = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                                            }

                                            return (
                                                <div key={i} className="flex items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl hover:border-slate-700/60 transition-all">
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${badgeStyle}`}>
                                                            {act.action}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-200 truncate">{act.detail}</p>
                                                            {act.reason && <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">Reason: {act.reason}</p>}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500 shrink-0 font-mono">
                                                        {new Date(act.timestamp).toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-slate-500 text-center py-10">No recent lifecycle events.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default HRDashboard;
