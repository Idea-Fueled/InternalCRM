import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { userService, leaveService, projectService } from "../../api/services";
import { exportPDF } from "../../utils/pdfExport";
import { toast } from "sonner";
import { 
    Download, FileSpreadsheet, FileText, Users, Calendar, 
    Briefcase, Building, ChevronRight, Activity, Info
} from "lucide-react";

// Robust, pure JS browser-based CSV exporter
const exportToCSV = (filename, headers, dataRows) => {
    const csvRows = [
        headers.join(','),
        ...dataRows.map(row => 
            row.map(val => {
                const escaped = String(val ?? '').replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        )
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const HRReports = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Employees"); // "Employees" | "Leaves" | "Projects"
    const [employees, setEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [projects, setProjects] = useState([]);

    const loadReportData = async () => {
        try {
            setLoading(true);
            const [usersRes, leavesRes, projectsRes] = await Promise.all([
                userService.getAllUsers({ status: 'all' }),
                leaveService.getLeaves(),
                projectService.getAllProjects()
            ]);

            if (usersRes.data?.success && Array.isArray(usersRes.data.data)) {
                // Filter out Admin accounts to match scoping boundaries
                setEmployees(usersRes.data.data.filter(u => u.role !== "admin"));
            }
            if (leavesRes.data?.success && Array.isArray(leavesRes.data.data)) {
                setLeaves(leavesRes.data.data);
            }
            if (Array.isArray(projectsRes.data)) {
                setProjects(projectsRes.data);
            } else if (projectsRes.data?.projects) {
                setProjects(projectsRes.data.projects);
            }
        } catch (err) {
            console.error("Failed to load HR reports datasets:", err);
            toast.error("Failed to compile reports data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReportData();
    }, []);

    // ─── PDF Export Handlers ────────────────────────────────────────────────
    const handleExportPDF = () => {
        if (activeTab === "Employees") {
            const columns = ["Name", "Email", "Department", "Designation", "Availability"];
            const data = employees.map(emp => [
                emp.name || "",
                emp.email || "",
                emp.department || "Unassigned",
                emp.designation || emp.role || "",
                emp.status || "free"
            ]);
            exportPDF({
                title: "Employee Distribution Roster",
                filename: "employee_distribution_report.pdf",
                columns,
                data,
                headerText: "Idea Fueled CRM - Human Resources"
            });
            toast.success("Employee PDF report downloaded successfully!");
        } else if (activeTab === "Leaves") {
            const columns = ["Employee Name", "Leave Type", "Start Date", "End Date", "Total Days", "Status"];
            const data = leaves.map(l => [
                l.employee?.name || "",
                l.leaveType || "",
                l.startDate ? new Date(l.startDate).toLocaleDateString() : "",
                l.endDate ? new Date(l.endDate).toLocaleDateString() : "",
                String(l.totalDays || 0),
                l.status || ""
            ]);
            exportPDF({
                title: "Leaves Usage and Approvals Log",
                filename: "leaves_report.pdf",
                columns,
                data,
                headerText: "Idea Fueled CRM - Human Resources"
            });
            toast.success("Leave PDF report downloaded successfully!");
        } else if (activeTab === "Projects") {
            const columns = ["Project Name", "Team Lead", "Members Count", "Progress", "Start Date"];
            const data = projects.map(p => [
                p.projectName || "",
                p.teamLead?.name || "Unassigned",
                String(p.teamMembers?.length || 0),
                `${p.progress || 0}%`,
                p.startDate ? new Date(p.startDate).toLocaleDateString() : ""
            ]);
            exportPDF({
                title: "Project Allocations and Workload",
                filename: "project_resource_allocation_report.pdf",
                columns,
                data,
                headerText: "Idea Fueled CRM - Human Resources"
            });
            toast.success("Project allocation PDF report downloaded successfully!");
        }
    };

    // ─── CSV Export Handlers ────────────────────────────────────────────────
    const handleExportCSV = () => {
        if (activeTab === "Employees") {
            const headers = ["Name", "Email", "Department", "Designation", "Status", "Casual Leave Balance", "Sick Leave Balance", "Earned Leave Balance"];
            const dataRows = employees.map(emp => [
                emp.name || "",
                emp.email || "",
                emp.department || "Unassigned",
                emp.designation || emp.role || "",
                emp.status || "free",
                String(emp.casualLeaveBalance ?? 12),
                String(emp.sickLeaveBalance ?? 10),
                String(emp.earnedLeaveBalance ?? 15)
            ]);
            exportToCSV("employee_distribution_matrix.csv", headers, dataRows);
            toast.success("Employee Excel/CSV report downloaded successfully!");
        } else if (activeTab === "Leaves") {
            const headers = ["Employee Name", "Leave Type", "Start Date", "End Date", "Total Days", "Reason", "Status", "Processed By"];
            const dataRows = leaves.map(l => [
                l.employee?.name || "",
                l.leaveType || "",
                l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : "",
                l.endDate ? new Date(l.endDate).toISOString().split('T')[0] : "",
                String(l.totalDays || 0),
                l.reason || "",
                l.status || "",
                l.processedBy?.name || ""
            ]);
            exportToCSV("leaves_audit_trail.csv", headers, dataRows);
            toast.success("Leave Excel/CSV report downloaded successfully!");
        } else if (activeTab === "Projects") {
            const headers = ["Project Name", "Team Lead", "Members Assigned Count", "Progress (%)", "Start Date", "End Date"];
            const dataRows = projects.map(p => [
                p.projectName || "",
                p.teamLead?.name || "Unassigned",
                String(p.teamMembers?.length || 0),
                String(p.progress || 0),
                p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : "",
                p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : ""
            ]);
            exportToCSV("project_workloads_roster.csv", headers, dataRows);
            toast.success("Project allocation Excel/CSV report downloaded successfully!");
        }
    };

    return (
        <div className="flex h-screen bg-[#060B18] text-slate-200 overflow-hidden font-sans">
            <AdminSidebar role="hr" />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
                <Topbar title="HR Reports Module" />
                
                <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
                    {/* Header Banner */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-[24px] p-6 backdrop-blur-md">
                        <h1 className="text-xl sm:text-2xl font-black text-white">System Reports & Exports</h1>
                        <p className="text-slate-400 text-xs font-semibold mt-1 font-sans">Generate comprehensive rosters for staff distribution, leave usage records, and project resource workloads.</p>
                    </div>

                    {/* Exporters Header Panel */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/20 border border-slate-800/60 rounded-[20px] p-4">
                        {/* Tab Switcher */}
                        <div className="flex gap-2 bg-slate-950/40 p-1 rounded-xl border border-slate-850">
                            {["Employees", "Leaves", "Projects"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                        activeTab === tab
                                            ? "bg-slate-800 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                                >
                                    {tab === "Employees" ? "Employee Roster" : tab === "Leaves" ? "Leaves Log" : "Project Allocations"}
                                </button>
                            ))}
                        </div>

                        {/* Export Action Controls */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportCSV}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                Export CSV
                            </button>
                            <button
                                onClick={handleExportPDF}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <FileText className="w-4 h-4 text-rose-500" />
                                Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Report Data Visual Grid */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-400 text-xs font-bold">Compiling spreadsheet metrics...</span>
                        </div>
                    ) : (
                        <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-sm">
                            <div className="overflow-x-auto no-scrollbar">
                                {activeTab === "Employees" && (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                <th className="p-4">Staff Member</th>
                                                <th className="p-4">Email Address</th>
                                                <th className="p-4">Department</th>
                                                <th className="p-4">Designation</th>
                                                <th className="p-4">Availability</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-850 text-xs font-bold text-slate-300">
                                            {employees.map(emp => (
                                                <tr key={emp._id} className="hover:bg-slate-900/10 transition-colors">
                                                    <td className="p-4 flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden shrink-0">
                                                            {emp.profilePic ? <img src={emp.profilePic} alt="" className="w-full h-full object-cover" /> : emp.name?.charAt(0)}
                                                        </div>
                                                        <span className="text-white">{emp.name}</span>
                                                    </td>
                                                    <td className="p-4 text-slate-400 font-medium font-mono">{emp.email}</td>
                                                    <td className="p-4">{emp.department || "Unassigned"}</td>
                                                    <td className="p-4 text-slate-400">{emp.designation || emp.role}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                            emp.status === "inactive" ? "bg-slate-500/10 text-slate-400 border-slate-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        }`}>
                                                            {emp.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === "Leaves" && (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                <th className="p-4">Employee</th>
                                                <th className="p-4">Leave Type</th>
                                                <th className="p-4 text-center">Start Date</th>
                                                <th className="p-4 text-center">End Date</th>
                                                <th className="p-4 text-center">Total Days</th>
                                                <th className="p-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-850 text-xs font-bold text-slate-300">
                                            {leaves.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-10 text-slate-500">No leave log audits available.</td>
                                                </tr>
                                            ) : (
                                                leaves.map(l => (
                                                    <tr key={l._id} className="hover:bg-slate-900/10 transition-colors">
                                                        <td className="p-4 text-white">{l.employee?.name || "System Staff"}</td>
                                                        <td className="p-4 text-slate-400">{l.leaveType}</td>
                                                        <td className="p-4 text-center text-slate-400 font-mono">{l.startDate ? new Date(l.startDate).toLocaleDateString() : ""}</td>
                                                        <td className="p-4 text-center text-slate-400 font-mono">{l.endDate ? new Date(l.endDate).toLocaleDateString() : ""}</td>
                                                        <td className="p-4 text-center text-slate-200 font-mono">{l.totalDays} days</td>
                                                        <td className="p-4 text-right">
                                                            <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                                l.status === "Pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                                l.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                                "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                                            }`}>
                                                                {l.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === "Projects" && (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                <th className="p-4">Project Name</th>
                                                <th className="p-4">Supervisor Lead</th>
                                                <th className="p-4 text-center">Allocated Staff</th>
                                                <th className="p-4 text-center">Sprint Progress</th>
                                                <th className="p-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-850 text-xs font-bold text-slate-300">
                                            {projects.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-10 text-slate-500">No project allocations logged.</td>
                                                </tr>
                                            ) : (
                                                projects.map(p => (
                                                    <tr key={p._id} className="hover:bg-slate-900/10 transition-colors">
                                                        <td className="p-4 text-white">{p.projectName}</td>
                                                        <td className="p-4 text-slate-400">{p.teamLead?.name || "Unassigned"}</td>
                                                        <td className="p-4 text-center text-slate-400 font-mono">{p.teamMembers?.length || 0} members</td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="font-mono text-slate-300">{p.progress || 0}%</span>
                                                                <div className="w-16 h-2 bg-slate-950 border border-slate-850 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                                p.progress === 100 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                            }`}>
                                                                {p.progress === 100 ? "Delivered" : "Active"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default HRReports;
