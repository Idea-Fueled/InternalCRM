import React, { useState, useEffect, useRef, useMemo } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";

import { dashboardService, projectService, userService, taskService, notificationService, departmentService } from "../../api/services";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { exportPDF } from "../../utils/pdfExport";
import StatDetailModal from "../../components/StatDetailModal";
import { 
    Users, Briefcase, CheckCircle2, Clock, Play, AlertCircle, ListTodo, ShieldAlert,
    TrendingUp, Plus, Download, Activity, BarChart3
} from "lucide-react";

// Reusable Card Component
const Card = ({ children, className = "" }) => (
    <div className={`premium-card ${className}`}>
        {children}
    </div>
);

const formatTimeAgo = (date) => {
    if (!date) return "N/A";
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return then.toLocaleDateString();
};

// Hook to dynamically monitor container width and height
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
            if (element) {
                resizeObserver.unobserve(element);
            }
            resizeObserver.disconnect();
        };
    }, [ref]);
    
    return dimensions;
};

// ─── Custom Chart 1: Task Completion Trend ──────────────────────────────────────
const TaskCompletionGraph = ({ allTasks }) => {
    const containerRef = useRef(null);
    const { width, height } = useResize(containerRef);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    
    // Calculate last 7 days completed tasks
    const counts = Array(7).fill(0);
    const labels = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
        
        const startOfDay = new Date(d.setHours(0,0,0,0));
        const endOfDay = new Date(d.setHours(23,59,59,999));
        
        const completedOnDay = allTasks.filter(t => {
            if (!["Completed", "Done"].includes(t.status)) return false;
            const compHistory = t.statusHistory?.find(h => ["Completed", "Done"].includes(h.status));
            const compDate = compHistory ? new Date(compHistory.changedAt) : (t.updatedAt ? new Date(t.updatedAt) : null);
            return compDate && compDate >= startOfDay && compDate <= endOfDay;
        });
        
        counts[6 - i] = completedOnDay.length;
    }

    const maxVal = Math.max(...counts, 4);
    
    // Symmetrical fluid scaling
    const activeWidth = width || 320;
    const activeHeight = height || 250;
    
    const paddingLeft = 32;
    const paddingRight = 12;
    const paddingTop = 15;
    const paddingBottom = 30;
    
    const chartWidth = Math.max(100, activeWidth - paddingLeft - paddingRight);
    const chartHeight = Math.max(100, activeHeight - paddingTop - paddingBottom);
    
    const points = counts.map((count, i) => {
        const x = paddingLeft + (i * (chartWidth / 6));
        const y = activeHeight - paddingBottom - (count / maxVal) * chartHeight;
        return { x, y, count, label: labels[i] };
    });
    
    // Smooth Bezier Curve spline drawing
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
            {width > 0 && (
                <svg width={activeWidth} height={activeHeight} viewBox={`0 0 ${activeWidth} ${activeHeight}`} className="overflow-visible select-none">
                    <defs>
                        <linearGradient id="emeraldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                        </linearGradient>
                    </defs>
                    
                    {/* Horizontal Dashed Helper Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = activeHeight - paddingBottom - ratio * chartHeight;
                        const val = Math.round(ratio * maxVal);
                        return (
                            <g key={idx} className="opacity-40">
                                <line x1={paddingLeft} y1={y} x2={activeWidth - paddingRight} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-mono">{val}</text>
                            </g>
                        );
                    })}
                    
                    {/* Area Gradient */}
                    {areaPath && (
                        <path d={areaPath} fill="url(#emeraldAreaGrad)" className="transition-all duration-500 ease-out" />
                    )}
                    
                    {/* Curve Line */}
                    {linePath && (
                        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-500 ease-out" />
                    )}
                    
                    {/* Points */}
                    {points.map((p, i) => (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r="16" fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} />
                            <circle cx={p.x} cy={p.y} r={hoveredIndex === i ? "6" : "4"} fill="#ffffff" stroke="#10b981" strokeWidth={hoveredIndex === i ? "4" : "2.5"} className="transition-all duration-200 pointer-events-none" />
                        </g>
                    ))}
                    
                    {/* Labels */}
                    {points.map((p, i) => (
                        <text key={i} x={p.x} y={activeHeight - 8} textAnchor="middle" className={`text-[10px] font-bold transition-all ${hoveredIndex === i ? "fill-emerald-600 font-extrabold" : "fill-slate-400"}`}>{p.label}</text>
                    ))}
                </svg>
            )}
            
            {hoveredIndex !== null && width > 0 && (
                <div 
                    className="absolute bg-slate-950/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg pointer-events-none transition-all duration-150 flex items-center gap-1.5 border border-slate-800 animate-[fadeIn_0.15s_ease-out]"
                    style={{
                        left: `${(points[hoveredIndex].x / activeWidth) * 100}%`,
                        top: `${(points[hoveredIndex].y / activeHeight) * 100 - 10}%`,
                        transform: "translate(-50%, -100%)",
                    }}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{points[hoveredIndex].label}: {points[hoveredIndex].count} completed</span>
                </div>
            )}
        </div>
    );
};

// ─── Custom Chart 2: Weekly Productivity Graph ─────────────────────────────────
const WeeklyProductivityGraph = ({ allTasks }) => {
    const containerRef = useRef(null);
    const { width, height } = useResize(containerRef);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [hoveredType, setHoveredType] = useState(null);
    
    const createdCounts = Array(7).fill(0);
    const completedCounts = Array(7).fill(0);
    const labels = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
        
        const startOfDay = new Date(d.setHours(0,0,0,0));
        const endOfDay = new Date(d.setHours(23,59,59,999));
        
        const createdOnDay = allTasks.filter(t => {
            const createDate = t.createdAt ? new Date(t.createdAt) : null;
            return createDate && createDate >= startOfDay && createDate <= endOfDay;
        });
        createdCounts[6 - i] = createdOnDay.length;
        
        const completedOnDay = allTasks.filter(t => {
            if (!["Completed", "Done"].includes(t.status)) return false;
            const compHistory = t.statusHistory?.find(h => ["Completed", "Done"].includes(h.status));
            const compDate = compHistory ? new Date(compHistory.changedAt) : (t.updatedAt ? new Date(t.updatedAt) : null);
            return compDate && compDate >= startOfDay && compDate <= endOfDay;
        });
        completedCounts[6 - i] = completedOnDay.length;
    }

    const maxVal = Math.max(...createdCounts, ...completedCounts, 4);
    
    // Symmetrical fluid scaling
    const activeWidth = width || 320;
    const activeHeight = height || 250;
    
    const paddingLeft = 32;
    const paddingRight = 12;
    const paddingTop = 15;
    const paddingBottom = 30;
    
    const chartWidth = Math.max(100, activeWidth - paddingLeft - paddingRight);
    const chartHeight = Math.max(100, activeHeight - paddingTop - paddingBottom);
    
    const numGroups = 7;
    const groupWidth = chartWidth / numGroups;
    
    // Calculate bar sizes proportionally to avoid clipping or overlap
    const barWidth = Math.max(6, Math.min(16, groupWidth * 0.25));
    const gapBetweenBars = Math.max(2, Math.min(6, groupWidth * 0.08));
    
    return (
        <div ref={containerRef} className="w-full h-full relative min-h-[220px]">
            {width > 0 && (
                <svg width={activeWidth} height={activeHeight} viewBox={`0 0 ${activeWidth} ${activeHeight}`} className="overflow-visible select-none">
                    <defs>
                        <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="createdHoverGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#93c5fd" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                        <linearGradient id="completedHoverGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6ee7b7" />
                            <stop offset="100%" stopColor="#047857" />
                        </linearGradient>
                    </defs>

                    {/* Y-Axis Horizontal Helper Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = activeHeight - paddingBottom - ratio * chartHeight;
                        const val = Math.round(ratio * maxVal);
                        return (
                            <g key={idx} className="opacity-40">
                                <line x1={paddingLeft} y1={y} x2={activeWidth - paddingRight} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-mono">{val}</text>
                            </g>
                        );
                    })}
                    
                    {labels.map((label, i) => {
                        const groupCenterX = paddingLeft + (i * groupWidth) + (groupWidth / 2);
                        
                        const createdHeight = (createdCounts[i] / maxVal) * chartHeight;
                        const createdX = groupCenterX - barWidth - (gapBetweenBars / 2);
                        const createdY = activeHeight - paddingBottom - createdHeight;
                        
                        const completedHeight = (completedCounts[i] / maxVal) * chartHeight;
                        const completedX = groupCenterX + (gapBetweenBars / 2);
                        const completedY = activeHeight - paddingBottom - completedHeight;
                        
                        const isCreatedHovered = hoveredIdx === i && hoveredType === 'created';
                        const isCompletedHovered = hoveredIdx === i && hoveredType === 'completed';
                        
                        return (
                            <g key={i}>
                                {/* Created Bar */}
                                <rect
                                    x={createdX}
                                    y={createdY}
                                    width={barWidth}
                                    height={Math.max(2, createdHeight)}
                                    rx="3"
                                    fill={isCreatedHovered ? "url(#createdHoverGrad)" : "url(#createdGrad)"}
                                    className="transition-all duration-200 cursor-pointer"
                                    onMouseEnter={() => { setHoveredIdx(i); setHoveredType('created'); }}
                                    onMouseLeave={() => { setHoveredIdx(null); setHoveredType(null); }}
                                />
                                
                                {/* Completed Bar */}
                                <rect
                                    x={completedX}
                                    y={completedY}
                                    width={barWidth}
                                    height={Math.max(2, completedHeight)}
                                    rx="3"
                                    fill={isCompletedHovered ? "url(#completedHoverGrad)" : "url(#completedGrad)"}
                                    className="transition-all duration-200 cursor-pointer"
                                    onMouseEnter={() => { setHoveredIdx(i); setHoveredType('completed'); }}
                                    onMouseLeave={() => { setHoveredIdx(null); setHoveredType(null); }}
                                />
                                
                                {/* X-Axis Labels */}
                                <text
                                    x={groupCenterX}
                                    y={activeHeight - 8}
                                    textAnchor="middle"
                                    className={`text-[10px] font-bold transition-all ${hoveredIdx === i ? "fill-blue-600 font-extrabold" : "fill-slate-400"}`}
                                >
                                    {label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            )}
            
            {/* Tooltip */}
            {hoveredIdx !== null && hoveredType !== null && width > 0 && (
                <div 
                    className="absolute bg-slate-950/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg pointer-events-none transition-all duration-150 flex items-center gap-1.5 border border-slate-800 animate-[fadeIn_0.15s_ease-out]"
                    style={{
                        left: `${((paddingLeft + (hoveredIdx * groupWidth) + (groupWidth / 2)) / activeWidth) * 100}%`,
                        top: `${((activeHeight - paddingBottom - ((hoveredType === 'created' ? createdCounts[hoveredIdx] : completedCounts[hoveredIdx]) / maxVal) * chartHeight) / activeHeight) * 100 - 10}%`,
                        transform: "translate(-50%, -100%)",
                    }}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${hoveredType === 'created' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                    <span>
                        {labels[hoveredIdx]}: {hoveredType === 'created' ? createdCounts[hoveredIdx] : completedCounts[hoveredIdx]} {hoveredType === 'created' ? 'Created' : 'Completed'}
                    </span>
                </div>
            )}
        </div>
    );
};

// ─── Custom Chart 4: Task Status Distribution Chart (Donut) ──────────────────────
const TaskStatusDonut = ({ allTasks }) => {
    const containerRef = useRef(null);
    const { width, height } = useResize(containerRef);
    const [hoveredSegment, setHoveredSegment] = useState(null);
    const total = allTasks.length;
    
    const statuses = [
        { name: "Completed", label: "Completed", count: allTasks.filter(t => ["Completed", "Done"].includes(t.status)).length, color: "#10b981", bg: "bg-emerald-500" },
        { name: "In Progress", label: "In Progress", count: allTasks.filter(t => ["In Progress", "Active"].includes(t.status)).length, color: "#0ea5e9", bg: "bg-sky-500" },
        { name: "QA Review", label: "QA Review", count: allTasks.filter(t => t.status === "QA Review").length, color: "#8b5cf6", bg: "bg-violet-500" },
        { name: "Pending", label: "Pending", count: allTasks.filter(t => ["New", "Pending", "Todo", "To Do"].includes(t.status) || !t.status).length, color: "#94a3b8", bg: "bg-slate-400" },
    ];
    
    let accumulatedPercentage = 0;
    const r = 38;
    const strokeWidth = 10;
    const circ = 2 * Math.PI * r;
    
    // Determine layout mode based on measured width
    const isWideMode = width >= 380;
    
    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-center select-none">
            {width > 0 && (
                <div className={`flex ${isWideMode ? 'flex-row items-center justify-around gap-6' : 'flex-col items-center justify-center'} h-full`}>
                    {/* Donut Circle Container */}
                    <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                        <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                            {statuses.map((s) => {
                                const percent = total > 0 ? (s.count / total) * 100 : 0;
                                if (percent === 0) return null;
                                
                                const strokeDashoffset = circ - (circ * percent) / 100;
                                const rotation = (accumulatedPercentage / 100) * 360;
                                accumulatedPercentage += percent;
                                
                                const isHovered = hoveredSegment === s.name;
                                
                                return (
                                    <circle
                                        key={s.name}
                                        cx="50"
                                        cy="50"
                                        r={r}
                                        fill="transparent"
                                        stroke={s.color}
                                        strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                                        strokeDasharray={circ}
                                        strokeDashoffset={strokeDashoffset}
                                        transform={`rotate(${rotation} 50 50)`}
                                        strokeLinecap="round"
                                        className="transition-all duration-300 cursor-pointer origin-center"
                                        onMouseEnter={() => setHoveredSegment(s.name)}
                                        onMouseLeave={() => setHoveredSegment(null)}
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                                {hoveredSegment ? statuses.find(s => s.name === hoveredSegment)?.count : total}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 mt-1.5">
                                {hoveredSegment ? hoveredSegment : "Total Tasks"}
                            </span>
                        </div>
                    </div>
                    
                    {/* Legends */}
                    <div className={`grid ${isWideMode ? 'grid-cols-1 w-[45%]' : 'grid-cols-2 w-full mt-4'} gap-2`}>
                        {statuses.map(s => {
                            const percent = total > 0 ? Math.round((s.count / total) * 100) : 0;
                            const isSegmentHovered = hoveredSegment === s.name;
                            return (
                                <div 
                                    key={s.name} 
                                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl border border-slate-100/70 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-all duration-150 ${isSegmentHovered ? "bg-slate-100 border-slate-200 translate-x-1" : ""}`}
                                    onMouseEnter={() => setHoveredSegment(s.name)}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${s.bg}`} />
                                        <span className="text-[11px] font-bold text-slate-600 truncate">{s.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1 ml-1 font-mono text-[10px] font-bold text-slate-500 shrink-0">
                                        <span>{s.count}</span>
                                        <span className="text-slate-400 font-normal">({percent}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Custom Chart 5: Employee Performance Analytics ─────────────────────────────
const EmployeePerformanceGraph = ({ allTasks, users, selectedDept = "All" }) => {
    const containerRef = useRef(null);
    const { width, height } = useResize(containerRef);
    const [hoveredDayIndex, setHoveredDayIndex] = useState(null);
    
    // Sort and find top 3 performing employees
    const employeesPerformance = users
        .filter(u => u.role !== "admin")
        .map(emp => {
            const empTasks = allTasks.filter(t => {
                const uid = t.assignedTo?._id || t.assignedTo;
                return uid === emp._id;
            });
            const completedCount = empTasks.filter(t => ["Completed", "Done"].includes(t.status)).length;
            return { ...emp, completedCount };
        })
        .sort((a, b) => b.completedCount - a.completedCount);
        
    // Take top 3.
    const topEmployees = employeesPerformance.slice(0, 3);

    if (topEmployees.length === 0) {
        return (
            <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2 border border-slate-100">
                    <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-600">No Employee Performance Data</span>
                <span className="text-[10px] text-slate-400 mt-1">There are no employees or completed tasks in this department.</span>
            </div>
        );
    }

    const labels = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
    }

    // Predefined colors & gradients for top 3 employees
    const employeeColors = [
        { stroke: "#6366f1", area: "url(#indigoEmpGrad)", dot: "#6366f1", bg: "bg-indigo-500", text: "text-indigo-600" },
        { stroke: "#10b981", area: "url(#emeraldEmpGrad)", dot: "#10b981", bg: "bg-emerald-500", text: "text-emerald-600" },
        { stroke: "#f59e0b", area: "url(#amberEmpGrad)", dot: "#f59e0b", bg: "bg-amber-500", text: "text-amber-600" }
    ];

    // Compute trends for each of the top 3 employees
    const employeeTrends = topEmployees.map((emp, empIdx) => {
        const counts = Array(7).fill(0);
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const startOfDay = new Date(d.setHours(0,0,0,0));
            const endOfDay = new Date(d.setHours(23,59,59,999));
            
            const completedOnDay = allTasks.filter(t => {
                const uid = t.assignedTo?._id || t.assignedTo;
                if (uid !== emp._id) return false;
                if (!["Completed", "Done"].includes(t.status)) return false;
                
                const compHistory = t.statusHistory?.find(h => ["Completed", "Done"].includes(h.status));
                const compDate = compHistory ? new Date(compHistory.changedAt) : (t.updatedAt ? new Date(t.updatedAt) : null);
                return compDate && compDate >= startOfDay && compDate <= endOfDay;
            });
            counts[6 - i] = completedOnDay.length;
        }
        
        return { employee: emp, counts, total: counts.reduce((a, b) => a + b, 0) };
    });

    // Find overall maximum value across all trends for scaling (minimum of 4 for clean baseline layout)
    const allCounts = employeeTrends.flatMap(t => t.counts);
    const maxVal = Math.max(...allCounts, 4);

    const activeWidth = width || 320;
    const activeHeight = height ? height - 90 : 250; // leave space for legend

    const paddingLeft = 32;
    const paddingRight = 12;
    const paddingTop = 15;
    const paddingBottom = 30;

    const chartWidth = Math.max(100, activeWidth - paddingLeft - paddingRight);
    const chartHeight = Math.max(100, activeHeight - paddingTop - paddingBottom);

    // Calculate plotting points for all 3 lines
    const trendPoints = employeeTrends.map((trend) => {
        return trend.counts.map((count, i) => {
            const x = paddingLeft + (i * (chartWidth / 6));
            const y = activeHeight - paddingBottom - (count / maxVal) * chartHeight;
            return { x, y, count, label: labels[i] };
        });
    });

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-between select-none">
            <div className="flex-1 relative min-h-[220px]">
                {width > 0 && (
                    <svg width={activeWidth} height={activeHeight} viewBox={`0 0 ${activeWidth} ${activeHeight}`} className="overflow-visible">
                        <defs>
                            <linearGradient id="indigoEmpGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                            </linearGradient>
                            <linearGradient id="emeraldEmpGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                            </linearGradient>
                            <linearGradient id="amberEmpGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
                            </linearGradient>
                        </defs>

                        {/* Y-Axis Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                            const y = activeHeight - paddingBottom - ratio * chartHeight;
                            const val = Math.round(ratio * maxVal);
                            return (
                                <g key={idx} className="opacity-40">
                                    <line x1={paddingLeft} y1={y} x2={activeWidth - paddingRight} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                                    <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-mono">{val}</text>
                                </g>
                            );
                        })}

                        {/* Render lines and gradients for each employee */}
                        {trendPoints.map((points, empIdx) => {
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
                            const colors = employeeColors[empIdx];

                            return (
                                <g key={empIdx}>
                                    {/* Spline Area Fill */}
                                    {areaPath && (
                                        <path d={areaPath} fill={colors.area} className="transition-all duration-500 ease-out" />
                                    )}
                                    
                                    {/* Spline Stroke Line */}
                                    {linePath && (
                                        <path d={linePath} fill="none" stroke={colors.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-500 ease-out" />
                                    )}

                                    {/* Coordinates trigger nodes */}
                                    {points.map((p, i) => {
                                        const isDayHovered = hoveredDayIndex === i;
                                        return (
                                            <g key={i}>
                                                {/* Hidden large capture circle for smooth hover experience */}
                                                <circle 
                                                    cx={p.x} 
                                                    cy={p.y} 
                                                    r="12" 
                                                    fill="transparent" 
                                                    className="cursor-pointer" 
                                                    onMouseEnter={() => setHoveredDayIndex(i)} 
                                                    onMouseLeave={() => setHoveredDayIndex(null)} 
                                                />
                                                <circle 
                                                    cx={p.x} 
                                                    cy={p.y} 
                                                    r={isDayHovered ? "5" : "3"} 
                                                    fill="#ffffff" 
                                                    stroke={colors.stroke} 
                                                    strokeWidth={isDayHovered ? "3.5" : "2"} 
                                                    className="pointer-events-none transition-all duration-150" 
                                                />
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}

                        {/* X-Axis Day Labels */}
                        {trendPoints[0]?.map((p, i) => (
                            <text 
                                key={i} 
                                x={p.x} 
                                y={activeHeight - 8} 
                                textAnchor="middle" 
                                className={`text-[10px] font-bold transition-all ${hoveredDayIndex === i ? "fill-slate-700 font-extrabold" : "fill-slate-400"}`}
                            >
                                {p.label}
                            </text>
                        ))}
                    </svg>
                )}

                {/* Multiline Hover Tooltip showing top-performing staff stats */}
                {hoveredDayIndex !== null && width > 0 && (
                    <div 
                        className="absolute bg-slate-950/95 text-white px-3 py-2.5 rounded-xl text-xs font-semibold shadow-xl pointer-events-none transition-all duration-150 border border-slate-800 animate-[fadeIn_0.12s_ease-out] w-56 flex flex-col gap-2 z-20"
                        style={{
                            left: `${(trendPoints[0][hoveredDayIndex].x / activeWidth) * 100}%`,
                            top: `10%`,
                            transform: "translateX(-50%)",
                        }}
                    >
                        <div className="border-b border-slate-800 pb-1 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            <span>Performance Report</span>
                            <span>{labels[hoveredDayIndex]}</span>
                        </div>
                        <div className="space-y-1.5">
                            {employeeTrends.map((trend, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-2 h-2 rounded-full ${employeeColors[idx].bg}`} />
                                        <span className="truncate text-slate-200">{trend.employee.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-100">{trend.counts[hoveredDayIndex]} tasks</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Interactive Legends */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100/70 shrink-0">
                {employeeTrends.map((trend, idx) => {
                    const colors = employeeColors[idx];
                    const initials = trend.employee.name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "U";
                    return (
                        <div key={idx} className="flex flex-col items-center p-2 rounded-xl border border-slate-100 bg-slate-50/35 hover:bg-slate-50 transition-all duration-150">
                            <div className="flex items-center gap-1.5 min-w-0 w-full justify-center">
                                <div className="w-5.5 h-5.5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] font-bold text-slate-600 shrink-0 overflow-hidden hidden sm:flex">
                                    {trend.employee.profilePic ? (
                                        <img src={trend.employee.profilePic} alt="" className="w-full h-full object-cover" />
                                    ) : initials}
                                </div>
                                <span className={`text-[10px] font-bold text-slate-700 truncate ${colors.text}`}>{trend.employee.name?.split(" ")[0]}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">{trend.total} completed</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Custom Chart 6: Department Productivity Analytics ───────────────────────────
const DepartmentProductivityGraph = ({ allTasks, users, projects, departments, selectedDept = "All" }) => {
    let depts = departments && departments.length > 0 ? departments.map(d => d.name) : ["Engineering", "Sales", "Marketing", "HR", "QA"];
    if (selectedDept !== "All") {
        depts = depts.filter(d => d.toLowerCase() === selectedDept.toLowerCase());
    }
    
    const getDeptTheme = (deptName) => {
        const predefined = {
            "Engineering": { bar: "bg-blue-500", text: "text-blue-600", dot: "bg-blue-500", track: "bg-blue-50" },
            "Sales": { bar: "bg-violet-500", text: "text-violet-600", dot: "bg-violet-500", track: "bg-violet-50" },
            "Marketing": { bar: "bg-emerald-500", text: "text-emerald-600", dot: "bg-emerald-500", track: "bg-emerald-50" },
            "HR": { bar: "bg-amber-500", text: "text-amber-600", dot: "bg-amber-500", track: "bg-amber-50" },
            "QA": { bar: "bg-rose-500", text: "text-rose-600", dot: "bg-rose-500", track: "bg-rose-50" }
        };
        
        if (predefined[deptName]) return predefined[deptName];
        
        // Stable dynamic theme fallbacks for custom department names
        const fallbacks = [
            { bar: "bg-indigo-500", text: "text-indigo-600", dot: "bg-indigo-500", track: "bg-indigo-50" },
            { bar: "bg-cyan-500", text: "text-cyan-600", dot: "bg-cyan-500", track: "bg-cyan-50" },
            { bar: "bg-teal-500", text: "text-teal-600", dot: "bg-teal-500", track: "bg-teal-50" },
            { bar: "bg-fuchsia-500", text: "text-fuchsia-600", dot: "bg-fuchsia-500", track: "bg-fuchsia-50" },
            { bar: "bg-sky-500", text: "text-sky-600", dot: "bg-sky-500", track: "bg-sky-50" }
        ];
        
        let hash = 0;
        const str = String(deptName);
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const idx = Math.abs(hash) % fallbacks.length;
        return fallbacks[idx];
    };

    // Calculate dynamic stats from actual CRM database records
    const stats = depts.map((dept) => {
        // Filter users belonging to this department
        const deptUsers = users.filter(u => (u.department || "Engineering").toLowerCase() === dept.toLowerCase());
        const userIds = deptUsers.map(u => u._id);
        
        // Filter tasks assigned to department members
        const deptTasks = allTasks.filter(t => {
            const uid = t.assignedTo?._id || t.assignedTo;
            return userIds.includes(uid);
        });

        const completedCount = deptTasks.filter(t => ["Completed", "Done"].includes(t.status)).length;
        const activeWorkload = deptTasks.filter(t => !["Completed", "Done"].includes(t.status)).length;
        
        // Projects in which department members are actively involved
        const deptProjects = projects.filter(proj => {
            const leadId = proj.teamLead?._id || proj.teamLead;
            const isLeadInDept = deptUsers.some(u => u._id === leadId);
            
            const hasMembersInDept = proj.teamMembers?.some(m => {
                const mid = m._id || m;
                return userIds.includes(mid);
            });
            return isLeadInDept || hasMembersInDept;
        }).length;

        return {
            name: dept,
            completed: completedCount,
            workload: activeWorkload,
            projects: deptProjects
        };
    });

    if (stats.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2 border border-slate-100">
                    <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-600">No Department Data</span>
                <span className="text-[10px] text-slate-400 mt-1">There are no departments found in the system.</span>
            </div>
        );
    }

    // Determine the max completed tasks value for horizontal scale ratio representation
    const maxCompleted = Math.max(...stats.map(s => s.completed), 10);

    return (
        <div className="w-full h-full flex flex-col justify-between py-1 select-none">
            <div className="space-y-5.5 flex-1 flex flex-col justify-around animate-fade-in">
                {stats.map((s) => {
                    const theme = getDeptTheme(s.name);
                    const percent = Math.min(100, Math.round((s.completed / maxCompleted) * 100));
                    
                    return (
                        <div key={s.name} className="group flex items-center justify-between gap-4">
                            {/* Department Name Tag */}
                            <div className="w-24 sm:w-28 shrink-0 flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dot} shadow-sm`} />
                                <span className="text-xs font-bold text-slate-700 tracking-tight truncate">{s.name}</span>
                            </div>

                            {/* Horizontal Progress Bar */}
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                                <div 
                                    className={`h-full ${theme.bar} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>

                            {/* Department Specific Stats & Workloads */}
                            <div className="w-40 sm:w-52 text-right shrink-0 flex items-center justify-end gap-2.5 font-mono text-[10px] font-bold text-slate-500">
                                <span className={`${theme.text}`}>{s.completed} completed</span>
                                <span className="text-slate-300 font-normal">•</span>
                                <span className="text-slate-600">{s.workload} active</span>
                                <span className="text-slate-300 font-normal">•</span>
                                <span className="text-slate-400">{s.projects} {s.projects === 1 ? 'proj' : 'projs'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* General Department metrics header footer for premium presentation */}
            <div className="mt-4 pt-3 border-t border-slate-100/70 flex justify-between text-[9px] uppercase tracking-wider font-extrabold text-slate-400 shrink-0">
                <span>Operational Unit</span>
                <span>Production Metrics Matrix</span>
            </div>
        </div>
    );
};

// ─── Main Admin Dashboard Component ─────────────────────────────────────────────
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [recentTasks, setRecentTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [taskCompletionDept, setTaskCompletionDept] = useState("All");
    const [weeklyProductivityDept, setWeeklyProductivityDept] = useState("All");
    const [taskDistributionDept, setTaskDistributionDept] = useState("All");
    const [employeePerformanceDept, setEmployeePerformanceDept] = useState("All");
    const [deptProductivityDept, setDeptProductivityDept] = useState("All");

    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });
    
    const [newProject, setNewProject] = useState({
        projectName: "",
        description: "",
        teamLead: "",
        startDate: "",
        endDate: "",
        teamMembers: [],
        attachment: null
    });
    const [isCreating, setIsCreating] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dashRes, projRes, userRes, taskRes, notifRes, deptRes] = await Promise.all([
                dashboardService.getAdminDashboard(),
                projectService.getAllProjects(),
                userService.getAllUsers(),
                taskService.getAllTasks(),
                notificationService.getMyNotifications(),
                departmentService.getAllDepartments()
            ]);
            
            setDashboardData(dashRes.data.data);
            setProjects(projRes.data.projects || []);
            
            if (deptRes.data?.success) {
                setDepartments(deptRes.data.departments || []);
            }
            
            const allUsers = userRes.data.data || [];
            const allTasks = taskRes.data.tasks || [];
            
            const usersWithWorkload = allUsers.map(u => {
                const activeTasks = allTasks.filter(t => 
                    (t.assignedTo?._id === u._id || t.assignedTo === u._id) && 
                    !["Completed", "Done"].includes(t.status)
                );
                return { ...u, activeTaskCount: activeTasks.length };
            });
            
            setUsers(usersWithWorkload);
            setAllTasks(allTasks);
            
            const notifications = notifRes.data.notifications || [];
            setRecentTasks(notifications);
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
            ["Total Employees", users.length],
            ["Total Projects", projects.length],
            ["Total Tasks", allTasks.length],
            ["Tasks in QA Review", allTasks.filter(t => t.status === "QA Review").length],
            ["Overdue Tasks", allTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && !["Completed", "Done"].includes(t.status)).length]
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
            const formData = new FormData();
            formData.append("projectName", newProject.projectName);
            formData.append("description", newProject.description);
            formData.append("teamLead", newProject.teamLead);
            formData.append("startDate", newProject.startDate);
            formData.append("endDate", newProject.endDate);
            formData.append("teamMembers", JSON.stringify(newProject.teamMembers));
            if (newProject.attachment) {
                formData.append("attachment", newProject.attachment);
            }

            await projectService.createProject(formData);
            toast.success("Project created successfully");
            setIsProjectModalOpen(false);
            setNewProject({
                projectName: "",
                description: "",
                teamLead: "",
                startDate: "",
                endDate: "",
                teamMembers: [],
                attachment: null
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
    const teamMembersList = users.filter(u => {
        if (!newProject.teamLead) return false;
        if (u.role !== 'developer' && u.role !== 'qa') return false;
        return u.teamLeads?.some(tl => 
            (typeof tl === 'object' ? tl._id === newProject.teamLead : tl === newProject.teamLead)
        );
    });

    // Filtered data for Task Completion Card
    const filteredTasksForCompletion = useMemo(() => {
        if (taskCompletionDept === "All") return allTasks;
        return allTasks.filter(t => {
            const uid = t.assignedTo?._id || t.assignedTo;
            const user = users.find(u => u._id === uid);
            return user && (user.department || "Engineering").toLowerCase() === taskCompletionDept.toLowerCase();
        });
    }, [allTasks, users, taskCompletionDept]);

    // Filtered data for Weekly Productivity Card
    const filteredTasksForWeekly = useMemo(() => {
        if (weeklyProductivityDept === "All") return allTasks;
        return allTasks.filter(t => {
            const uid = t.assignedTo?._id || t.assignedTo;
            const user = users.find(u => u._id === uid);
            return user && (user.department || "Engineering").toLowerCase() === weeklyProductivityDept.toLowerCase();
        });
    }, [allTasks, users, weeklyProductivityDept]);

    // Filtered data for Task Distribution Card (Donut)
    const filteredTasksForDistribution = useMemo(() => {
        if (taskDistributionDept === "All") return allTasks;
        return allTasks.filter(t => {
            const uid = t.assignedTo?._id || t.assignedTo;
            const user = users.find(u => u._id === uid);
            return user && (user.department || "Engineering").toLowerCase() === taskDistributionDept.toLowerCase();
        });
    }, [allTasks, users, taskDistributionDept]);

    // Filtered data for Employee Performance Card
    const filteredUsersForPerformance = useMemo(() => {
        if (employeePerformanceDept === "All") return users;
        return users.filter(u => (u.department || "Engineering").toLowerCase() === employeePerformanceDept.toLowerCase());
    }, [users, employeePerformanceDept]);

    const filteredTasksForPerformance = useMemo(() => {
        if (employeePerformanceDept === "All") return allTasks;
        return allTasks.filter(t => {
            const uid = t.assignedTo?._id || t.assignedTo;
            const user = users.find(u => u._id === uid);
            return user && (user.department || "Engineering").toLowerCase() === employeePerformanceDept.toLowerCase();
        });
    }, [allTasks, users, employeePerformanceDept]);

    const completedTasks = allTasks.filter(t => ["Completed", "Done"].includes(t.status));
    const pendingTasks = allTasks.filter(t => ["New", "Pending", "Todo", "To Do"].includes(t.status) || !t.status);
    const inProgressTasks = allTasks.filter(t => ["In Progress", "Active"].includes(t.status));
    const qaReviewTasks = allTasks.filter(t => t.status === "QA Review");
    const overdueTasks = allTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && !["Completed", "Done"].includes(t.status));

    const kpis = dashboardData ? [
        { label: "Total Tasks", value: allTasks.length, icon: ListTodo, color: "text-indigo-600", bg: "bg-indigo-50", border: "indigo", onClick: () => setStatModal({ isOpen: true, title: "Total Tasks", data: allTasks, type: "task" }) },
        { label: "Completed", value: completedTasks.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "emerald", onClick: () => setStatModal({ isOpen: true, title: "Completed Tasks", data: completedTasks, type: "task" }) },
        { label: "In Progress", value: inProgressTasks.length, icon: Play, color: "text-sky-600", bg: "bg-sky-50", border: "sky", onClick: () => setStatModal({ isOpen: true, title: "In Progress Tasks", data: inProgressTasks, type: "task" }) },
        { label: "QA Review", value: qaReviewTasks.length, icon: ShieldAlert, color: "text-violet-600", bg: "bg-violet-50", border: "violet", onClick: () => setStatModal({ isOpen: true, title: "Tasks in QA Review", data: qaReviewTasks, type: "task" }) },
        { label: "Pending", value: pendingTasks.length, icon: Clock, color: "text-slate-600", bg: "bg-slate-50", border: "slate", onClick: () => setStatModal({ isOpen: true, title: "Pending Tasks", data: pendingTasks, type: "task" }) },
        { label: "Overdue", value: overdueTasks.length, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", border: "rose", onClick: () => setStatModal({ isOpen: true, title: "Overdue Tasks", data: overdueTasks, type: "task" }) },
        { label: "Total Projects", value: projects.length, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50", border: "blue", onClick: () => setStatModal({ isOpen: true, title: "Total Projects", data: projects, type: "project" }) },
        { label: "Total Employees", value: users.length, icon: Users, color: "text-amber-600", bg: "bg-amber-50", border: "amber", onClick: () => setStatModal({ isOpen: true, title: "Total Employees", data: users, type: "employee" }) }
    ] : [];

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Dashboard" />
                <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4 shrink-0">
                        <div>
                            <h1 className="dashboard-heading">System Overview</h1>
                            <p className="dashboard-subheading">Here's what's happening across your CRM today.</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleExportDashboard}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all-300 shadow-sm flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export Report
                            </button>
                            <button onClick={() => setIsProjectModalOpen(true)} className="px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition-all-300 shadow-sm shadow-blue-200/50 flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                New Project
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium shrink-0">
                            {error}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* KPIs Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-4 sm:gap-5">
                                {kpis.map((kpi, i) => (
                                    <div key={i} onClick={kpi.onClick} className={`premium-stat-card ${kpi.border} flex flex-col sm:flex-row sm:items-center items-start gap-3 sm:gap-4 p-4 sm:p-5 h-[115px] sm:h-[90px] w-full justify-start cursor-pointer`}>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                                            <kpi.icon className="w-4.5 h-4.5" />
                                        </div>
                                        <div className="flex flex-col justify-center min-w-0 w-full">
                                            <h4 className="text-2xl font-extrabold tracking-tight text-slate-800 leading-none mb-1">{kpi.value}</h4>
                                            <p className="text-[10px] font-semibold text-slate-400 truncate">{kpi.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Analytics Graphs Row (3 Columns) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                <Card className="p-6 flex flex-col h-[420px]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                                        <div>
                                            <h3 className="section-title flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                                Task Completion
                                            </h3>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">Last 7 days trend</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span>Completed Trend</span>
                                            </div>
                                            <div className="relative shrink-0">
                                                <select
                                                    value={taskCompletionDept}
                                                    onChange={(e) => setTaskCompletionDept(e.target.value)}
                                                    className="pl-3 pr-7 py-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 text-slate-500 font-extrabold text-[10px] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 cursor-pointer appearance-none shadow-sm select-none"
                                                >
                                                    <option value="All">All Departments</option>
                                                    {departments.map(dept => (
                                                        <option key={dept._id} value={dept.name}>{dept.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <TaskCompletionGraph allTasks={filteredTasksForCompletion} />
                                    </div>
                                </Card>
                                
                                <Card className="p-6 flex flex-col h-[420px]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                                        <div>
                                            <h3 className="section-title flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-blue-500" />
                                                Weekly Productivity
                                            </h3>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">Tasks created vs completed</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-3 text-[10px] font-bold">
                                                <div className="flex items-center gap-1 text-slate-500">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                    <span>Created</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-500">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span>Completed</span>
                                                </div>
                                            </div>
                                            <div className="relative shrink-0">
                                                <select
                                                    value={weeklyProductivityDept}
                                                    onChange={(e) => setWeeklyProductivityDept(e.target.value)}
                                                    className="pl-3 pr-7 py-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 text-slate-500 font-extrabold text-[10px] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 cursor-pointer appearance-none shadow-sm select-none"
                                                >
                                                    <option value="All">All Departments</option>
                                                    {departments.map(dept => (
                                                        <option key={dept._id} value={dept.name}>{dept.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <WeeklyProductivityGraph allTasks={filteredTasksForWeekly} />
                                    </div>
                                </Card>

                                <Card className="p-6 flex flex-col h-[420px] lg:col-span-2 xl:col-span-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                                        <div>
                                            <h3 className="section-title flex items-center gap-2">
                                                <Activity className="w-4.5 h-4.5 text-violet-500" />
                                                Task Distribution
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5 font-medium">Current workload distribution split by statuses</p>
                                        </div>
                                        <div className="relative shrink-0">
                                            <select
                                                value={taskDistributionDept}
                                                onChange={(e) => setTaskDistributionDept(e.target.value)}
                                                className="pl-3 pr-7 py-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 text-slate-500 font-extrabold text-[10px] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 cursor-pointer appearance-none shadow-sm select-none"
                                            >
                                                <option value="All">All Departments</option>
                                                {departments.map(dept => (
                                                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <TaskStatusDonut allTasks={filteredTasksForDistribution} />
                                    </div>
                                </Card>
                            </div>

                            {/* Premium Analytics Row (2 Columns) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="p-6 flex flex-col h-[450px]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                                        <div>
                                            <h3 className="section-title flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                                                Employee Performance
                                            </h3>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">Individual task completion trends for top performers</p>
                                        </div>
                                        <div className="relative shrink-0">
                                            <select
                                                value={employeePerformanceDept}
                                                onChange={(e) => setEmployeePerformanceDept(e.target.value)}
                                                className="pl-3 pr-7 py-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 text-slate-500 font-extrabold text-[10px] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 cursor-pointer appearance-none shadow-sm select-none"
                                            >
                                                <option value="All">All Departments</option>
                                                {departments.map(dept => (
                                                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <EmployeePerformanceGraph allTasks={filteredTasksForPerformance} users={filteredUsersForPerformance} selectedDept={employeePerformanceDept} />
                                    </div>
                                </Card>

                                <Card className="p-6 flex flex-col h-[450px]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                                        <div>
                                            <h3 className="section-title flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-emerald-500" />
                                                Department Productivity
                                            </h3>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">Workload and output metrics grouped by department</p>
                                        </div>
                                        <div className="relative shrink-0">
                                            <select
                                                value={deptProductivityDept}
                                                onChange={(e) => setDeptProductivityDept(e.target.value)}
                                                className="pl-3 pr-7 py-1 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 text-slate-500 font-extrabold text-[10px] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 cursor-pointer appearance-none shadow-sm select-none"
                                            >
                                                <option value="All">All Departments</option>
                                                {departments.map(dept => (
                                                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <DepartmentProductivityGraph allTasks={allTasks} users={users} projects={projects} departments={departments} selectedDept={deptProductivityDept} />
                                    </div>
                                </Card>
                            </div>

                            {/* Operations & Activity Row (3 Columns) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                
                                {/* Active Projects Leaderboard */}
                                <Card className="!p-0 flex flex-col h-[450px]">
                                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                                        <div>
                                            <h3 className="section-title flex items-center gap-2">
                                                <Briefcase className="w-4.5 h-4.5 text-indigo-500" />
                                                Active Projects Leaderboard
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5 font-medium">Mathematical completion metrics based on tasks</p>
                                        </div>
                                        <button 
                                            onClick={() => navigate("/admin/projects")}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition shrink-0"
                                        >
                                            View Projects
                                        </button>
                                    </div>
                                    <div className="p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                                        {projects.slice(0, 5).map((proj, i) => {
                                            const projTasks = allTasks.filter(t => {
                                                const pid = t.project?._id || t.project;
                                                return pid === proj._id;
                                            });
                                            const totalCount = projTasks.length;
                                            const completedCount = projTasks.filter(t => ["Completed", "Done"].includes(t.status)).length;
                                            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (proj.status === "Completed" ? 100 : 0);
                                            const color = progress === 100 ? "bg-emerald-500" : progress > 50 ? "bg-blue-500" : "bg-indigo-500";
                                            
                                            return (
                                                <div key={proj._id || i} className="group hover:bg-slate-50/40 p-3 rounded-xl transition border border-transparent hover:border-slate-100">
                                                    <div className="flex justify-between items-center text-sm mb-2.5">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="font-extrabold text-slate-800 tracking-tight text-sm group-hover:text-blue-600 transition duration-150 truncate">
                                                                {proj.projectName}
                                                            </span>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                                                proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                            }`}>
                                                                {proj.status || 'Active'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500 shrink-0">
                                                            <span>{completedCount}/{totalCount} tasks</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-slate-700">{progress}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {projects.length === 0 && <div className="text-slate-400 text-sm font-medium text-center py-10">No active projects</div>}
                                    </div>
                                </Card>

                                {/* Team Performance Workload Grid */}
                                <Card className="!p-0 flex flex-col h-[450px]">
                                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                                        <div>
                                            <h3 className="section-title flex items-center gap-2">
                                                <Users className="w-4.5 h-4.5 text-blue-500" />
                                                Team Workloads & Productivity
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5 font-medium">Workloads, active tasks, and performance</p>
                                        </div>
                                        <button 
                                            onClick={() => navigate("/admin/employees")}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition shrink-0"
                                        >
                                            Manage Team
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                                        {users.filter(u => u.role !== "admin").slice(0, 6).map((member, i) => {
                                            const memberTasks = allTasks.filter(t => {
                                                const uid = t.assignedTo?._id || t.assignedTo;
                                                return uid === member._id;
                                            });
                                            
                                            const activeCount = memberTasks.filter(t => !["Completed", "Done"].includes(t.status)).length;
                                            const completedCount = memberTasks.filter(t => ["Completed", "Done"].includes(t.status)).length;
                                            const totalAssigned = memberTasks.length;
                                            const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
                                            
                                            const statusText = activeCount > 3 ? `Busy - ${activeCount} active` : activeCount > 0 ? `${activeCount} active` : "Available";
                                            const statusColor = activeCount > 3 ? "bg-rose-500" : activeCount > 0 ? "bg-amber-500" : "bg-emerald-500";
                                            
                                            return (
                                                <div key={member._id || i} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="relative shrink-0">
                                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-700 border border-blue-100 uppercase overflow-hidden shadow-sm">
                                                                {member.profilePic ? (
                                                                    <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    member.name?.charAt(0) || "U"
                                                                )}
                                                            </div>
                                                            <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${statusColor}`}></span>
                                                        </div>
                                                        <div className="min-w-0 flex-1 pr-4">
                                                            <h4 className="text-sm font-bold text-slate-800 truncate">{member.name}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap font-medium">
                                                                <span className="font-bold text-slate-400 capitalize">{member.role}</span>
                                                                <span>•</span>
                                                                <span className="text-slate-400 capitalize">{member.department || "Engineering"}</span>
                                                                <span>•</span>
                                                                <span className={`font-bold ${activeCount > 3 ? 'text-rose-500' : activeCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                    {statusText}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <span className="block text-[9px] font-semibold text-slate-400">Completion</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }}></div>
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-700 font-mono">{completionRate}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {users.length === 0 && <div className="text-slate-400 text-sm font-medium text-center py-10">No team members found</div>}
                                    </div>
                                </Card>

                                {/* Real-Time Activity Feed */}
                                <Card className="!p-0 flex flex-col h-[450px] lg:col-span-2 xl:col-span-1">
                                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                                        <div>
                                            <h3 className="section-title flex items-center gap-2">
                                                <Clock className="w-4.5 h-4.5 text-emerald-500" />
                                                Real-Time Activity Feed
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5 font-medium">Live actions across all clients and tasks</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[10px] font-bold text-slate-400">Live</span>
                                            <span className="relative flex h-2.5 w-2.5">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-6 pt-5 custom-scrollbar max-h-[330px]">
                                        {recentTasks.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center py-10 opacity-60">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                    <Clock className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-500 text-center">No recent activity found</p>
                                            </div>
                                        ) : (
                                            recentTasks.map((item, i) => (
                                                <div key={item._id || i} className="flex gap-4 text-sm relative">
                                                    {i !== recentTasks.length - 1 && <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-slate-100 font-bold"></div>}
                                                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-[10px] z-10 ring-4 ring-white bg-blue-50 text-blue-600 border border-blue-100 uppercase overflow-hidden">
                                                        {item.sender?.profilePic ? (
                                                            <img src={item.sender.profilePic} alt={item.sender.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            item.sender?.name?.charAt(0) || "S"
                                                        )}
                                                    </div>
                                                    <div className="pt-0.5 flex-1 min-w-0">
                                                        <p className="text-slate-600 leading-snug break-words">
                                                            <span className="font-bold text-slate-800">{item.title}</span>: {item.message}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{formatTimeAgo(item.createdAt)}</span>
                                                            <span className="text-slate-200 text-xs">•</span>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                                                item.category === 'status_change' ? 'bg-indigo-50 text-indigo-600' :
                                                                item.category === 'creation' ? 'bg-emerald-50 text-emerald-600' :
                                                                item.category === 'update' ? 'bg-blue-50 text-blue-600' :
                                                                item.category === 'deletion' ? 'bg-rose-50 text-rose-600' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {(item.category || "System").replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Create Project Modal */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/50 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                                <div className="text-blue-600 relative flex items-center justify-center">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                Create New Project
                            </h2>
                            <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <Clock className="w-5 h-5 transform rotate-45" />
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
                                            <Clock className="w-4 h-4 transform rotate-90" />
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
                                        {teamMembersList.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-xs italic">
                                                {newProject.teamLead ? "No members assigned to this TL" : "Select a Team Lead first"}
                                            </div>
                                        ) : teamMembersList.map((user) => (
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
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Attachment (Optional)</label>
                                    <input 
                                        type="file" 
                                        onChange={(e) => setNewProject({...newProject, attachment: e.target.files[0]})}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-medium text-slate-700 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-5 flex items-center gap-4 shrink-0 border-t border-slate-100/50">
                                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 justify-center px-6 py-2.5 text-slate-800 font-bold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm">
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 justify-center flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {isCreating ? "Creating..." : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <StatDetailModal 
                isOpen={statModal.isOpen} 
                onClose={() => setStatModal({ ...statModal, isOpen: false })} 
                title={statModal.title} 
                data={statModal.data} 
                type={statModal.type} 
            />
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />
        </div>
    );
};

export default AdminDashboard;