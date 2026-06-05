import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { userService, taskService, projectService, leaveService, departmentService } from "../../api/services";
import { exportPDF, exportOverallReport } from "../../utils/pdfExport";
import { 
    Download, ChevronLeft, ChevronRight, FolderOpen, AlertCircle,
    Users, UserCheck, UserX, CheckCircle2, Clock, Calendar, BarChart3, Activity, Briefcase, Target
} from "lucide-react";
import StatDetailModal from "../../components/StatDetailModal";
import { useAuth } from "../../context/AuthContext";

const getUserDesignation = (emp) => {
    if (!emp) return "Employee";
    const rawDesignation = emp.designation || "";
    const rawRole = emp.role || "";
    
    if (rawDesignation) {
        const lower = rawDesignation.trim().toLowerCase();
        if (lower === "employee") return "Employee";
        if (lower === "admin") return "Admin";
        if (lower === "qa") return "QA";
        if (lower === "tl") return "Team Lead";
        return rawDesignation;
    }
    
    const roleLower = rawRole.trim().toLowerCase();
    if (roleLower === "tl" || roleLower === "teamlead") return "Team Lead";
    if (roleLower === "qa") return "QA";
    if (roleLower === "admin") return "Admin";
    if (roleLower === "developer") return "Developer";
    if (roleLower === "employee") return "Employee";
    
    return "Employee";
};

const ReportsDashboard = ({ focus }) => {
    const { user } = useAuth();
    const activeFocus = focus || (user?.role === 'hr' ? 'hr' : 'project');
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState("All");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("All");
    const [activeCardFilter, setActiveCardFilter] = useState("all");
    const [performanceSidebarUser, setPerformanceSidebarUser] = useState(null);
    const [isPerformanceSidebarOpen, setIsPerformanceSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const [taskRes, userRes, projRes, leaveRes, deptRes] = await Promise.all([
                    taskService.getAllTasks(),
                    userService.getAllUsers(),
                    projectService.getAllProjects(),
                    leaveService.getLeaves().catch(() => ({ data: { data: [] } })),
                    departmentService.getAllDepartments().catch(() => ({ data: { departments: [] } }))
                ]);
                setTasks(taskRes.data.tasks || []);
                setUsers(userRes.data.data || []);
                setLeaves(leaveRes.data?.data || []);
                setDepartments(deptRes.data?.departments || []);
                
                const allProjects = projRes.data.projects || [];
                let scopedProjects = [];
                if (user?.role === "admin" || user?.role === "hr") {
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

    // HR Employee Performance & Productivity Calculations
    const dropdownEmployeesList = users.filter(u => {
        if (u.role === "admin") return false;
        if (selectedDept === "All") return true;
        return (u.department || "Engineering").toLowerCase() === selectedDept.toLowerCase();
    });

    const hrEmployees = users.filter(u => {
        if (u.role === "admin") return false;
        if (selectedDept === "All") return true;
        return (u.department || "Engineering").toLowerCase() === selectedDept.toLowerCase();
    });

    const employeePerformanceData = hrEmployees.map(emp => {
        const isQA = emp.role === 'qa' || emp.role === 'QA' || (emp.designation && emp.designation.toLowerCase().includes('qa'));
        // Filter tasks for this employee within date range
        const empTasks = tasks.filter(t => {
            const isAssigned = isQA 
                ? (t.assignedQA?._id || t.assignedQA) === emp._id
                : (t.assignedTo?._id || t.assignedTo) === emp._id;
            if (!isAssigned) return false;
            
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

        const assignedCount = empTasks.length;
        const completedTasks = empTasks.filter(t => {
            if (isQA) {
                if (["Completed", "Done"].includes(t.status)) return true;
                const history = t.statusHistory || [];
                let hasBeenInQA = false;
                for (const h of history) {
                    if (h.status === 'QA Review') hasBeenInQA = true;
                    else if (h.status === 'In Progress' && hasBeenInQA) return true;
                }
                return false;
            }
            return t.status === "Completed" || t.status === "Done";
        });
        const completedCount = completedTasks.length;
        
        const overdueTasks = empTasks.filter(t => {
            const isDone = isQA
                ? (["Completed", "Done"].includes(t.status) || (() => {
                    const history = t.statusHistory || [];
                    let hasBeenInQA = false;
                    for (const h of history) {
                        if (h.status === 'QA Review') hasBeenInQA = true;
                        else if (h.status === 'In Progress' && hasBeenInQA) return true;
                    }
                    return false;
                })())
                : (t.status === "Completed" || t.status === "Done");
            if (isDone) return false;
            if (!t.endDate) return false;
            return new Date(t.endDate) < new Date();
        });
        const overdueCount = overdueTasks.length;
        const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

        // Completion times
        let totalDaysForTasks = 0;
        completedTasks.forEach(t => {
            const start = t.createdAt ? new Date(t.createdAt) : new Date();
            const end = t.updatedAt ? new Date(t.updatedAt) : new Date();
            const diffMs = Math.abs(end - start);
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;
            totalDaysForTasks += diffDays;
        });
        const avgCompletionTime = completedCount > 0 ? (totalDaysForTasks / completedCount).toFixed(1) : "0.0";

        // Leaves taken for this employee in date range
        const empLeaves = leaves.filter(l => {
            const isEmp = (l.employee?._id || l.employee) === emp._id;
            if (!isEmp) return false;
            if (l.status !== "Approved") return false;
            
            const leaveStart = new Date(l.startDate);
            const leaveEnd = new Date(l.endDate);
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(toDate) : null;
            if (from) {
                from.setHours(0, 0, 0, 0);
                if (leaveEnd < from) return false;
            }
            if (to) {
                to.setHours(23, 59, 59, 999);
                if (leaveStart > to) return false;
            }
            return true;
        });
        const leavesTakenDays = empLeaves.reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);

        // Behavior Metrics
        let beforeDeadline = 0;
        let onDeadline = 0;
        let afterDeadline = 0;
        completedTasks.forEach(t => {
            if (!t.endDate) {
                beforeDeadline++;
                return;
            }
            const due = new Date(t.endDate);
            due.setHours(0,0,0,0);
            
            const finished = new Date(t.updatedAt);
            finished.setHours(0,0,0,0);
            
            if (finished < due) {
                beforeDeadline++;
            } else if (finished.getTime() === due.getTime()) {
                onDeadline++;
            } else {
                afterDeadline++;
            }
        });

        const leavesBreakdown = {
            casual: empLeaves.filter(l => l.leaveType === "Casual Leave").reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0),
            sick: empLeaves.filter(l => l.leaveType === "Sick Leave").reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0),
            earned: empLeaves.filter(l => l.leaveType === "Earned Leave").reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0),
            unpaid: empLeaves.filter(l => l.leaveType === "Unpaid Leave").reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0),
        };

        return {
            employee: emp,
            assignedCount,
            completedCount,
            overdueCount,
            completionRate,
            avgCompletionTime,
            leavesTakenDays,
            beforeDeadline,
            onDeadline,
            afterDeadline,
            leavesBreakdown,
            status: emp.status || "Active"
        };
    });

    const activePerformanceList = employeePerformanceData.filter(item => {
        if (selectedEmployeeId !== "All" && item.employee._id !== selectedEmployeeId) {
            return false;
        }
        return true;
    });

    const tableFilteredPerformanceList = activePerformanceList.filter(item => {
        if (activeCardFilter === "assigned") return item.assignedCount > 0;
        if (activeCardFilter === "completed") return item.completedCount > 0;
        if (activeCardFilter === "overdue") return item.overdueCount > 0;
        if (activeCardFilter === "rate") return item.completionRate < 80;
        if (activeCardFilter === "leaves") return item.leavesTakenDays > 0;
        return true;
    });

    // Aggregates
    const totalAssignedTasksAgg = activePerformanceList.reduce((sum, item) => sum + item.assignedCount, 0);
    const totalCompletedTasksAgg = activePerformanceList.reduce((sum, item) => sum + item.completedCount, 0);
    const totalOverdueTasksAgg = activePerformanceList.reduce((sum, item) => sum + item.overdueCount, 0);
    
    const avgCompletionRateAgg = activePerformanceList.length > 0 
        ? Math.round(activePerformanceList.reduce((sum, item) => sum + item.completionRate, 0) / activePerformanceList.length) 
        : 0;

    const completedTasksWithTimes = activePerformanceList.filter(item => Number(item.avgCompletionTime) > 0);
    const avgCompletionTimeAgg = completedTasksWithTimes.length > 0
        ? (completedTasksWithTimes.reduce((sum, item) => sum + Number(item.avgCompletionTime), 0) / completedTasksWithTimes.length).toFixed(1)
        : "0.0";

    const totalLeaveDaysAgg = activePerformanceList.reduce((sum, item) => sum + item.leavesTakenDays, 0);

    const totalBeforeDeadlineAgg = activePerformanceList.reduce((sum, item) => sum + item.beforeDeadline, 0);
    const totalOnDeadlineAgg = activePerformanceList.reduce((sum, item) => sum + item.onDeadline, 0);
    const totalAfterDeadlineAgg = activePerformanceList.reduce((sum, item) => sum + item.afterDeadline, 0);
    const totalTasksCompletedAgg = totalBeforeDeadlineAgg + totalOnDeadlineAgg + totalAfterDeadlineAgg;

    const beforeDeadlinePct = totalTasksCompletedAgg > 0 ? Math.round((totalBeforeDeadlineAgg / totalTasksCompletedAgg) * 100) : 0;
    const onDeadlinePct = totalTasksCompletedAgg > 0 ? Math.round((totalOnDeadlineAgg / totalTasksCompletedAgg) * 100) : 0;
    const afterDeadlinePct = totalTasksCompletedAgg > 0 ? Math.round((totalAfterDeadlineAgg / totalTasksCompletedAgg) * 100) : 0;

    const totalCasualLeavesAgg = activePerformanceList.reduce((sum, item) => sum + item.leavesBreakdown.casual, 0);
    const totalSickLeavesAgg = activePerformanceList.reduce((sum, item) => sum + item.leavesBreakdown.sick, 0);
    const totalEarnedLeavesAgg = activePerformanceList.reduce((sum, item) => sum + item.leavesBreakdown.earned, 0);
    const totalUnpaidLeavesAgg = activePerformanceList.reduce((sum, item) => sum + item.leavesBreakdown.unpaid, 0);

    const getCompletionTrendData = () => {
        const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const to = toDate ? new Date(toDate) : new Date();
        const diffMs = to - from;
        const intervalMs = diffMs / 5;
        
        const trendPoints = [];
        for (let i = 0; i < 5; i++) {
            const startInterval = new Date(from.getTime() + i * intervalMs);
            const endInterval = new Date(from.getTime() + (i + 1) * intervalMs);
            
            let segmentCompleted = 0;
            activePerformanceList.forEach(item => {
                const empTasks = tasks.filter(t => (t.assignedTo?._id || t.assignedTo) === item.employee._id);
                const completedInInterval = empTasks.filter(t => {
                    const isDone = t.status === "Completed" || t.status === "Done";
                    if (!isDone) return false;
                    const completionDate = t.updatedAt ? new Date(t.updatedAt) : new Date();
                    return completionDate >= startInterval && completionDate <= endInterval;
                });
                segmentCompleted += completedInInterval.length;
            });
            
            const label = `${startInterval.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`;
            trendPoints.push({ label, value: segmentCompleted });
        }
        return trendPoints;
    };
    const trendData = getCompletionTrendData();

    // PDF Handlers
    const handleExportOverallHRReport = () => {
        const sections = [
            {
                title: "Employee Performance Metrics Summary",
                columns: ["Metric", "Value"],
                data: [
                    ["Total Assigned Tasks", totalAssignedTasksAgg],
                    ["Completed Tasks", totalCompletedTasksAgg],
                    ["Overdue Tasks", totalOverdueTasksAgg],
                    ["Avg Completion Rate", `${avgCompletionRateAgg}%`],
                    ["Avg Completion Time", `${avgCompletionTimeAgg} days`],
                    ["Total Leave Days Taken", totalLeaveDaysAgg]
                ]
            },
            {
                title: "Individual Performance Breakdown",
                columns: ["Employee Name", "Department", "Assigned", "Completed", "Overdue", "Completion %", "Leaves Taken"],
                data: activePerformanceList.map(item => [
                    item.employee.name,
                    item.employee.department || "Engineering",
                    item.assignedCount,
                    item.completedCount,
                    item.overdueCount,
                    `${item.completionRate}%`,
                    item.leavesTakenDays
                ])
            },
            {
                title: "Deadline Adherence",
                columns: ["Adherence Category", "Tasks Count", "Percentage"],
                data: [
                    ["Before Deadline", totalBeforeDeadlineAgg, `${beforeDeadlinePct}%`],
                    ["On Deadline", totalOnDeadlineAgg, `${onDeadlinePct}%`],
                    ["After Deadline", totalAfterDeadlineAgg, `${afterDeadlinePct}%`]
                ]
            },
            {
                title: "Leaves Breakdown",
                columns: ["Leave Category", "Total Days Taken"],
                data: [
                    ["Casual Leaves", totalCasualLeavesAgg],
                    ["Sick Leaves", totalSickLeavesAgg],
                    ["Earned Leaves", totalEarnedLeavesAgg],
                    ["Unpaid Leaves", totalUnpaidLeavesAgg]
                ]
            }
        ];

        exportOverallReport({
            title: `HR Employee Performance Report - ${selectedDept === "All" ? "All Departments" : selectedDept}`,
            filename: `hr_performance_report_${new Date().getTime()}.pdf`,
            sections
        });
    };

    const handleExportHRActivity = () => {
        const columns = ["Employee", "Assigned Tasks", "Completed Tasks", "Overdue", "Completion %", "Leaves"];
        const data = activePerformanceList.map(item => [
            item.employee.name,
            item.assignedCount,
            item.completedCount,
            item.overdueCount,
            `${item.completionRate}%`,
            item.leavesTakenDays
        ]);
        exportPDF({
            title: "Employee Productivity Scorecard",
            filename: `employee_productivity_scorecard_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

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

    const employeeReportList = users
        .filter(u => {
            if (u.role === "admin") return false;

            // Role Hierarchy Scoping
            if (user?.role === "admin" || user?.role === "hr") {
                // View all employees
            } else if (user?.role === "TL") {
                // View only employees assigned under that Team Lead
                const isDirectReport = u.reportingManagers?.some(m => String(m._id || m) === String(user?._id)) ||
                                       String(u.reportingManager?._id || u.reportingManager) === String(user?._id) ||
                                       u.teamLeads?.some(tl => String(tl._id || tl) === String(user?._id));
                if (!isDirectReport) return false;
            } else {
                // Employee / QA / others: View only personal performance metrics
                if (String(u._id) !== String(user?._id)) return false;
            }

            if (selectedProjectId === "All") return true;
            // Show if user is in project team or has tasks in this project
            const isQA = u.role === 'qa' || u.role === 'QA' || (u.designation && u.designation.toLowerCase().includes('qa'));
            const isMember = activeProject?.teamMembers?.some(m => (m._id || m) === u._id);
            const hasTasks = tasks.some(t => t.project?._id === selectedProjectId && (isQA ? (t.assignedQA?._id || t.assignedQA) === u._id : (t.assignedTo?._id || t.assignedTo) === u._id));
            return isMember || hasTasks;
        })
        .map(emp => {
            const isQA = emp.role === 'qa' || emp.role === 'QA' || (emp.designation && emp.designation.toLowerCase().includes('qa'));
            const devTasks = filteredTasks.filter(t => isQA ? (t.assignedQA?._id || t.assignedQA) === emp._id : (t.assignedTo?._id || t.assignedTo) === emp._id);
            const completed = devTasks.filter(t => {
                if (isQA) {
                    if (["Completed", "Done"].includes(t.status)) return true;
                    const history = t.statusHistory || [];
                    let hasBeenInQA = false;
                    for (const h of history) {
                        if (h.status === 'QA Review') hasBeenInQA = true;
                        else if (h.status === 'In Progress' && hasBeenInQA) return true;
                    }
                    return false;
                }
                return t.status === "Completed" || t.status === "Done";
            }).length;
            const total = devTasks.length;
            const performance = total > 0 ? Math.round((completed / total) * 100) : 0;
            const overdue = devTasks.filter(t => {
                const isDone = isQA
                    ? (["Completed", "Done"].includes(t.status) || (() => {
                        const history = t.statusHistory || [];
                        let hasBeenInQA = false;
                        for (const h of history) {
                            if (h.status === 'QA Review') hasBeenInQA = true;
                            else if (h.status === 'In Progress' && hasBeenInQA) return true;
                        }
                        return false;
                    })())
                    : (t.status === "Completed" || t.status === "Done");
                return !isDone && t.endDate && new Date(t.endDate) < new Date();
            }).length;
            
            // First Assigned & Last Active Dates
            const allEmpTasks = tasks.filter(t => (isQA ? (t.assignedQA?._id || t.assignedQA) === emp._id : (t.assignedTo?._id || t.assignedTo) === emp._id) && (selectedProjectId === "All" || t.project?._id === selectedProjectId));
            let firstTaskDate = "-";
            let lastActiveDate = "-";
            if (allEmpTasks.length > 0) {
                const createdDates = allEmpTasks.map(t => new Date(t.createdAt)).filter(d => !isNaN(d));
                const updatedDates = allEmpTasks.map(t => new Date(t.updatedAt || t.createdAt)).filter(d => !isNaN(d));
                if (createdDates.length > 0) {
                    firstTaskDate = new Date(Math.min(...createdDates)).toLocaleDateString();
                }
                if (updatedDates.length > 0) {
                    lastActiveDate = new Date(Math.max(...updatedDates)).toLocaleDateString();
                }
            }

            return {
                name: emp.name,
                initials: emp.name?.charAt(0) || "U",
                role: getUserDesignation(emp),
                total,
                completed,
                overdue,
                performance,
                firstTask: firstTaskDate,
                lastActivity: lastActiveDate,
                color: "bg-indigo-100 text-indigo-700",
                profilePic: emp.profilePic
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
                title: "Employee Performance",
                columns: ["Employee Name", "Total Tasks", "Completed", "Overdue", "Performance %"],
                data: employeeReportList.map(d => [d.name, d.total, d.completed, d.overdue, `${d.performance}%`])
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
        const columns = ["Employee Name", "Total Tasks", "Completed", "Overdue", "Performance %"];
        const data = employeeReportList.map(d => [
            d.name,
            d.total,
            d.completed,
            d.overdue,
            `${d.performance}%`
        ]);
        exportPDF({
            title: "Employee Performance Report",
            filename: `employee_performance_${new Date().getTime()}.pdf`,
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

    if (loading) {
        return (
            <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
                <AdminSidebar role={user?.role === 'TL' ? 'teamLead' : (user?.role === 'qa' ? 'qa' : (user?.role === 'admin' ? 'admin' : (user?.role === 'hr' ? 'hr' : 'employee')))} />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <Topbar DashboardTile={activeFocus === "hr" ? "Workforce Analytics" : "Reports"} />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-semibold text-sm">Loading reports data...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (activeFocus === "hr") {
        return (
            <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
                <AdminSidebar role={user?.role === 'admin' ? 'admin' : 'hr'} />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <Topbar DashboardTile="Employee Performance Review" />
                    
                    <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
                        
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <h1 className="dashboard-heading text-2xl font-black tracking-tight text-slate-800">Employee Performance & Productivity</h1>
                                <p className="dashboard-subheading text-xs font-semibold text-slate-400 mt-1">Review organizational task completion timelines, deadline adherence, and leave patterns.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleExportHRActivity}
                                    disabled={activePerformanceList.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer border-none"
                                >
                                    <Download className="w-4 h-4 text-slate-450" /> Export Scorecard
                                </button>
                                <button 
                                    onClick={handleExportOverallHRReport}
                                    disabled={activePerformanceList.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer border-none"
                                >
                                    <Download className="w-4 h-4" /> Export Overall PDF
                                </button>
                            </div>
                        </div>

                        {/* Top Filters */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-wrap lg:flex-nowrap items-center gap-4">
                            
                            {/* Employee Filter */}
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Employee</label>
                                <div className="relative">
                                    <select 
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer appearance-none"
                                        value={selectedEmployeeId}
                                        onChange={(e) => {
                                            setSelectedEmployeeId(e.target.value);
                                            setActiveCardFilter("all"); 
                                        }}
                                    >
                                        <option value="All">All Employees</option>
                                        {dropdownEmployeesList.map(u => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Department Filter */}
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Department</label>
                                <div className="relative">
                                    <select 
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer appearance-none"
                                        value={selectedDept}
                                        onChange={(e) => {
                                            setSelectedDept(e.target.value);
                                            setSelectedEmployeeId("All"); 
                                            setActiveCardFilter("all"); 
                                        }}
                                    >
                                        <option value="All">All Departments</option>
                                        {departments.map(d => (
                                            <option key={d._id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                                    </div>
                                </div>
                            </div>

                            {/* From Date */}
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">From Date</label>
                                <input 
                                    type="date" 
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer" 
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                            </div>

                            {/* To Date */}
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">To Date</label>
                                <input 
                                    type="date" 
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer" 
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Performance Summary Cards Row */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                            {/* Card 1: Assigned Tasks */}
                            <div 
                                onClick={() => setActiveCardFilter(activeCardFilter === "assigned" ? "all" : "assigned")}
                                className={`flex flex-col justify-between h-28 bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${
                                    activeCardFilter === "assigned" ? "border-blue-500 ring-2 ring-blue-500/10 shadow-md" : "border-slate-200/60 hover:border-blue-300"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider leading-tight">Assigned Tasks</span>
                                    <Briefcase className="w-4 h-4 text-slate-450 shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-slate-800 leading-none">{totalAssignedTasksAgg}</div>
                                    <div className="text-[10px] text-slate-400 font-bold leading-none">Click to filter table</div>
                                </div>
                            </div>

                            {/* Card 2: Completed Tasks */}
                            <div 
                                onClick={() => setActiveCardFilter(activeCardFilter === "completed" ? "all" : "completed")}
                                className={`flex flex-col justify-between h-28 bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${
                                    activeCardFilter === "completed" ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-md" : "border-slate-200/60 hover:border-emerald-300"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider leading-tight">Completed Tasks</span>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-emerald-600 leading-none">{totalCompletedTasksAgg}</div>
                                    <div className="text-[10px] text-slate-400 font-bold leading-none">Click to filter table</div>
                                </div>
                            </div>

                            {/* Card 3: Overdue Tasks */}
                            <div 
                                onClick={() => setActiveCardFilter(activeCardFilter === "overdue" ? "all" : "overdue")}
                                className={`flex flex-col justify-between h-28 bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${
                                    activeCardFilter === "overdue" ? "border-rose-500 ring-2 ring-rose-500/10 shadow-md" : "border-slate-200/60 hover:border-rose-300"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider leading-tight">Overdue Tasks</span>
                                    <AlertCircle className="w-4 h-4 text-rose-550 shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-rose-600 leading-none">{totalOverdueTasksAgg}</div>
                                    <div className="text-[10px] text-slate-400 font-bold leading-none">Click to filter table</div>
                                </div>
                            </div>

                            {/* Card 4: Completion Rate */}
                            <div 
                                onClick={() => setActiveCardFilter(activeCardFilter === "rate" ? "all" : "rate")}
                                className={`flex flex-col justify-between h-28 bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${
                                    activeCardFilter === "rate" ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-md" : "border-slate-200/60 hover:border-indigo-300"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider leading-tight">Completion Rate</span>
                                    <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-indigo-600 leading-none">{avgCompletionRateAgg}%</div>
                                    <div className="text-[10px] text-slate-400 font-bold leading-none">Rate &lt; 80% filters</div>
                                </div>
                            </div>

                            {/* Card 5: Average Completion Time */}
                            <div 
                                className="flex flex-col justify-between h-28 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 transition-all hover:scale-[1.02] hover:border-blue-300 hover:shadow"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider leading-tight">Avg Completion Time</span>
                                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-blue-600 leading-none">
                                        {avgCompletionTimeAgg}<span className="text-xs font-semibold text-slate-400 ml-0.5">days</span>
                                    </div>
                                    <div className="text-[10px] text-slate-450 font-bold leading-none">Task timeline velocity</div>
                                </div>
                            </div>

                            {/* Card 6: Total Leave Days (Temporarily Commented Out) */}
                            {/* <div 
                                onClick={() => setActiveCardFilter(activeCardFilter === "leaves" ? "all" : "leaves")}
                                className={`flex flex-col justify-between h-28 bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${
                                    activeCardFilter === "leaves" ? "border-amber-500 ring-2 ring-amber-500/10 shadow-md" : "border-slate-200/60 hover:border-amber-300"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider leading-tight">Leaves Taken</span>
                                    <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-amber-600 leading-none">
                                        {totalLeaveDaysAgg}<span className="text-xs font-semibold text-slate-400 ml-0.5">days</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold leading-none">Click to filter table</div>
                                </div>
                            </div> */}
                        </div>

                        {/* Main Grid: Left (Employee Performance Table) & Right (Productivity Charts) */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            
                            {/* Left Panel: Performance Table (2/3 cols) */}
                            <div className="xl:col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        Employee Productivity & Performance Review
                                    </h2>
                                    {activeCardFilter !== "all" && (
                                        <button 
                                            onClick={() => setActiveCardFilter("all")}
                                            className="px-2.5 py-1 bg-blue-50 text-blue-600 font-bold text-[11px] rounded-lg border border-blue-100/60 hover:bg-blue-100 transition-colors border-none cursor-pointer"
                                        >
                                            Clear Card Filter: <span className="uppercase">{activeCardFilter}</span>
                                        </button>
                                    )}
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-450 uppercase tracking-wider">
                                                    <th className="p-4 pl-6 font-semibold">Employee</th>
                                                    <th className="p-4 font-semibold">Department</th>
                                                    <th className="p-4 font-semibold text-center">Assigned</th>
                                                    <th className="p-4 font-semibold text-center">Completed</th>
                                                    <th className="p-4 font-semibold text-center">Overdue</th>
                                                    <th className="p-4 font-semibold w-1/4">Completion Rate</th>
                                                    {/* <th className="p-4 font-semibold text-center">Leaves</th> */}
                                                    <th className="p-4 font-semibold text-right pr-6">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {tableFilteredPerformanceList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" className="p-8 text-center text-slate-400 font-semibold text-sm">
                                                            No employee performance records match the active filters.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    tableFilteredPerformanceList.map((item, i) => (
                                                        <tr 
                                                            key={i} 
                                                            onClick={() => {
                                                                setPerformanceSidebarUser(item.employee);
                                                                setIsPerformanceSidebarOpen(true);
                                                            }}
                                                            className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                                                        >
                                                            {/* Name and Designation */}
                                                            <td className="p-4 pl-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden flex-shrink-0">
                                                                        {item.employee.profilePic ? (
                                                                            <img src={item.employee.profilePic} alt={item.employee.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            item.employee.name?.charAt(0) || "U"
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{item.employee.name}</div>
                                                                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{item.employee.designation || (item.employee.role === 'TL' ? 'Team Lead' : (item.employee.role === 'qa' || item.employee.role === 'QA' ? 'QA' : (item.employee.role === 'admin' ? 'Admin' : (item.employee.role ? item.employee.role.charAt(0).toUpperCase() + item.employee.role.slice(1) : 'Employee'))))}</div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Department */}
                                                            <td className="p-4 text-xs font-semibold text-slate-500">
                                                                {item.employee.department || "Engineering"}
                                                            </td>

                                                            {/* Assigned Tasks */}
                                                            <td className="p-4 text-center">
                                                                <span className="font-bold text-slate-700 text-sm">{item.assignedCount}</span>
                                                            </td>

                                                            {/* Completed Tasks */}
                                                            <td className="p-4 text-center">
                                                                {item.completedCount > 0 ? (
                                                                    <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-lg">
                                                                        {item.completedCount}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300 font-bold text-sm">-</span>
                                                                )}
                                                            </td>

                                                            {/* Overdue Tasks */}
                                                            <td className="p-4 text-center">
                                                                {item.overdueCount > 0 ? (
                                                                    <span className="inline-flex px-2 py-0.5 bg-rose-50 text-rose-600 font-bold text-xs rounded-lg border border-rose-100/60">
                                                                        {item.overdueCount}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-350 font-semibold text-sm">-</span>
                                                                )}
                                                            </td>

                                                            {/* Completion Rate progress */}
                                                            <td className="p-4">
                                                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                                                                    <span>{item.completionRate}%</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                                    <div 
                                                                        className={`h-1.5 rounded-full ${item.completionRate < 50 ? 'bg-rose-450' : item.completionRate < 80 ? 'bg-amber-450' : 'bg-emerald-500'}`}
                                                                        style={{ width: `${item.completionRate}%` }}
                                                                    ></div>
                                                                </div>
                                                            </td>

                                                            {/* Leaves Taken (Temporarily Commented Out) */}
                                                            {/* <td className="p-4 text-center">
                                                                {item.leavesTakenDays > 0 ? (
                                                                    <span className="font-bold text-amber-600 text-sm">{item.leavesTakenDays}d</span>
                                                                ) : (
                                                                    <span className="text-slate-300 font-bold text-sm">-</span>
                                                                )}
                                                            </td> */}

                                                            {/* Availability Status */}
                                                            <td className="p-4 text-right pr-6">
                                                                <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                                                                    item.status === 'inactive' ? 'bg-slate-50 text-slate-450 border-slate-100' : 'bg-emerald-50/50 text-emerald-600 border-emerald-100/60'
                                                                }`}>
                                                                    {item.status === 'inactive' ? 'Inactive' : 'Active'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Advanced Productivity & Adherence Charts (1/3 col) */}
                            <div className="xl:col-span-1 space-y-6">
                                
                                {/* Chart 1: Deadline Adherence */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 space-y-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Deadline Adherence Chart
                                    </h3>
                                    
                                    {totalTasksCompletedAgg === 0 ? (
                                        <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                                            No completed tasks available to chart deadline adherence.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Stacked Bar container */}
                                            <div className="w-full bg-slate-100 h-6 rounded-xl overflow-hidden flex relative group cursor-pointer shadow-inner">
                                                <div 
                                                    className="bg-emerald-500 h-full hover:brightness-95 transition-all" 
                                                    style={{ width: `${beforeDeadlinePct}%` }}
                                                    title={`Before Deadline: ${totalBeforeDeadlineAgg} tasks (${beforeDeadlinePct}%)`}
                                                />
                                                <div 
                                                    className="bg-amber-400 h-full hover:brightness-95 transition-all" 
                                                    style={{ width: `${onDeadlinePct}%` }}
                                                    title={`On Deadline: ${totalOnDeadlineAgg} tasks (${onDeadlinePct}%)`}
                                                />
                                                <div 
                                                    className="bg-rose-500 h-full hover:brightness-95 transition-all" 
                                                    style={{ width: `${afterDeadlinePct}%` }}
                                                    title={`After Deadline: ${totalAfterDeadlineAgg} tasks (${afterDeadlinePct}%)`}
                                                />
                                            </div>

                                            {/* Labels with percentages and values */}
                                            <div className="grid grid-cols-3 gap-2 pt-1">
                                                <div className="text-center">
                                                    <span className="block w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto mb-1"></span>
                                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Before</span>
                                                    <div className="text-xs font-black text-slate-700">{beforeDeadlinePct}% <span className="font-semibold text-[10px] text-slate-400">({totalBeforeDeadlineAgg})</span></div>
                                                </div>
                                                <div className="text-center border-x border-slate-100">
                                                    <span className="block w-2.5 h-2.5 rounded-full bg-amber-400 mx-auto mb-1"></span>
                                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">On Time</span>
                                                    <div className="text-xs font-black text-slate-700">{onDeadlinePct}% <span className="font-semibold text-[10px] text-slate-400">({totalOnDeadlineAgg})</span></div>
                                                </div>
                                                <div className="text-center">
                                                    <span className="block w-2.5 h-2.5 rounded-full bg-rose-500 mx-auto mb-1"></span>
                                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Late</span>
                                                    <div className="text-xs font-black text-slate-700">{afterDeadlinePct}% <span className="font-semibold text-[10px] text-slate-400">({totalAfterDeadlineAgg})</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chart 2: Task Completion Trend */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 space-y-4 font-sans relative">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                        <Activity className="w-4 h-4 text-blue-500" />
                                        Task Completion Trend
                                    </h3>

                                    {/* Custom vertical bar graph chart */}
                                    <div className="flex items-end justify-between h-28 pt-4 px-2">
                                        {trendData.map((pt, index) => {
                                            const maxVal = Math.max(...trendData.map(p => p.value)) || 1;
                                            const heightPct = Math.round((pt.value / maxVal) * 100);
                                            return (
                                                <div key={index} className="flex flex-col items-center flex-1 group cursor-pointer">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bg-slate-850 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-lg -translate-y-9 pointer-events-none z-20">
                                                        {pt.value} Completed
                                                    </div>
                                                    <div 
                                                        className="w-8 bg-blue-500 group-hover:bg-blue-600 rounded-t-lg transition-all duration-500 relative"
                                                        style={{ height: `${Math.max(8, heightPct)}%` }}
                                                    >
                                                        <div className="absolute top-1 left-0 right-0 text-[9px] text-center font-bold text-white opacity-80">{pt.value}</div>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase mt-2 text-center truncate w-full max-w-[65px]">{pt.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Chart 3: Leave Type Distribution Usage (Temporarily Commented Out) */}
                                {/* <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 space-y-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                        <Calendar className="w-4 h-4 text-amber-500" />
                                        Leave Usage Analysis
                                    </h3>

                                    <div className="space-y-3.5">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                                <span>Casual Leaves</span>
                                                <span className="font-black text-slate-700">{totalCasualLeavesAgg} days</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${totalLeaveDaysAgg > 0 ? (totalCasualLeavesAgg / totalLeaveDaysAgg) * 100 : 0}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                                <span>Sick Leaves</span>
                                                <span className="font-black text-slate-700">{totalSickLeavesAgg} days</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${totalLeaveDaysAgg > 0 ? (totalSickLeavesAgg / totalLeaveDaysAgg) * 100 : 0}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                                <span>Earned Leaves</span>
                                                <span className="font-black text-slate-700">{totalEarnedLeavesAgg} days</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-amber-550 h-2 rounded-full" style={{ width: `${totalLeaveDaysAgg > 0 ? (totalEarnedLeavesAgg / totalLeaveDaysAgg) * 100 : 0}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                                <span>Unpaid Leaves</span>
                                                <span className="font-black text-slate-700">{totalUnpaidLeavesAgg} days</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${totalLeaveDaysAgg > 0 ? (totalUnpaidLeavesAgg / totalLeaveDaysAgg) * 100 : 0}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div> */}
                            </div>
                        </div>

                        {/* Employee Performance Drawer */}
                        {isPerformanceSidebarOpen && performanceSidebarUser && (() => {
                            const perfData = employeePerformanceData.find(item => item.employee._id === performanceSidebarUser._id) || {
                                employee: performanceSidebarUser,
                                assignedCount: 0, completedCount: 0, overdueCount: 0, completionRate: 0, avgCompletionTime: "0.0", leavesTakenDays: 0,
                                beforeDeadline: 0, onDeadline: 0, afterDeadline: 0,
                                leavesBreakdown: { casual: 0, sick: 0, earned: 0, unpaid: 0 }
                            };
                            const pendingCount = Math.max(0, perfData.assignedCount - perfData.completedCount);

                            const getManagerName = (emp) => {
                                if (!emp.reportingManager) return "Not Assigned";
                                if (typeof emp.reportingManager === "object" && emp.reportingManager.name) {
                                    return emp.reportingManager.name;
                                }
                                const manager = users.find(u => u._id === emp.reportingManager);
                                return manager ? manager.name : "Not Assigned";
                            };

                            return (
                                <>
                                    {/* Backdrop */}
                                    <div 
                                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[3px] z-50 transition-opacity duration-300"
                                        onClick={() => setIsPerformanceSidebarOpen(false)}
                                    />
                                    
                                    {/* Sidebar Container */}
                                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-50 shadow-2xl border-l border-slate-200/80 z-50 flex flex-col h-full animate-in slide-in-from-right duration-300 font-sans text-slate-800">
                                        {/* Header */}
                                        <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden flex-shrink-0">
                                                    {perfData.employee.profilePic ? (
                                                        <img src={perfData.employee.profilePic} alt={perfData.employee.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        perfData.employee.name?.charAt(0) || "U"
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-base">{perfData.employee.name}</h3>
                                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">{perfData.employee.designation || (perfData.employee.role === 'TL' ? 'Team Lead' : (perfData.employee.role === 'qa' || perfData.employee.role === 'QA' ? 'QA' : (perfData.employee.role === 'admin' ? 'Admin' : (perfData.employee.role ? perfData.employee.role.charAt(0).toUpperCase() + perfData.employee.role.slice(1) : 'Employee'))))} • {perfData.employee.department || "Engineering"}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setIsPerformanceSidebarOpen(false)}
                                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-xl transition cursor-pointer border-none"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        </div>

                                        {/* Body Content */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                            {/* General Summary Card */}
                                            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-3">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Overview</h4>
                                                <div className="grid grid-cols-2 gap-4 text-xs">
                                                    <div>
                                                        <span className="text-slate-450 font-medium">Reporting Manager</span>
                                                        <div className="font-bold text-slate-700 mt-0.5">{getManagerName(perfData.employee)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-455 font-medium">Availability Status</span>
                                                        <div className="mt-0.5">
                                                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${perfData.employee.status === "inactive" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                                                                {perfData.employee.status === "inactive" ? "Inactive" : "Active"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Productivity Metrics Card */}
                                            <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm space-y-4">
                                                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                                    <Target className="w-4 h-4 text-blue-500" />
                                                    Productivity & Tasks
                                                </h4>
                                                
                                                {/* Summary grid */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned</span>
                                                        <div className="text-lg font-black text-slate-700 mt-0.5">{perfData.assignedCount}</div>
                                                    </div>
                                                    <div className="bg-emerald-50/40 p-2.5 rounded-lg text-center">
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Completed</span>
                                                        <div className="text-lg font-black text-emerald-700 mt-0.5">{perfData.completedCount}</div>
                                                    </div>
                                                    <div className="bg-rose-50/40 p-2.5 rounded-lg text-center">
                                                        <span className="text-[10px] font-bold text-rose-600 uppercase">Overdue</span>
                                                        <div className="text-lg font-black text-rose-700 mt-0.5">{perfData.overdueCount}</div>
                                                    </div>
                                                </div>

                                                {/* Extra calculations */}
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-500 font-medium">Pending Tasks</span>
                                                        <span className="font-bold text-slate-700">{pendingCount}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-500 font-medium">Task Completion Rate</span>
                                                        <span className="font-bold text-blue-600">{perfData.completionRate}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${perfData.completionRate}%` }}></div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs pt-1">
                                                        <span className="text-slate-500 font-medium">Avg Completion Time</span>
                                                        <span className="font-bold text-slate-700">{perfData.avgCompletionTime} days</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Deadline Adherence Metrics Card */}
                                            <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm space-y-4">
                                                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    Behavior & Deadline Adherence
                                                </h4>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-500 font-medium">Completed Before Deadline</span>
                                                        <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-600 font-bold rounded-lg">{perfData.beforeDeadline} tasks</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-500 font-medium">Completed On Deadline</span>
                                                        <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-600 font-bold rounded-lg">{perfData.onDeadline} tasks</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-500 font-medium">Completed After Deadline</span>
                                                        <span className="inline-flex px-2 py-0.5 bg-rose-50 text-rose-600 font-bold rounded-lg">{perfData.afterDeadline} tasks</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Leave Usage Metrics Card (Temporarily Commented Out) */}
                                            {/* <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm space-y-4">
                                                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                                    <Calendar className="w-4 h-4 text-amber-500" />
                                                    Leave Balance Usage
                                                </h4>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Casual Leaves</span>
                                                            <span className="text-sm font-black text-slate-700">{perfData.leavesBreakdown.casual} days</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Sick Leaves</span>
                                                            <span className="text-sm font-black text-slate-700">{perfData.leavesBreakdown.sick} days</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Earned Leaves</span>
                                                            <span className="text-sm font-black text-slate-700">{perfData.leavesBreakdown.earned} days</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Unpaid Leaves</span>
                                                            <span className="text-sm font-black text-slate-700">{perfData.leavesBreakdown.unpaid} days</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 pt-3">
                                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Total Leave Days Taken</span>
                                                    <span className="font-black text-amber-600 text-sm">{perfData.leavesTakenDays} days</span>
                                                </div>
                                            </div> */}
                                        </div>

                                        {/* Footer Action */}
                                        <div className="bg-white p-4 border-t border-slate-100 shadow-inner flex items-center justify-end">
                                            <button 
                                                onClick={() => setIsPerformanceSidebarOpen(false)}
                                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer border-none"
                                            >
                                                Close Details
                                            </button>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar role={user?.role === 'TL' ? 'teamLead' : (user?.role === 'qa' ? 'qa' : (user?.role === 'admin' ? 'admin' : (user?.role === 'hr' ? 'hr' : 'employee')))} />
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
                                Get a complete operational overview of task completion timelines, employee performance metrics, and system-wide activity logs. Select one of your assigned projects to load analytics.
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
                                disabled={tasks.length === 0}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition shadow-sm"
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
                        
                        {/* Employee Performance */}
                        <div className="xl:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                                    Employee Performance
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
                                                <th className="p-4 pl-6 font-semibold">Employee</th>
                                                <th className="p-4 font-semibold text-center">Tasks (Done/Total)</th>
                                                <th className="p-4 font-semibold text-center">Overdue</th>
                                                <th className="p-4 font-semibold w-1/4">Performance %</th>
                                                <th className="p-4 font-semibold">Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {employeeReportList.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400 font-semibold text-sm">
                                                        No employee performance data available.
                                                    </td>
                                                </tr>
                                            ) : (
                                                employeeReportList.map((dev, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="p-4 pl-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-sm shadow-sm border border-white overflow-hidden ${dev.color}`}>
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
                                                            <div className="w-full bg-slate-200 rounded-full h-2">
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
                                                ))
                                            )}
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