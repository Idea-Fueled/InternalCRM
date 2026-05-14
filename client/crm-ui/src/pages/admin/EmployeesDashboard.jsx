import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { userService, taskService, authService, departmentService } from "../../api/services";
import { toast } from "sonner";
import { 
    Mail, User, Building, Calendar, Laptop, CheckCircle, 
    AlertCircle, ClipboardList, History, X, Download, Camera 
} from "lucide-react";
import { exportPDF } from "../../utils/pdfExport";

// Reusable Card Component
const Card = ({ children, className = "" }) => (
    <div className={`premium-card ${className}`}>
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
    const [roleFilter, setRoleFilter] = useState("All Roles");
    const [isCreating, setIsCreating] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [teamLeads, setTeamLeads] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [newDeptName, setNewDeptName] = useState("");
    const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchDepartments = async () => {
        try {
            const res = await departmentService.getAllDepartments();
            if (res.data?.success) setDepartments(res.data.departments);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    };

    const handleAddDepartment = async () => {
        if (!newDeptName.trim()) return;
        try {
            setIsDeptLoading(true);
            const res = await departmentService.createDepartment({ name: newDeptName.trim() });
            if (res.data?.success) {
                toast.success("Department added");
                setNewDeptName("");
                fetchDepartments();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add department");
        } finally {
            setIsDeptLoading(false);
        }
    };

    const handleDeleteDepartment = async (id) => {
        try {
            await departmentService.deleteDepartment(id);
            toast.success("Department deleted");
            fetchDepartments();
        } catch (error) {
            toast.error("Failed to delete department");
        }
    };

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
        fetchDepartments();
    }, []);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setSubmitted(true);

        if (!newEmployee.name || !newEmployee.email || !newEmployee.password) {
            return;
        }

        try {
            setIsCreating(true);
            const formData = new FormData();
            formData.append('name', newEmployee.name);
            formData.append('email', newEmployee.email);
            formData.append('password', newEmployee.password);
            formData.append('role', newEmployee.role);
            formData.append('department', newEmployee.department);
            formData.append('teamLead', newEmployee.teamLead);
            if (newEmployee.profilePic) {
                formData.append('profilePic', newEmployee.profilePic);
            }

            await authService.register(formData);
            toast.success("Employee added successfully");
            setIsAddEmployeeModalOpen(false);
            setSubmitted(false);
            setNewEmployee({
                name: "",
                email: "",
                password: "",
                role: "developer",
                department: "Engineering",
                teamLead: "",
                profilePic: null
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to add employee");
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditEmployee = (emp, e) => {
        if (e) e.stopPropagation();
        setEditingEmployee(emp.raw);
        setNewEmployee({
            name: emp.name,
            email: emp.email,
            password: "",
            role: emp.role,
            department: emp.dept,
            teamLead: emp.raw.teamLead?._id || emp.raw.teamLead || "",
            profilePic: null
        });
        setIsEditEmployeeModalOpen(true);
    };

    const handleUpdateEmployee = async (e) => {
        e.preventDefault();
        if (!editingEmployee) return;
        setSubmitted(true);

        if (!newEmployee.name || !newEmployee.email) {
            return;
        }

        try {
            setIsCreating(true);
            const formData = new FormData();
            formData.append('name', newEmployee.name);
            formData.append('email', newEmployee.email);
            if (newEmployee.password) formData.append('password', newEmployee.password);
            formData.append('role', newEmployee.role);
            formData.append('department', newEmployee.department);
            formData.append('teamLead', newEmployee.teamLead);
            if (newEmployee.profilePic) {
                formData.append('profilePic', newEmployee.profilePic);
            }
            
            await userService.updateUser(editingEmployee._id, formData);
            toast.success("Employee updated successfully");
            setIsEditEmployeeModalOpen(false);
            setEditingEmployee(null);
            setSubmitted(false);
            setNewEmployee({
                name: "",
                email: "",
                password: "",
                role: "developer",
                department: "Engineering",
                teamLead: "",
                profilePic: null
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update employee");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteEmployee = async (empId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) return;
        
        try {
            setIsDeleting(true);
            await userService.deleteUser(empId);
            toast.success("Employee deleted successfully");
            fetchData();
        } catch (err) {
            toast.error("Failed to delete employee");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStatusToggle = async (emp, e) => {
        if (e) e.stopPropagation();
        try {
            const newStatus = !emp.raw.isActive;
            await userService.updateUser(emp.id, { isActive: newStatus });
            toast.success(`Employee ${newStatus ? 'activated' : 'deactivated'}`);
            fetchData();
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    const filteredEmployees = employees.filter(e => {
        const matchesSearch = e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             e.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "All Roles" || e.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleExport = () => {
        const columns = ["Name", "Role", "Department", "Lead", "Tasks (Done/Total)", "Status"];
        const data = filteredEmployees.map(e => [
            e.name,
            e.role,
            e.dept,
            e.lead,
            `${e.tasks.done}/${e.tasks.total}`,
            e.status
        ]);
        exportPDF({
            title: "Employee Directory & Performance",
            filename: `employees_report_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    const departmentsList = departments.map(d => ({
        id: d._id,
        name: d.name,
        members: employees.filter(e => e.dept === d.name).length
    }));


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
                            { label: "Total Employees", value: stats.total, color: "text-blue-500", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", variant: "blue" },
                            { label: "Active", value: stats.active, color: "text-emerald-500", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", variant: "emerald" },
                            { label: "With Overdue", value: stats.withOverdue, color: "text-amber-500", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", variant: "amber" },
                            { label: "Inactive", value: stats.inactive, color: "text-slate-400", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636", variant: "slate" }
                        ].map((stat, i) => (
                            <div key={i} className={`premium-stat-card ${stat.variant} flex flex-row items-center gap-4 p-4 cursor-default h-[90px]`}>
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${stat.color.replace('text-', 'bg-').replace('500', '100').replace('400', '200')} ${stat.color}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon}/></svg>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h4 className="text-2xl font-bold tracking-tight text-slate-800 leading-none mb-1">{stat.value}</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
                                </div>
                            </div>
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
                            <select 
                                className="px-4 py-2 bg-slate-50 border-none text-slate-600 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer appearance-none"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="All Roles">Filter: All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="developer">Developer</option>
                                <option value="qa">QA</option>
                                <option value="TL">Team Lead</option>
                            </select>
                             <button 
                                onClick={handleExport}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl transition text-sm"
                            >
                                <Download className="w-4 h-4" />
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
                                    <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm overflow-hidden
                                        ${emp.status === 'Inactive' ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700'}
                                    `}>
                                        {emp.raw.profilePic ? (
                                            <img src={emp.raw.profilePic} alt={emp.name} className="w-full h-full object-cover" />
                                        ) : (
                                            emp.name.charAt(0)
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className="text-base font-bold text-slate-800 truncate">{emp.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate capitalize">{emp.role === 'TL' ? 'Team Lead' : emp.role}</span>
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
                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={(e) => handleEditEmployee(emp, e)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Employee"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteEmployee(emp.id, e)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Employee"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        </div>
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
                                <input 
                                    type="text" 
                                    placeholder="New department" 
                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm placeholder-slate-400" 
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
                                />
                                <button 
                                    onClick={handleAddDepartment}
                                    disabled={isDeptLoading || !newDeptName.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2.5 mt-5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {departmentsList.length > 0 ? departmentsList.map((dept, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 text-sm">{dept.name}</span>
                                            <span className="text-[13px] text-slate-400 font-medium">{dept.members} member{dept.members !== 1 && 's'}</span>
                                        </div>
                                        {dept.members === 0 ? (
                                            <button 
                                                onClick={() => handleDeleteDepartment(dept.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors border border-red-100"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg">In use</span>
                                        )}
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-slate-400 text-sm font-medium">No departments yet.</div>
                                )}
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
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept._id} value={dept.name}>{dept.name}</option>
                                        ))}
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
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Profile Picture</label>
                                    <div className="flex items-center gap-4 p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                                            {newEmployee.profilePic ? (
                                                <img src={URL.createObjectURL(newEmployee.profilePic)} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={(e) => setNewEmployee({...newEmployee, profilePic: e.target.files[0]})}
                                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Recommended: Square image, max 5MB</p>
                                        </div>
                                    </div>
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4" onClick={() => setSelectedEmployee(null)}>
                    <div className="bg-white rounded-[20px] shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100" onClick={e => e.stopPropagation()}>
                        
                        {/* Compact Header */}
                        <div className="px-6 py-5 flex items-start justify-between border-b border-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[14px] bg-white border border-blue-200 p-0.5 shadow-sm flex items-center justify-center overflow-hidden">
                                    <div className="w-full h-full rounded-[10px] bg-blue-50 flex items-center justify-center text-xl font-bold text-blue-600 uppercase overflow-hidden">
                                        {selectedEmployee.raw.profilePic ? (
                                            <img src={selectedEmployee.raw.profilePic} alt={selectedEmployee.name} className="w-full h-full object-cover" />
                                        ) : (
                                            selectedEmployee.name.charAt(0)
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 leading-none">{selectedEmployee.name}</h2>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-[6px] uppercase tracking-wider">{selectedEmployee.role}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] flex items-center gap-1 ${
                                            selectedEmployee.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                                            selectedEmployee.status === 'Overdue' ? 'bg-rose-50 text-rose-600' :
                                            'bg-slate-50 text-slate-500'
                                        }`}>
                                            <div className={`w-1 h-1 rounded-full ${
                                                selectedEmployee.status === 'Active' ? 'bg-emerald-500' :
                                                selectedEmployee.status === 'Overdue' ? 'bg-rose-500' : 'bg-slate-400'
                                            }`}></div>
                                            {selectedEmployee.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedEmployee(null)} className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-6 pt-5">
                            
                            {/* Compact Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-[12px]">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                                    <p className="text-[12px] font-semibold text-slate-600 truncate">{selectedEmployee.email}</p>
                                </div>
                                <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-[12px]">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Team Lead</p>
                                    <p className="text-[12px] font-semibold text-slate-600 truncate">{selectedEmployee.lead}</p>
                                </div>
                                <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-[12px]">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Department</p>
                                    <p className="text-[12px] font-semibold text-slate-600 truncate">{selectedEmployee.dept}</p>
                                </div>
                                <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-[12px]">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Joined</p>
                                    <p className="text-[12px] font-semibold text-slate-600 truncate">{selectedEmployee.joinedDate}</p>
                                </div>
                            </div>

                            {/* Quick Stats Grid - Improved Spacing */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="premium-stat-card blue !p-4 flex flex-col items-center justify-center min-h-[85px]">
                                    <span className="text-xl font-black text-blue-600 leading-none">{selectedEmployee.tasks.total}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-2">Total Tasks</span>
                                </div>
                                <div className="premium-stat-card emerald !p-4 flex flex-col items-center justify-center min-h-[85px]">
                                    <span className="text-xl font-black text-emerald-600 leading-none">{selectedEmployee.tasks.done}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-2">Completed</span>
                                </div>
                                <div className="premium-stat-card rose !p-4 flex flex-col items-center justify-center min-h-[85px]">
                                    <span className="text-xl font-black text-rose-600 leading-none">{selectedEmployee.tasks.overdue}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-2">Overdue</span>
                                </div>
                            </div>

                            {/* Tasks Section */}
                            <div className="space-y-3">
                                <h3 className="text-[12px] font-bold text-slate-700 flex items-center gap-2">
                                    <ClipboardList className="w-3.5 h-3.5 text-slate-400" /> Recent Tasks
                                </h3>
                                <div className="space-y-2">
                                    {selectedEmployee.tasks.list?.length > 0 ? selectedEmployee.tasks.list.slice(0, 5).map((task, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-[12px] hover:border-blue-100 transition-colors shadow-sm">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-bold text-slate-700 truncate">{task.taskName}</p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">{task.project?.projectName || 'Internal'}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                    task.status === 'Completed' || task.status === 'Done' ? 'bg-emerald-50 text-emerald-600' :
                                                    task.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {task.status}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-300">
                                                    {task.endDate ? new Date(task.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-6 text-center bg-slate-50/50 rounded-[12px] border border-dashed border-slate-200">
                                            <p className="text-[12px] text-slate-400 font-medium">No tasks assigned</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* History Placeholder */}
                            <div className="pt-2">
                                <div className="p-4 bg-slate-50/30 border border-dashed border-slate-200 rounded-[12px] text-center">
                                    <p className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-2">
                                        <History className="w-3 h-3" /> No recent activity
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Minimal Footer */}
                        <div className="px-6 py-4 border-t border-slate-50 flex justify-end bg-white">
                            <button onClick={() => setSelectedEmployee(null)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all text-[12px] active:scale-95 shadow-lg shadow-slate-200">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Employee Modal */}
            {isEditEmployeeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Edit Employee</h2>
                            <button onClick={() => { setIsEditEmployeeModalOpen(false); setSubmitted(false); }} className="text-slate-400 hover:text-slate-600 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <form id="editEmployeeForm" onSubmit={handleUpdateEmployee} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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
                                    <label className="text-sm font-bold text-slate-700">Password <span className="text-slate-400 font-normal text-[10px]">(Leave blank to keep current)</span></label>
                                    <input 
                                        type="password" 
                                        value={newEmployee.password}
                                        onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Department</label>
                                    <select 
                                        value={newEmployee.department}
                                        onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept._id} value={dept.name}>{dept.name}</option>
                                        ))}
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
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Update Profile Picture</label>
                                    <div className="flex items-center gap-4 p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                                            {newEmployee.profilePic ? (
                                                <img src={URL.createObjectURL(newEmployee.profilePic)} alt="Preview" className="w-full h-full object-cover" />
                                            ) : editingEmployee?.profilePic ? (
                                                <img src={editingEmployee.profilePic} alt="Current" className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={(e) => setNewEmployee({...newEmployee, profilePic: e.target.files[0]})}
                                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Recommended: Square image, max 5MB</p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button onClick={() => { setIsEditEmployeeModalOpen(false); setSubmitted(false); }} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition text-sm">
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                form="editEmployeeForm"
                                disabled={isCreating}
                                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                            >
                                {isCreating ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeesDashboard;