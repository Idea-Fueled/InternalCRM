import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { userService, taskService, authService } from "../../api/services";
import { toast } from "sonner";
import { 
    Mail, User, Building, Calendar, Laptop, CheckCircle, 
    AlertCircle, ClipboardList, History, X 
} from "lucide-react";

// Reusable Card Component
const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 ${className}`}>
        {children}
    </div>
);

const EmployeesDashboard = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, withOverdue: 0, inactive: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
    const [isDepartmentsModalOpen, setIsDepartmentsModalOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        name: "",
        email: "",
        password: "",
        role: "developer",
        department: "Engineering",
        teamLead: ""
    });
    const [isCreating, setIsCreating] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [teamLeads, setTeamLeads] = useState([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [userRes, taskRes] = await Promise.all([
                userService.getAllUsers(),
                taskService.getAllTasks()
            ]);

            if (userRes.data?.data && taskRes.data?.success) {
                const allUsers = userRes.data.data;
                const allTasks = taskRes.data.tasks;

                const formattedEmployees = allUsers.map(u => {
                    const userTasks = allTasks.filter(t => t.assignedTo?._id === u._id);
                    const done = userTasks.filter(t => t.status === "Completed" || t.status === "Done").length;
                    const overdue = userTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length;
                    
                    return {
                        id: u._id,
                        name: u.name,
                        role: u.role,
                        email: u.email,
                        dept: u.department || "Engineering",
                        lead: u.teamLead?.name || "N/A",
                        tasks: { total: userTasks.length, done, overdue, list: userTasks },
                        status: u.isActive ? (overdue > 0 ? "Overdue" : "Active") : "Inactive",
                        joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A",
                        raw: u
                    };
                });

                setEmployees(formattedEmployees);
                
                setStats({
                    total: formattedEmployees.length,
                    active: formattedEmployees.filter(e => e.status !== "Inactive").length,
                    withOverdue: formattedEmployees.filter(e => e.tasks.overdue > 0).length,
                    inactive: formattedEmployees.filter(e => e.status === "Inactive").length
                });

                setTeamLeads(allUsers.filter(u => u.role === 'TL' || u.role === 'admin').map(u => ({ id: u._id, name: u.name })));
            }
        } catch (err) {
            console.error("Failed to fetch employees data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setSubmitted(true);

        if (!newEmployee.name || !newEmployee.email || !newEmployee.password) {
            return;
        }

        try {
            setIsCreating(true);
            await authService.register(newEmployee);
            toast.success("Employee added successfully");
            setIsAddEmployeeModalOpen(false);
            setSubmitted(false);
            setNewEmployee({
                name: "",
                email: "",
                password: "",
                role: "developer",
                department: "Engineering",
                teamLead: ""
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to add employee");
        } finally {
            setIsCreating(false);
        }
    };

    const handleStatusToggle = async (emp) => {
        try {
            const newStatus = !emp.raw.isActive;
            await userService.updateUser(emp.id, { isActive: newStatus });
            toast.success(`Employee ${newStatus ? 'activated' : 'deactivated'}`);
            fetchData();
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    const filteredEmployees = employees.filter(e => 
        e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const departmentsList = [
        { name: "Design", members: employees.filter(e => e.dept === "Design").length },
        { name: "Engineering", members: employees.filter(e => e.dept === "Engineering").length },
        { name: "Management", members: employees.filter(e => e.dept === "Management").length },
        { name: "Marketing", members: employees.filter(e => e.dept === "Marketing").length },
        { name: "Quality Assurance", members: employees.filter(e => e.dept === "Quality Assurance").length },
    ];


    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Employees" />
                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
                    
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Employees</h1>
                            <p className="text-sm font-medium text-slate-500 mt-1">Manage {stats.total} total team members across all departments</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button onClick={() => setIsDepartmentsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:text-blue-600 transition shadow-sm text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                Departments
                            </button>
                            <button onClick={() => setIsAddEmployeeModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-200 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                Add Employee
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Total Employees", value: stats.total, color: "text-blue-500", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
                            { label: "Active", value: stats.active, color: "text-emerald-500", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
                            { label: "With Overdue", value: stats.withOverdue, color: "text-amber-500", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                            { label: "Inactive", value: stats.inactive, color: "text-slate-400", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" }
                        ].map((stat, i) => (
                            <Card key={i} className="flex items-center gap-4 hover:border-blue-200 transition-colors cursor-default">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color.replace('text-', 'bg-').replace('500', '50').replace('400', '100')} ${stat.color}`}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon}/></svg>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold tracking-tight text-slate-800">{stat.value}</h4>
                                    <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Toolbar (Search & Filter) */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60">
                        <div className="relative w-full sm:w-80 ml-1">
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition text-sm font-medium placeholder-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-3 top-2.5 text-slate-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto mr-1">
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl transition text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                                Filter
                            </button>
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl transition text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Employee List (Card-Table Hybrid) */}
                    <div className="space-y-3">
                        {loading ? (
                             <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <h3 className="text-lg font-bold text-slate-700">Loading employees...</h3>
                            </div>
                        ) : filteredEmployees.length > 0 ? filteredEmployees.map((emp, i) => (
                            <div key={i} onClick={() => setSelectedEmployee(emp)} className="group bg-white rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-center gap-6 lg:gap-8 border border-slate-200/60 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 cursor-pointer">
                                {/* Left: Avatar, Name, Role */}
                                <div className="flex items-center gap-4 w-full lg:w-1/3">
                                    <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm
                                        ${emp.status === 'Inactive' ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700'}
                                    `}>
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className="text-base font-bold text-slate-800 truncate">{emp.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate">{emp.role}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle: Dept, Lead, Email */}
                                <div className="flex flex-col gap-1 w-full lg:w-1/3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-8">
                                    <div className="flex items-center gap-2 text-sm">
                                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                        <span className="text-slate-700 font-medium">{emp.dept}</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-500 truncate">Lead: {emp.lead}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm mt-1">
                                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                        <span className="text-slate-500 truncate">{emp.email}</span>
                                    </div>
                                </div>

                                {/* Right: Tasks, Status, Actions */}
                                <div className="flex items-center justify-between w-full lg:w-1/3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-8">
                                    <div className="flex gap-4 items-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasks</span>
                                            <div className="flex items-baseline gap-1 mt-0.5">
                                                <span className="text-sm font-bold text-slate-800">{emp.tasks.done}</span>
                                                <span className="text-xs text-slate-400">/{emp.tasks.total}</span>
                                            </div>
                                        </div>
                                        {emp.tasks.overdue > 0 && (
                                            <div className="flex flex-col items-center pl-4 border-l border-slate-100">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Overdue</span>
                                                <span className="text-sm font-bold text-red-600 mt-0.5">{emp.tasks.overdue}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => handleStatusToggle(emp)}
                                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                                                emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' :
                                                emp.status === 'Overdue' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' :
                                                'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {emp.status}
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                                <svg className="w-12 h-12 text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <h3 className="text-lg font-bold text-slate-700">No employees found</h3>
                                <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Manage Departments Modal */}
            {isDepartmentsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden flex flex-col transform transition-all">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Manage Departments</h2>
                            <button onClick={() => setIsDepartmentsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="flex gap-2">
                                <input type="text" placeholder="New department" className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm placeholder-slate-400" />
                                <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2.5 mt-5 max-h-[300px] overflow-y-auto">
                                {departmentsList.map((dept, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 text-sm">{dept.name}</span>
                                            <span className="text-[13px] text-slate-400 font-medium">{dept.members} member{dept.members !== 1 && 's'}</span>
                                        </div>
                                        {dept.members === 0 ? (
                                            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors border border-red-100">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg">In use</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                            <button onClick={() => setIsDepartmentsModalOpen(false)} className="px-5 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition text-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Employee Modal */}
            {isAddEmployeeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Add Employee</h2>
                            <button onClick={() => { setIsAddEmployeeModalOpen(false); setSubmitted(false); }} className="text-slate-400 hover:text-slate-600 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <form id="addEmployeeForm" onSubmit={handleAddEmployee} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Full Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newEmployee.name}
                                        onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                                        className={`w-full px-3 py-2 bg-white border ${submitted && !newEmployee.name ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all`} 
                                    />
                                    {submitted && !newEmployee.name && (
                                        <p className="text-red-500 text-[11px] font-semibold mt-1 animate-in fade-in slide-in-from-top-1">Name is required!</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Email *</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={newEmployee.email}
                                        onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                                        className={`w-full px-3 py-2 bg-white border ${submitted && !newEmployee.email ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all`} 
                                    />
                                    {submitted && !newEmployee.email && (
                                        <p className="text-red-500 text-[11px] font-semibold mt-1 animate-in fade-in slide-in-from-top-1">Email is required!</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Role</label>
                                    <select 
                                        value={newEmployee.role}
                                        onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer"
                                    >
                                        <option value="developer">Developer</option>
                                        <option value="TL">Team Lead</option>
                                        <option value="qa">QA</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Password *</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={newEmployee.password}
                                        onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                                        className={`w-full px-3 py-2 bg-white border ${submitted && !newEmployee.password ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all`} 
                                    />
                                    {submitted && !newEmployee.password && (
                                        <p className="text-red-500 text-[11px] font-semibold mt-1 animate-in fade-in slide-in-from-top-1">Password is required!</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Department</label>
                                    <select 
                                        value={newEmployee.department}
                                        onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer"
                                    >
                                        <option value="Engineering">Engineering</option>
                                        <option value="Design">Design</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="QA">QA</option>
                                        <option value="Management">Management</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Team Lead</label>
                                    <select 
                                        value={newEmployee.teamLead}
                                        onChange={(e) => setNewEmployee({...newEmployee, teamLead: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer"
                                    >
                                        <option value="">—</option>
                                        {teamLeads.map(tl => (
                                            <option key={tl.id} value={tl.id}>{tl.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button onClick={() => { setIsAddEmployeeModalOpen(false); setSubmitted(false); }} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition text-sm">
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                form="addEmployeeForm"
                                disabled={isCreating}
                                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                            >
                                {isCreating ? "Creating..." : "Create Employee"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Employee Detail Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setSelectedEmployee(null)}>
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[750px] max-h-[95vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 border border-slate-200" onClick={e => e.stopPropagation()}>
                        
                        {/* Header Section */}
                        <div className="p-8 pb-4 flex items-start justify-between border-b border-slate-100">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[18px] bg-white border-2 border-blue-500 p-0.5 shadow-sm flex items-center justify-center">
                                    <div className="w-full h-full rounded-[14px] bg-blue-50 flex items-center justify-center text-2xl font-bold text-blue-600 uppercase">
                                        {selectedEmployee.name.charAt(0)}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedEmployee.name}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                            <Laptop className="w-3 h-3" /> {selectedEmployee.role}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-[10px] flex items-center gap-1.5">
                                            <Building className="w-3 h-3 text-slate-400" /> {selectedEmployee.dept}
                                        </span>
                                        <span className={`text-[11px] font-bold px-3 py-1 rounded-[10px] border flex items-center gap-1.5 ${
                                            selectedEmployee.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            selectedEmployee.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}>
                                            {selectedEmployee.status === 'Active' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {selectedEmployee.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedEmployee(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-8 pt-6">
                            
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-[20px] transition-all hover:bg-white hover:shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Mail className="w-3 h-3" /> Email
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">{selectedEmployee.email}</p>
                                </div>
                                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-[20px] transition-all hover:bg-white hover:shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <User className="w-3 h-3" /> Team Lead
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">{selectedEmployee.lead}</p>
                                </div>
                                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-[20px] transition-all hover:bg-white hover:shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Building className="w-3 h-3" /> Department
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">{selectedEmployee.dept}</p>
                                </div>
                                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-[20px] transition-all hover:bg-white hover:shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" /> Joined
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">{selectedEmployee.joinedDate}</p>
                                </div>
                            </div>

                            {/* Stats Boxes */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[22px] text-center group hover:bg-blue-50 transition-colors">
                                    <p className="text-3xl font-black text-blue-600 leading-none mb-2">{selectedEmployee.tasks.total}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                                </div>
                                <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-[22px] text-center group hover:bg-emerald-50 transition-colors">
                                    <p className="text-3xl font-black text-emerald-600 leading-none mb-2">{selectedEmployee.tasks.done}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Done</p>
                                </div>
                                <div className="p-6 bg-rose-50/50 border border-rose-100 rounded-[22px] text-center group hover:bg-rose-50 transition-colors">
                                    <p className="text-3xl font-black text-rose-600 leading-none mb-2">{selectedEmployee.tasks.overdue}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overdue</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out" 
                                        style={{ width: `${(selectedEmployee.tasks.done / (selectedEmployee.tasks.total || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Tasks Table */}
                            <div className="space-y-4">
                                <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2.5 px-1">
                                    <ClipboardList className="w-4 h-4 text-slate-400" /> Tasks ({selectedEmployee.tasks.total})
                                </h3>
                                <div className="border border-slate-100 rounded-[20px] overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4">Task</th>
                                                <th className="px-6 py-4">Project</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Deadline</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {selectedEmployee.tasks.list?.length > 0 ? selectedEmployee.tasks.list.map((task, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-700 text-sm">{task.taskName}</td>
                                                    <td className="px-6 py-4 text-slate-500 text-[13px] font-medium">{task.project?.projectName || task.project?.name || 'Unassigned'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-[8px] uppercase tracking-wider ${
                                                            task.status === 'Completed' || task.status === 'Done' ? 'bg-emerald-50 text-emerald-600' :
                                                            task.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={`text-[13px] font-bold flex items-center gap-1.5 ${
                                                            task.endDate && new Date(task.endDate) < new Date() && !['Completed', 'Done'].includes(task.status) ? 'text-rose-500' : 'text-slate-400'
                                                        }`}>
                                                            {task.endDate && new Date(task.endDate) < new Date() && !['Completed', 'Done'].includes(task.status) && <AlertCircle className="w-3.5 h-3.5" />}
                                                            {task.endDate ? new Date(task.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : 'N/A'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic text-sm">No tasks assigned yet</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Activity History */}
                            <div className="space-y-4 pt-2">
                                <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2.5 px-1">
                                    <History className="w-4 h-4 text-slate-400" /> Activity History
                                </h3>
                                <div className="p-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-[24px] text-center">
                                    <p className="text-sm font-semibold text-slate-400">No activity history recorded</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-slate-100 flex justify-end bg-white">
                            <button onClick={() => setSelectedEmployee(null)} className="px-10 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all text-sm shadow-sm active:scale-95">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeesDashboard;