import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { userService, taskService, authService, departmentService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import usePermission from "../../hooks/usePermission";
import { toast } from "sonner";
import { 
    Mail, User, Building, Calendar, Laptop, CheckCircle, 
    AlertCircle, ClipboardList, History, X, Download, Camera, Trash2, ShieldCheck, KeyRound, Eye, EyeOff, ShieldAlert
} from "lucide-react";
import { exportPDF } from "../../utils/pdfExport";
import StatDetailModal from "../../components/StatDetailModal";

const getInactivityDaysLeft = (inactiveUntil) => {
    if (!inactiveUntil) return "Indefinite";
    const diffTime = new Date(inactiveUntil) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days remaining` : "Reactivating...";
};

// All permissions the admin can assign
const ALL_PERMISSIONS = [
    { key: 'users.create',    label: 'Create Users',    group: 'Users' },
    { key: 'users.update',    label: 'Edit Users',      group: 'Users' },
    { key: 'users.delete',    label: 'Delete Users',    group: 'Users' },
    { key: 'projects.create', label: 'Create Projects', group: 'Projects' },
    { key: 'projects.update', label: 'Edit Projects',   group: 'Projects' },
    { key: 'projects.delete', label: 'Delete Projects', group: 'Projects' },
    { key: 'tasks.create',    label: 'Create Tasks',    group: 'Tasks' },
    { key: 'tasks.update',    label: 'Edit Tasks',      group: 'Tasks' },
    { key: 'tasks.delete',    label: 'Delete Tasks',    group: 'Tasks' },
    { key: 'reports.view',    label: 'View Reports',    group: 'Reports' },
    { key: 'trash.view',      label: 'View Trash',      group: 'Reports' },
];

const DEFAULT_ROLE_PERMISSIONS = {
    admin:     ALL_PERMISSIONS.map(p => p.key),
    TL:        ['tasks.create', 'tasks.update', 'projects.update', 'users.update'],
    developer: ['tasks.update'],
    qa:        ['tasks.update'],
};

const PermissionGroups = ({ permissions, onChange }) => {
    const groups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];
    return (
        <div className="space-y-4">
            {groups.map(group => (
                <div key={group}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{group}</p>
                    <div className="grid grid-cols-2 gap-2">
                        {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => (
                            <label key={perm.key} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={permissions.includes(perm.key)}
                                    onChange={() => {
                                        if (permissions.includes(perm.key)) {
                                            onChange(permissions.filter(p => p !== perm.key));
                                        } else {
                                            onChange([...permissions, perm.key]);
                                        }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{perm.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Reusable Card Component
const Card = ({ children, className = "" }) => (
    <div className={`premium-card ${className}`}>
        {children}
    </div>
);

const EmployeesDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { can } = usePermission();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, withOverdue: 0, inactive: 0 });
    const [roleFilter, setRoleFilter] = useState("All Roles");
    const [viewMode, setViewMode] = useState("list"); // 'list' | 'grid'
    
    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });

    const handleTaskClick = (taskId) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('taskId', taskId);
        nextParams.delete('projectId');
        setSearchParams(nextParams, { replace: true });
        setSelectedEmployee(null); // Close employee modal
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
    const [isDepartmentsModalOpen, setIsDepartmentsModalOpen] = useState(false);
    const [roleSelectValue, setRoleSelectValue] = useState("custom");
    const [customRoleText, setCustomRoleText] = useState("");

    const [newEmployee, setNewEmployee] = useState({
        name: "",
        email: "",
        password: "",
        role: "Web Developer",
        department: "Engineering",
        teamLeads: [],
        permissions: DEFAULT_ROLE_PERMISSIONS['developer']
    });

    const openAddEmployeeModal = () => {
        setRoleSelectValue("custom");
        setCustomRoleText("");
        setNewEmployee({
            name: "",
            email: "",
            password: "",
            role: "Web Developer",
            department: "Engineering",
            teamLeads: [],
            permissions: DEFAULT_ROLE_PERMISSIONS['developer'],
            profilePic: null
        });
        setIsAddEmployeeModalOpen(true);
    };
    const [isCreating, setIsCreating] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showAddEmployeePwd, setShowAddEmployeePwd] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [teamLeads, setTeamLeads] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [newDeptName, setNewDeptName] = useState("");
    const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeptLoading, setIsDeptLoading] = useState(false);

    // ─── Change Password Modal State ───────────────────────────────────────────
    const [isChangePwdModalOpen, setIsChangePwdModalOpen] = useState(false);
    const [changePwdEmployeeId, setChangePwdEmployeeId] = useState(null);
    const [changePwdEmployeeName, setChangePwdEmployeeName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [isChangingPwd, setIsChangingPwd] = useState(false);
    const [pwdSubmitted, setPwdSubmitted] = useState(false);

    // Inactive Employee Modal state declarations
    const [isInactiveModalOpen, setIsInactiveModalOpen] = useState(false);
    const [inactiveEmployee, setInactiveEmployee] = useState(null);
    const [inactiveReason, setInactiveReason] = useState("");
    const [inactiveDays, setInactiveDays] = useState("");
    const [isSubmittingInactive, setIsSubmittingInactive] = useState(false);

    // Reactivate Confirmation Modal state declarations
    const [isActivateConfirmOpen, setIsActivateConfirmOpen] = useState(false);
    const [employeeToActivate, setEmployeeToActivate] = useState(null);
    const [isSubmittingActivate, setIsSubmittingActivate] = useState(false);

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
                        lead: u.teamLeads?.map(tl => tl.name).join(", ") || "N/A",
                        tasks: { total: userTasks.length, done, overdue, list: userTasks },
                        status: u.status === "inactive" ? "Inactive" : (overdue > 0 ? "Overdue" : "Active"),
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

        if (!newEmployee.name || !newEmployee.email || (roleSelectValue === "custom" && !customRoleText.trim())) {
            return;
        }

        try {
            setIsCreating(true);
            const formData = new FormData();
            formData.append('name', newEmployee.name);
            formData.append('email', newEmployee.email);
            if (newEmployee.password) {
                formData.append('password', newEmployee.password);
            }
            formData.append('role', newEmployee.role);
            formData.append('department', newEmployee.department);
            // Append each team lead ID
            if (newEmployee.teamLeads && newEmployee.teamLeads.length > 0) {
                newEmployee.teamLeads.forEach(id => formData.append('teamLeads[]', id));
            }
            if (newEmployee.profilePic) {
                formData.append('profilePic', newEmployee.profilePic);
            }
            // Append permissions
            (newEmployee.permissions || []).forEach(p => formData.append('permissions[]', p));

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
                teamLeads: [],
                permissions: DEFAULT_ROLE_PERMISSIONS['developer'],
                profilePic: null
            });
            fetchData();
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Failed to add employee";
            toast.error(errorMsg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditEmployee = (emp, e) => {
        if (e) e.stopPropagation();
        setEditingEmployee(emp.raw);
        
        const isSystemRole = ["admin", "TL", "qa"].includes(emp.role);
        setRoleSelectValue(isSystemRole ? emp.role : "custom");
        setCustomRoleText(isSystemRole ? "" : emp.role);

        setNewEmployee({
            name: emp.name,
            email: emp.email,
            role: emp.role,
            department: emp.dept,
            teamLeads: emp.raw.teamLeads?.map(tl => tl._id || tl) || [],
            permissions: emp.raw.permissions?.length > 0 ? emp.raw.permissions : (DEFAULT_ROLE_PERMISSIONS[emp.role] || []),
            profilePic: null
        });
        setIsEditEmployeeModalOpen(true);
    };

    const handleUpdateEmployee = async (e) => {
        e.preventDefault();
        if (!editingEmployee) return;
        setSubmitted(true);

        if (!newEmployee.name || !newEmployee.email || (roleSelectValue === "custom" && !customRoleText.trim())) {
            return;
        }

        try {
            setIsCreating(true);
            const formData = new FormData();
            formData.append('name', newEmployee.name);
            formData.append('email', newEmployee.email);
            // NOTE: Password is intentionally NOT sent here — use the Change Password modal
            formData.append('role', newEmployee.role);
            formData.append('department', newEmployee.department);
            // Append each team lead ID
            if (newEmployee.teamLeads && newEmployee.teamLeads.length > 0) {
                newEmployee.teamLeads.forEach(id => formData.append('teamLeads[]', id));
            } else {
                formData.append('teamLeads', []); // Send empty array if none selected
            }
            if (newEmployee.profilePic) {
                formData.append('profilePic', newEmployee.profilePic);
            }
            // Append permissions
            (newEmployee.permissions || []).forEach(p => formData.append('permissions[]', p));
            
            await userService.updateUser(editingEmployee._id, formData);
            toast.success("Employee updated successfully");
            setIsEditEmployeeModalOpen(false);
            setEditingEmployee(null);
            setSubmitted(false);
            setNewEmployee({
                name: "",
                email: "",
                role: "developer",
                department: "Engineering",
                teamLeads: [],
                permissions: DEFAULT_ROLE_PERMISSIONS['developer'],
                profilePic: null
            });
            fetchData();
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Failed to update employee";
            toast.error(errorMsg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteEmployee = (empId, e) => {
        if (e) e.stopPropagation();
        setEmployeeToDelete(empId);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteEmployee = async () => {
        if (!employeeToDelete) return;
        try {
            setIsDeleting(true);
            await userService.deleteUser(employeeToDelete);
            toast.success("Employee moved to trash");
            setIsDeleteModalOpen(false);
            setEmployeeToDelete(null);
            fetchData();
        } catch (err) {
            toast.error("Failed to delete employee");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStatusToggle = async (emp, e) => {
        if (e) e.stopPropagation();
        if (emp.status === "Inactive") {
            setEmployeeToActivate(emp);
            setIsActivateConfirmOpen(true);
        } else {
            setInactiveEmployee(emp);
            setInactiveReason("");
            setInactiveDays("");
            setIsInactiveModalOpen(true);
        }
    };

    const handleConfirmActivate = async () => {
        if (!employeeToActivate) return;
        setIsSubmittingActivate(true);
        try {
            await userService.updateUser(employeeToActivate.id, { status: "free", inactiveUntil: null, inactiveReason: "" });
            toast.success("Employee reactivated successfully");
            setIsActivateConfirmOpen(false);
            setEmployeeToActivate(null);
            fetchData();
        } catch (err) {
            toast.error("Failed to reactivate employee");
        } finally {
            setIsSubmittingActivate(false);
        }
    };

    const handleConfirmInactive = async (e) => {
        e.preventDefault();
        if (!inactiveEmployee) return;
        setIsSubmittingInactive(true);
        try {
            const days = parseInt(inactiveDays, 10);
            const inactiveUntil = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
            await userService.updateUser(inactiveEmployee.id, {
                status: "inactive",
                inactiveReason: inactiveReason.trim(),
                inactiveUntil
            });
            toast.success("Employee marked as inactive");
            setIsInactiveModalOpen(false);
            setInactiveEmployee(null);
            setInactiveReason("");
            setInactiveDays("");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to mark employee as inactive");
        } finally {
            setIsSubmittingInactive(false);
        }
    };

    // ─── Password Strength Helper ──────────────────────────────────────────────
    const getPwdStrength = (pwd) => {
        if (!pwd) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 6)  score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        const map = [
            { label: 'Very Weak', color: 'bg-red-500',    text: 'text-red-500'    },
            { label: 'Weak',      color: 'bg-orange-400',  text: 'text-orange-500' },
            { label: 'Fair',      color: 'bg-yellow-400',  text: 'text-yellow-600' },
            { label: 'Good',      color: 'bg-blue-500',    text: 'text-blue-600'   },
            { label: 'Strong',    color: 'bg-emerald-500', text: 'text-emerald-600'},
            { label: 'Very Strong', color: 'bg-emerald-600', text: 'text-emerald-700'},
        ];
        return { score, ...map[score] };
    };

    const openChangePwdModal = (empId, empName, e) => {
        if (e) e.stopPropagation();
        setChangePwdEmployeeId(empId);
        setChangePwdEmployeeName(empName);
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPwd(false);
        setShowConfirmPwd(false);
        setPwdSubmitted(false);
        setIsChangePwdModalOpen(true);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdSubmitted(true);
        if (!newPassword || newPassword.length < 6) return;
        if (newPassword !== confirmPassword) return;
        try {
            setIsChangingPwd(true);
            await userService.changeUserPassword(changePwdEmployeeId, newPassword);
            toast.success(`Password updated! ${changePwdEmployeeName} can now login with the new password.`);
            setIsChangePwdModalOpen(false);
            setChangePwdEmployeeId(null);
            setNewPassword('');
            setConfirmPassword('');
            setPwdSubmitted(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setIsChangingPwd(false);
        }
    };

    const filteredEmployees = employees.filter(e => {
        const matchesSearch = e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             e.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "All Roles" || 
                            (roleFilter === "employee" && !["admin", "TL", "qa"].includes(e.role)) ||
                            e.role === roleFilter;
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
                            <h1 className="dashboard-heading">Employees</h1>
                            <p className="dashboard-subheading">Manage {stats.total} total team members across all departments</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button onClick={() => setIsDepartmentsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:text-blue-600 transition shadow-sm text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                Departments
                            </button>
                            {can('users.create') && (
                                <button onClick={openAddEmployeeModal} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-200 text-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                    Add Employee
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Total Employees", value: stats.total, color: "text-blue-500", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", variant: "blue", onClick: () => setStatModal({ isOpen: true, title: "Total Employees", data: employees, type: "employee" }) },
                            { label: "Active", value: stats.active, color: "text-emerald-500", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", variant: "emerald", onClick: () => setStatModal({ isOpen: true, title: "Active Employees", data: employees.filter(e => e.status === "Active" || e.status === "Overdue"), type: "employee" }) },
                            { label: "With Overdue", value: stats.withOverdue, color: "text-amber-500", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", variant: "amber", onClick: () => setStatModal({ isOpen: true, title: "Employees with Overdue Tasks", data: employees.filter(e => e.tasks.overdue > 0), type: "employee" }) },
                            { label: "Inactive", value: stats.inactive, color: "text-slate-400", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636", variant: "slate", onClick: () => setStatModal({ isOpen: true, title: "Inactive Employees", data: employees.filter(e => e.status === "Inactive"), type: "employee" }) }
                        ].map((stat, i) => (
                            <div key={i} onClick={stat.onClick} className={`premium-stat-card ${stat.variant} flex flex-row items-center gap-4 p-4 cursor-pointer hover:scale-[1.02] transition-transform h-[90px]`}>
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.color.replace('text-', 'bg-').replace('500', '100').replace('400', '200')} ${stat.color}`}>
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
                        <div className="flex gap-2 w-full sm:w-auto mr-1 items-center">
                            <select 
                                className="px-4 py-2 bg-slate-50 border-none text-slate-600 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer appearance-none"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="All Roles">Filter: All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="employee">Employee Roles</option>
                                <option value="qa">QA</option>
                                <option value="TL">Team Lead</option>
                            </select>
                            {/* List / Grid toggle */}
                            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
                                <button
                                    onClick={() => setViewMode('list')}
                                    title="List view"
                                    className={`p-1.5 rounded-lg transition-all ${
                                        viewMode === 'list'
                                            ? 'bg-white shadow-sm text-blue-600'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    title="Grid view"
                                    className={`p-1.5 rounded-lg transition-all ${
                                        viewMode === 'grid'
                                            ? 'bg-white shadow-sm text-blue-600'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>
                                </button>
                            </div>
                            <button 
                                onClick={handleExport}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl transition text-sm"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Employee List / Grid */}
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
                        {loading ? (
                             <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center col-span-full">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <h3 className="text-lg font-bold text-slate-700">Loading employees...</h3>
                            </div>
                        ) : filteredEmployees.length > 0 ? filteredEmployees.map((emp, i) => (
                            viewMode === 'grid' ? (
                                <div
                                    key={i}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`group relative rounded-2xl border shadow-sm transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${
                                        emp.status === 'Inactive'
                                            ? 'bg-slate-50 border-slate-200/80 hover:shadow-md'
                                            : 'bg-white border-slate-200/60 hover:shadow-lg hover:border-blue-200'
                                    }`}
                                >
                                    {/* Colour accent top bar */}
                                    <div className={`h-1 w-full ${
                                        emp.status === 'Inactive' ? 'bg-slate-300' :
                                        emp.status === 'Overdue'  ? 'bg-amber-400'  :
                                        'bg-gradient-to-r from-blue-500 to-indigo-500'
                                    }`} />

                                    <div className="p-5 flex flex-col gap-4 flex-1">
                                        {/* Avatar + name row */}
                                        <div className="flex items-start gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm overflow-hidden ${
                                                emp.status === 'Inactive' ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700'
                                            }`}>
                                                {emp.raw.profilePic ? (
                                                    <img src={emp.raw.profilePic} alt={emp.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    emp.name.charAt(0)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className={`text-sm font-bold truncate ${
                                                        emp.status === 'Inactive' ? 'text-slate-500' : 'text-slate-800 group-hover:text-blue-700'
                                                    } transition-colors`}>{emp.name}</h4>
                                                    {emp.status === 'Inactive' && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider shrink-0">Inactive</span>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize mt-0.5 inline-block ${
                                                    emp.status === 'Inactive' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
                                                }`}>{emp.role === 'TL' ? 'Team Lead' : emp.role}</span>
                                            </div>
                                        </div>

                                        {/* Dept + Lead */}
                                        <div className="space-y-1.5 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                                <span className="font-medium text-slate-600 truncate">{emp.dept}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                                <span className="truncate">Lead: <span className="font-semibold text-slate-600">{emp.lead}</span></span>
                                            </div>
                                        </div>

                                        {/* Task stats */}
                                        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Done</span>
                                                <span className="text-sm font-bold text-slate-700">{emp.tasks.done}<span className="text-xs font-normal text-slate-400">/{emp.tasks.total}</span></span>
                                            </div>
                                            {emp.tasks.overdue > 0 && (
                                                <div className="flex flex-col pl-3 border-l border-slate-100">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">Overdue</span>
                                                    <span className="text-sm font-bold text-red-600">{emp.tasks.overdue}</span>
                                                </div>
                                            )}
                                            <div className="ml-auto">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                                    emp.status === 'Active'   ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    emp.status === 'Overdue'  ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>{emp.status}</span>
                                            </div>
                                        </div>

                                        {/* Inactive info */}
                                        {emp.status === 'Inactive' && (
                                            <div className="bg-slate-100/70 rounded-xl px-3 py-2 text-[10px] text-slate-500 space-y-0.5">
                                                <div><span className="font-bold text-slate-600">Reason: </span><span className="italic">{emp.raw.inactiveReason || 'None specified'}</span></div>
                                                <div><span className="font-bold text-slate-600">Until: </span>{emp.raw.inactiveUntil ? new Date(emp.raw.inactiveUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Indefinite'}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions footer */}
                                    <div className="px-5 pb-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); can('users.update') && handleStatusToggle(emp, e); }}
                                            disabled={!can('users.update')}
                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                                                !can('users.update') ? 'cursor-default opacity-60' : 'cursor-pointer'
                                            } ${
                                                emp.status === 'Inactive'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                                    : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                                            }`}
                                        >
                                            {emp.status === 'Inactive' ? 'Reactivate' : 'Mark Inactive'}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {can('users.update') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditEmployee(emp, e); }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                </button>
                                            )}
                                            {can('users.delete') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id, e); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                            <div 
                                key={i} 
                                onClick={() => setSelectedEmployee(emp)} 
                                className={`group rounded-2xl p-4 sm:p-5 flex flex-col border shadow-sm transition-all duration-300 cursor-pointer gap-4 ${
                                    emp.status === 'Inactive' 
                                        ? 'bg-slate-50 border-slate-200/85 hover:shadow-md hover:border-slate-350' 
                                        : 'bg-white border-slate-200/60 hover:shadow-md hover:border-blue-200'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8 w-full">
                                    {/* Left: Avatar, Name, Role */}
                                    <div className="flex items-center gap-4 w-full lg:w-1/3">
                                        <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm overflow-hidden
                                            ${emp.status === 'Inactive' ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700'}
                                        `}>
                                            {emp.raw.profilePic ? (
                                                <img src={emp.raw.profilePic} alt={emp.name} className="w-full h-full object-cover" />
                                            ) : (
                                                emp.name.charAt(0)
                                            )}
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-base font-bold truncate ${emp.status === 'Inactive' ? 'text-slate-500' : 'text-slate-800'}`}>{emp.name}</h4>
                                                {emp.status === 'Inactive' && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider shrink-0">Inactive</span>
                                                )}
                                            </div>
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
                                                onClick={() => can('users.update') && handleStatusToggle(emp)}
                                                disabled={!can('users.update')}
                                                className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                                                    !can('users.update') ? 'cursor-default' : 'hover:bg-emerald-100 cursor-pointer'
                                                } ${
                                                    emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    emp.status === 'Overdue' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                {emp.status}
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                {can('users.update') && (
                                                    <button 
                                                        onClick={(e) => handleStatusToggle(emp, e)}
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            emp.status === "Inactive"
                                                                ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                                : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                        }`}
                                                        title={emp.status === "Inactive" ? "Reactivate Employee" : "Mark Inactive"}
                                                    >
                                                        {emp.status === "Inactive" ? (
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                        )}
                                                    </button>
                                                )}
                                                {can('users.update') && (
                                                    <button 
                                                        onClick={(e) => handleEditEmployee(emp, e)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Employee"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                    </button>
                                                )}
                                                {can('users.delete') && (
                                                    <button 
                                                        onClick={(e) => handleDeleteEmployee(emp.id, e)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Employee"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {emp.status === 'Inactive' && (
                                    <div className="mt-1 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 bg-slate-100/50 p-2.5 rounded-xl border border-slate-200/40">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-bold text-slate-700 shrink-0">Reason:</span>
                                            <span className="truncate italic text-slate-600">{emp.raw.inactiveReason || "None specified"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="font-bold text-slate-700">Duration:</span>
                                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                                                {emp.raw.inactiveUntil ? `${getInactivityDaysLeft(emp.raw.inactiveUntil)} (Until ${new Date(emp.raw.inactiveUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})` : "Indefinite"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            )
                        )) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center col-span-full">
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[440px] max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Add Employee</h2>
                            <button onClick={() => { setIsAddEmployeeModalOpen(false); setSubmitted(false); }} className="text-slate-400 hover:text-slate-600 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <form id="addEmployeeForm" onSubmit={handleAddEmployee} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Full Name *</label>
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
                                    <label className="block text-sm font-bold text-slate-700">Email *</label>
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
                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700">System Role</label>
                                    <select 
                                        value={roleSelectValue}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setRoleSelectValue(val);
                                            if (val !== "custom") {
                                                setNewEmployee({
                                                    ...newEmployee, 
                                                    role: val, 
                                                    permissions: DEFAULT_ROLE_PERMISSIONS[val] || []
                                                });
                                            } else {
                                                setNewEmployee({
                                                    ...newEmployee, 
                                                    role: customRoleText || "Web Developer", 
                                                    permissions: DEFAULT_ROLE_PERMISSIONS['developer']
                                                });
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer"
                                    >
                                        <option value="custom">Custom Employee Role...</option>
                                        <option value="admin">Admin</option>
                                        <option value="TL">Team Lead</option>
                                        <option value="qa">QA</option>
                                    </select>
                                </div>
                                {roleSelectValue === "custom" && (
                                    <div className="space-y-1.5 md:col-span-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <label className="block text-sm font-bold text-slate-700">Custom Role Title *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={customRoleText}
                                            placeholder="e.g. Web Developer, Graphic Designer"
                                            onChange={(e) => {
                                                const txt = e.target.value;
                                                setCustomRoleText(txt);
                                                setNewEmployee({
                                                    ...newEmployee,
                                                    role: txt
                                                });
                                            }}
                                            className={`w-full px-3 py-2 bg-white border ${submitted && !customRoleText ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all`} 
                                        />
                                        {submitted && !customRoleText && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1">Custom Role Title is required!</p>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Password (Optional)</label>
                                    <div className="relative">
                                        <input 
                                            type={showAddEmployeePwd ? "text" : "password"} 
                                            value={newEmployee.password}
                                            onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                                            placeholder="Leave blank to send setup email"
                                            className="w-full px-3 py-2 pr-10 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all placeholder:text-slate-300" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAddEmployeePwd(!showAddEmployeePwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showAddEmployeePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-slate-400 text-[10px] font-medium leading-normal mt-0.5">
                                        If left blank, the employee will receive a welcome email with a secure link to set up their password.
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Department</label>
                                                                    <select 
                                        value={newEmployee.department}
                                        onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept._id} value={dept.name}>{dept.name}</option>
                                        ))}
                                        {newEmployee.department && !departments.some(d => d.name === newEmployee.department) && (
                                            <option value={newEmployee.department}>{newEmployee.department} (Inactive/Legacy)</option>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">Team Leads</label>
                                    <div className="w-full border border-slate-200 rounded-lg p-2 max-h-[120px] overflow-y-auto bg-slate-50/30">
                                        <div className="grid grid-cols-2 gap-2">
                                            {teamLeads.map(tl => (
                                                <label key={tl.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                                                    <input 
                                                        type="checkbox"
                                                        checked={newEmployee.teamLeads.includes(tl.id)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setNewEmployee(prev => ({
                                                                ...prev,
                                                                teamLeads: checked 
                                                                    ? [...prev.teamLeads, tl.id]
                                                                    : prev.teamLeads.filter(id => id !== tl.id)
                                                            }));
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                                    />
                                                    <span className="text-sm font-medium text-slate-600 truncate">{tl.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {teamLeads.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No team leads found</p>}
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                                        <label className="block text-sm font-bold text-slate-700">Permissions & Access Control</label>
                                    </div>
                                    <div className="w-full border border-slate-200 rounded-lg p-4 bg-slate-50/30 max-h-[220px] overflow-y-auto custom-scrollbar">
                                        <PermissionGroups 
                                            permissions={newEmployee.permissions || []} 
                                            onChange={(perms) => setNewEmployee({...newEmployee, permissions: perms})} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">Profile Picture</label>
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 sm:p-8" onClick={() => setSelectedEmployee(null)}>
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[440px] max-h-[82vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100" onClick={e => e.stopPropagation()}>
                        
                        {/* Compact Header */}
                        <div className="relative px-6 py-6 flex flex-col items-center justify-center border-b border-slate-50">
                            <button onClick={() => setSelectedEmployee(null)} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-20 h-20 rounded-full bg-white border border-blue-200 p-1 shadow-sm flex items-center justify-center overflow-hidden mb-3">
                                <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center text-2xl font-bold text-blue-600 uppercase overflow-hidden">
                                    {selectedEmployee.raw.profilePic ? (
                                        <img src={selectedEmployee.raw.profilePic} alt={selectedEmployee.name} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedEmployee.name.charAt(0)
                                    )}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 leading-none text-center">{selectedEmployee.name}</h2>
                            <div className="flex items-center justify-center gap-2 mt-3">
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

                        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-6 pt-5">
                            
                            {selectedEmployee.status === 'Inactive' && (
                                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-2.5 text-xs text-slate-650 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                                        <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">Inactivity Profile</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Reason for Inactivity</span>
                                        <p className="italic text-slate-700 text-xs font-semibold">{selectedEmployee.raw.inactiveReason || "No reason specified"}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Duration</span>
                                        <p className="text-slate-800 font-bold">
                                            {selectedEmployee.raw.inactiveUntil ? `${getInactivityDaysLeft(selectedEmployee.raw.inactiveUntil)} (Until ${new Date(selectedEmployee.raw.inactiveUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})` : "Indefinite"}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Compact Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-[12px]">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                                    <p className="text-[12px] font-semibold text-slate-600 break-all">{selectedEmployee.email}</p>
                                </div>
                                {selectedEmployee.role !== 'admin' && (
                                    <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-[12px]">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Team Lead</p>
                                        <p className="text-[12px] font-semibold text-slate-600 break-words leading-snug">{selectedEmployee.lead}</p>
                                    </div>
                                )}
                                <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-[12px]">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Department</p>
                                    <p className="text-[12px] font-semibold text-slate-600 break-words leading-snug">{selectedEmployee.dept}</p>
                                </div>
                                <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-[12px]">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Joined</p>
                                    <p className="text-[12px] font-semibold text-slate-600 break-words leading-snug">{selectedEmployee.joinedDate}</p>
                                </div>
                            </div>

                            {selectedEmployee.role !== 'admin' && (
                                <>
                                    {/* Detailed Tasks Breakdown */}
                                    <div className="flex flex-col gap-3">
                                        {/* Overdue Tasks */}
                                        <div className="bg-rose-50/30 border border-rose-100 rounded-[16px] overflow-hidden">
                                            <div className="p-4 flex items-center justify-between border-b border-rose-100/50 bg-white/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
                                                        <AlertCircle className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Overdue Tasks</span>
                                                </div>
                                                <span className="text-xl font-black text-rose-600 leading-none">{selectedEmployee.tasks.overdue}</span>
                                            </div>
                                            {selectedEmployee.tasks.overdue > 0 && (
                                                <div className="p-3 bg-rose-50/20 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {selectedEmployee.tasks.list?.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'Completed' && t.status !== 'Done').map((task, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => handleTaskClick(task._id || task.id)}
                                                            className="p-3 bg-white border border-rose-100 rounded-xl shadow-sm flex flex-col gap-1 transition-all hover:border-rose-300 hover:border-l-rose-500 hover:shadow-md cursor-pointer border-l-4 border-l-transparent group"
                                                        >
                                                            <span className="text-sm font-bold text-slate-800 break-words group-hover:text-rose-600 transition-colors">{task.taskName}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide break-words">{task.project?.projectName || 'Internal Project'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Completed Tasks */}
                                        <div className="bg-emerald-50/30 border border-emerald-100 rounded-[16px] overflow-hidden">
                                            <div className="p-4 flex items-center justify-between border-b border-emerald-100/50 bg-white/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Completed Tasks</span>
                                                </div>
                                                <span className="text-xl font-black text-emerald-600 leading-none">{selectedEmployee.tasks.done}</span>
                                            </div>
                                            {selectedEmployee.tasks.done > 0 && (
                                                <div className="p-3 bg-emerald-50/20 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {selectedEmployee.tasks.list?.filter(t => t.status === 'Completed' || t.status === 'Done').map((task, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => handleTaskClick(task._id || task.id)}
                                                            className="p-3 bg-white border border-emerald-100 rounded-xl shadow-sm flex flex-col gap-1 transition-all hover:border-emerald-300 hover:border-l-emerald-500 hover:shadow-md cursor-pointer border-l-4 border-l-transparent group"
                                                        >
                                                            <span className="text-sm font-bold text-slate-800 break-words group-hover:text-emerald-600 transition-colors">{task.taskName}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide break-words">{task.project?.projectName || 'Internal Project'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Total/All Tasks */}
                                        <div className="bg-blue-50/30 border border-blue-100 rounded-[16px] overflow-hidden">
                                            <div className="p-4 flex items-center justify-between border-b border-blue-100/50 bg-white/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                                                        <ClipboardList className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Total Tasks</span>
                                                </div>
                                                <span className="text-xl font-black text-blue-600 leading-none">{selectedEmployee.tasks.total}</span>
                                            </div>
                                            {selectedEmployee.tasks.total > 0 && (
                                                <div className="p-3 bg-blue-50/20 space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                                                    {selectedEmployee.tasks.list?.map((task, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => handleTaskClick(task._id || task.id)}
                                                            className="p-3 bg-white border border-blue-100 rounded-xl shadow-sm flex flex-col gap-1 transition-all hover:border-blue-300 hover:border-l-blue-500 hover:shadow-md cursor-pointer border-l-4 border-l-transparent group"
                                                        >
                                                            <div className="flex justify-between items-start gap-2">
                                                                <span className="text-sm font-bold text-slate-800 break-words flex-1 group-hover:text-blue-600 transition-colors">{task.taskName}</span>
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                                                                    task.status === 'Completed' || task.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                                    task.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 
                                                                    'bg-slate-100 text-slate-500 border border-slate-200'
                                                                }`}>
                                                                    {task.status}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide break-words">{task.project?.projectName || 'Internal Project'}</span>
                                                        </div>
                                                    ))}
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
                                </>
                            )}
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Edit Employee</h2>
                            <button onClick={() => { setIsEditEmployeeModalOpen(false); setSubmitted(false); }} className="text-slate-400 hover:text-slate-600 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <form id="editEmployeeForm" onSubmit={handleUpdateEmployee} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Full Name *</label>
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
                                    <label className="block text-sm font-bold text-slate-700">Email *</label>
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
                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700">System Role</label>
                                    <select 
                                        value={roleSelectValue}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setRoleSelectValue(val);
                                            if (val !== "custom") {
                                                setNewEmployee({
                                                    ...newEmployee, 
                                                    role: val, 
                                                    permissions: DEFAULT_ROLE_PERMISSIONS[val] || []
                                                });
                                            } else {
                                                setNewEmployee({
                                                    ...newEmployee, 
                                                    role: customRoleText || "Web Developer", 
                                                    permissions: DEFAULT_ROLE_PERMISSIONS['developer']
                                                });
                                            }
                                        }}
                                        disabled={user?._id === editingEmployee?._id}
                                        className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-sm transition-all ${
                                            user?._id === editingEmployee?._id 
                                            ? 'bg-slate-50 cursor-not-allowed text-slate-500' 
                                            : 'bg-white cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                        }`}
                                    >
                                        <option value="custom">Custom Employee Role...</option>
                                        <option value="admin">Admin</option>
                                        <option value="TL">Team Lead</option>
                                        <option value="qa">QA</option>
                                    </select>
                                </div>
                                {roleSelectValue === "custom" && (
                                    <div className="space-y-1.5 md:col-span-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <label className="block text-sm font-bold text-slate-700">Custom Role Title *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={customRoleText}
                                            placeholder="e.g. Web Developer, Graphic Designer"
                                            disabled={user?._id === editingEmployee?._id}
                                            onChange={(e) => {
                                                const txt = e.target.value;
                                                setCustomRoleText(txt);
                                                setNewEmployee({
                                                    ...newEmployee,
                                                    role: txt
                                                });
                                            }}
                                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm transition-all ${
                                                user?._id === editingEmployee?._id 
                                                ? 'bg-slate-50 cursor-not-allowed text-slate-500 border-slate-200' 
                                                : `bg-white ${submitted && !customRoleText ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`
                                            }`} 
                                        />
                                        {submitted && !customRoleText && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1">Custom Role Title is required!</p>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Password</label>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIsEditEmployeeModalOpen(false);
                                            openChangePwdModal(
                                                editingEmployee._id,
                                                newEmployee.name,
                                                e
                                            );
                                        }}
                                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-xl hover:bg-amber-100 hover:border-amber-300 transition-all text-sm group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <KeyRound className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                                            Change Password
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">
                                            Secure Flow
                                        </span>
                                    </button>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Password changes are handled securely through a dedicated modal.
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-slate-700">Department</label>
                                    <select 
                                        value={newEmployee.department}
                                        onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all cursor-pointer"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept._id} value={dept.name}>{dept.name}</option>
                                        ))}
                                        {newEmployee.department && !departments.some(d => d.name === newEmployee.department) && (
                                            <option value={newEmployee.department}>{newEmployee.department} (Inactive/Legacy)</option>
                                        )}
                                    </select>
                                </div>
                                {newEmployee.role !== 'admin' && (
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700">Team Leads</label>
                                        <div className="w-full border border-slate-200 rounded-lg p-2 max-h-[120px] overflow-y-auto bg-slate-50/30">
                                            <div className="grid grid-cols-2 gap-2">
                                                {teamLeads.map(tl => (
                                                    <label key={tl.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                                                        <input 
                                                            type="checkbox"
                                                            checked={newEmployee.teamLeads.includes(tl.id)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setNewEmployee(prev => ({
                                                                    ...prev,
                                                                    teamLeads: checked 
                                                                        ? [...prev.teamLeads, tl.id]
                                                                        : prev.teamLeads.filter(id => id !== tl.id)
                                                                }));
                                                            }}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                                        />
                                                        <span className="text-sm font-medium text-slate-600 truncate">{tl.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {teamLeads.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No team leads found</p>}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1.5 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                                        <label className="block text-sm font-bold text-slate-700">Permissions & Access Control</label>
                                    </div>
                                    <div className="w-full border border-slate-200 rounded-lg p-4 bg-slate-50/30 max-h-[220px] overflow-y-auto custom-scrollbar">
                                        <PermissionGroups 
                                            permissions={newEmployee.permissions || []} 
                                            onChange={(perms) => setNewEmployee({...newEmployee, permissions: perms})} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">Update Profile Picture</label>
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
            {/* ─── Change Password Modal ────────────────────────────────────── */}
            {isChangePwdModalOpen && (() => {
                const strength = getPwdStrength(newPassword);
                const pwdMismatch = pwdSubmitted && newPassword !== confirmPassword;
                const pwdTooShort = pwdSubmitted && newPassword.length < 6;
                return (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                                    <KeyRound className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-base font-bold text-slate-800">Change Password</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Setting new credentials for <span className="font-bold text-slate-700">{changePwdEmployeeName}</span></p>
                                </div>
                                <button
                                    onClick={() => setIsChangePwdModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Security notice */}
                            <div className="mx-6 mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                                <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                    The new password will be <span className="font-bold">securely hashed</span> using bcrypt before saving. The employee can login immediately after this change.
                                </p>
                            </div>

                            <form onSubmit={handleChangePassword} noValidate>
                                <div className="p-6 space-y-4">
                                    {/* New Password */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-slate-700">New Password *</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPwd ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Min. 6 characters"
                                                className={`w-full px-4 py-2.5 pr-11 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-400 ${
                                                    pwdTooShort ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPwd(p => !p)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {pwdTooShort && (
                                            <p className="text-red-500 text-[11px] font-semibold animate-in fade-in slide-in-from-top-1">Password must be at least 6 characters.</p>
                                        )}

                                        {/* Strength meter */}
                                        {newPassword.length > 0 && (
                                            <div className="space-y-1.5 mt-2">
                                                <div className="flex gap-1">
                                                    {[1,2,3,4,5].map(i => (
                                                        <div
                                                            key={i}
                                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                                i <= strength.score ? strength.color : 'bg-slate-200'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className={`text-[11px] font-bold ${strength.text}`}>{strength.label}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-bold text-slate-700">Confirm Password *</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPwd ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter new password"
                                                className={`w-full px-4 py-2.5 pr-11 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-400 ${
                                                    pwdMismatch ? 'border-red-400 bg-red-50/30' : (confirmPassword && confirmPassword === newPassword ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200')
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPwd(p => !p)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            {confirmPassword && confirmPassword === newPassword && !pwdMismatch && (
                                                <CheckCircle className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                            )}
                                        </div>
                                        {pwdMismatch && (
                                            <p className="text-red-500 text-[11px] font-semibold animate-in fade-in slide-in-from-top-1">Passwords do not match.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 pb-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsChangePwdModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 bg-slate-50 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isChangingPwd}
                                        className="flex-1 px-4 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-100 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isChangingPwd ? (
                                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating…</>
                                        ) : (
                                            <><KeyRound className="w-4 h-4" /> Update Password</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* ─── Delete Confirmation Modal ───────────────────────────────── */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="pt-8 pb-6 px-6 text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                                <Trash2 className="w-8 h-8 text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Move to Trash?</h3>
                            <p className="text-sm text-slate-500 leading-relaxed px-2">
                                This employee will be moved to the <span className="font-bold text-slate-700">Trash</span>. You can restore them within <span className="text-blue-600 font-bold">30 days</span> before they are permanently deleted.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteEmployee}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Moving...</>
                                ) : 'Move to Trash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Inactive Confirmation Modal */}
            {isInactiveModalOpen && inactiveEmployee && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsInactiveModalOpen(false)} />
                    <form onSubmit={handleConfirmInactive} className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Mark Employee Inactive</h3>
                            <button type="button" onClick={() => setIsInactiveModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 flex-1">
                            <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                                Are you sure you want to mark <span className="font-bold text-slate-700">{inactiveEmployee.name}</span> as inactive? This will block their login and restrict project assignments.
                            </p>
                            
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason for Inactivity (Optional)</label>
                                <textarea
                                    value={inactiveReason}
                                    onChange={(e) => setInactiveReason(e.target.value)}
                                    placeholder="e.g., Medical leave, sabbatical, project transition..."
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none placeholder-slate-400 text-slate-700"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Inactive Duration in Days (Optional)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={inactiveDays}
                                    onChange={(e) => setInactiveDays(e.target.value)}
                                    placeholder="Leave blank for indefinite inactivity..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-400 text-slate-700"
                                />
                                <span className="text-[10px] text-slate-400 font-medium block">If entered, their account will automatically reactivate after that duration ends.</span>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsInactiveModalOpen(false)}
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingInactive}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isSubmittingInactive ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                ) : 'Mark Inactive'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Reactivate Confirmation Modal */}
            {isActivateConfirmOpen && employeeToActivate && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsActivateConfirmOpen(false)} />
                    <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="pt-8 pb-6 px-6 text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Reactivate Employee</h3>
                            <p className="text-sm text-slate-550 leading-relaxed px-2">
                                Are you sure you want to activate <span className="font-bold text-slate-700">{employeeToActivate.name}</span>?
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setIsActivateConfirmOpen(false)}
                                className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmActivate}
                                disabled={isSubmittingActivate}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                            >
                                {isSubmittingActivate ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Activating...</>
                                ) : 'Activate'}
                            </button>
                        </div>
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
        </div>
    );
};

export default EmployeesDashboard;