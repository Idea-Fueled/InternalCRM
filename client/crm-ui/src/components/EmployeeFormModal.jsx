import React, { useState, useEffect, useRef } from "react";
import { 
    X, Camera, ShieldCheck, KeyRound, Eye, EyeOff, ShieldAlert 
} from "lucide-react";
import { userService, departmentService, authService } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import ChangePasswordModal from "./ChangePasswordModal";

// Permissions mapping
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
    hr:        ['tasks.update'],
};

const getUserRoleCategory = (user) => {
    if (!user) return 'employee';
    const role = (user.role || '').toLowerCase();
    const designation = (user.designation || '').toLowerCase();
    if (role === 'admin' || designation === 'admin') {
        return 'admin';
    }
    const checkText = designation || role;
    if (checkText.includes('qa')) {
        return 'qa';
    }
    if (checkText.includes('team lead') || checkText.includes('lead')) {
        return 'TL';
    }
    return 'employee';
};

const SearchableMultiSelectDropdown = ({ options, selectedValues, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => {
        const query = search.toLowerCase();
        return opt.name.toLowerCase().includes(query) || (opt.designation || "").toLowerCase().includes(query);
    });

    const handleToggle = (id) => {
        if (selectedValues.includes(id)) {
            onChange(selectedValues.filter(val => val !== id));
        } else {
            onChange([...selectedValues, id]);
        }
    };

    const handleRemove = (id, e) => {
        e.stopPropagation();
        onChange(selectedValues.filter(val => val !== id));
    };

    return (
        <div ref={dropdownRef} className="relative w-full">
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full min-h-[42px] px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-1.5 items-center cursor-pointer transition-all ${
                    disabled ? "bg-slate-50 cursor-not-allowed opacity-60" : "focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 hover:border-slate-350"
                }`}
            >
                {selectedValues.length === 0 && (
                    <span className="text-slate-400 text-xs font-semibold select-none">{placeholder || "Search and select managers..."}</span>
                )}
                {selectedValues.map(id => {
                    const opt = options.find(o => o.id === id);
                    if (!opt) return null;
                    return (
                        <span key={id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md border border-blue-100 max-w-[220px] truncate">
                            <span className="truncate">{opt.name}</span>
                            <button
                                type="button"
                                onClick={(e) => handleRemove(id, e)}
                                className="text-blue-500 hover:text-blue-700 focus:outline-none shrink-0"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    );
                })}
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[300px]">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                        <input
                            type="text"
                            placeholder="Type to search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none bg-white text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                    <div className="overflow-y-auto max-h-[220px] no-scrollbar divide-y divide-slate-100">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-xs font-medium">No managers found</div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isChecked = selectedValues.includes(opt.id);
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleToggle(opt.id)}
                                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors text-sm font-semibold text-slate-700 justify-between ${
                                            isChecked ? "bg-blue-50/30 text-blue-700" : ""
                                        }`}
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate">{opt.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{opt.designation || "Employee"}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {}}
                                            className="w-4 h-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500/20 shrink-0 cursor-pointer"
                                        />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
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
                                    className="w-3.5 h-3.5 rounded border-slate-355 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{perm.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function EmployeeFormModal({ isOpen, mode, employee, onClose, onSave }) {
    const { user: currentUser } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [managers, setManagers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);

    // Form inputs state
    const [formInput, setFormInput] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        department: "",
        designation: "",
        role: "developer",
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        earnedLeaveBalance: 15,
        reportingManagers: [],
        permissions: []
    });

    const [profilePic, setProfilePic] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const fileInputRef = useRef(null);

    const isAdminRole = currentUser?.role === 'admin';

    // ─── Fetch Active Departments and Eligible Managers ────────────────────────
    const loadFormMetadata = async () => {
        try {
            const [deptsRes, usersRes] = await Promise.all([
                departmentService.getAllDepartments(),
                userService.getAllUsers({ status: 'all' })
            ]);

            if (deptsRes.data?.success && Array.isArray(deptsRes.data.departments)) {
                setDepartments(deptsRes.data.departments);
            }
            if (usersRes.data?.success && Array.isArray(usersRes.data.data)) {
                const activeManagers = usersRes.data.data
                    .filter(u => u.status !== 'inactive')
                    .map(u => ({
                        id: u._id,
                        name: u.name,
                        designation: u.designation || u.role
                    }));
                setManagers(activeManagers);
            }
        } catch (err) {
            console.error("Failed to load metadata in modal:", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadFormMetadata();
            setSubmitted(false);
            
            if (mode === "edit" && employee) {
                const empRaw = employee.raw || employee;
                const empRoleCategory = getUserRoleCategory(empRaw);
                if (!isAdminRole && empRoleCategory === 'admin') {
                    toast.error("Access denied. Only administrators can modify admin accounts.");
                    onClose();
                    return;
                }
                setFormInput({
                    name: empRaw.name || "",
                    email: empRaw.email || "",
                    phone: empRaw.phone || "",
                    password: "",
                    department: empRaw.department || "",
                    designation: empRaw.designation || empRaw.role || "",
                    role: empRaw.role || "developer",
                    casualLeaveBalance: empRaw.casualLeaveBalance !== undefined ? empRaw.casualLeaveBalance : 12,
                    sickLeaveBalance: empRaw.sickLeaveBalance !== undefined ? empRaw.sickLeaveBalance : 10,
                    earnedLeaveBalance: empRaw.earnedLeaveBalance !== undefined ? empRaw.earnedLeaveBalance : 15,
                    reportingManagers: (empRaw.reportingManagers || []).map(m => m._id || m) || (empRaw.teamLeads || []).map(tl => tl._id || tl) || [],
                    permissions: empRaw.permissions || (DEFAULT_ROLE_PERMISSIONS[empRaw.role] || [])
                });
                setProfilePic(null);
                setImagePreview(empRaw.profilePic || "");
            } else {
                // reset for create mode
                setFormInput({
                    name: "",
                    email: "",
                    phone: "",
                    password: "",
                    department: "",
                    designation: "",
                    role: "developer",
                    casualLeaveBalance: 12,
                    sickLeaveBalance: 10,
                    earnedLeaveBalance: 15,
                    reportingManagers: [],
                    permissions: DEFAULT_ROLE_PERMISSIONS.developer
                });
                setProfilePic(null);
                setImagePreview("");
            }
        }
    }, [isOpen, mode, employee]);

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePic(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);

        if (!formInput.name || !formInput.email || !formInput.designation) {
            toast.error("Please fill in all required fields!");
            return;
        }

        // Security role category guards for non-admins (e.g. HR)
        if (!isAdminRole) {
            if (formInput.role === "admin" || formInput.designation.toLowerCase().includes("admin")) {
                toast.error("Access denied. You are restricted from configuring admin accounts.");
                return;
            }
        }

        try {
            setIsSaving(true);
            const formData = new FormData();
            formData.append("name", formInput.name.trim());
            formData.append("email", formInput.email.trim());
            formData.append("phone", formInput.phone.trim());
            formData.append("department", formInput.department);
            formData.append("designation", formInput.designation.trim());
            formData.append("role", formInput.role);
            formData.append("casualLeaveBalance", Number(formInput.casualLeaveBalance));
            formData.append("sickLeaveBalance", Number(formInput.sickLeaveBalance));
            formData.append("earnedLeaveBalance", Number(formInput.earnedLeaveBalance));

            if (formInput.reportingManagers.length > 0) {
                formInput.reportingManagers.forEach(id => {
                    formData.append("reportingManagers[]", id);
                });
                formData.append("reportingManager", formInput.reportingManagers[0]);
            } else {
                formData.append("reportingManager", "");
            }

            if (profilePic) {
                formData.append("profilePic", profilePic);
            }

            // Append permissions
            const targetPerms = formInput.permissions.length > 0
                ? formInput.permissions
                : (DEFAULT_ROLE_PERMISSIONS[formInput.role] || DEFAULT_ROLE_PERMISSIONS.developer);

            targetPerms.forEach(p => formData.append("permissions[]", p));

            if (mode === "create") {
                if (formInput.password) {
                    formData.append("password", formInput.password);
                }
                await authService.register(formData);
                toast.success("Employee onboarding successfully complete!");
            } else {
                const empId = employee.raw?._id || employee._id || employee.id;
                await userService.updateUser(empId, formData);
                toast.success("Employee profile updated successfully!");
            }

            if (onSave) onSave();
            onClose();
        } catch (err) {
            console.error("Employee save failed:", err);
            toast.error(err.response?.data?.message || "Failed to save employee profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar relative animate-in zoom-in-95 duration-200 flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 bg-white z-10">
                        <div>
                            <h3 className="text-base font-black text-slate-800">{mode === 'create' ? 'Onboard New Employee' : 'Modify Employee Details'}</h3>
                            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                {mode === 'create' ? 'Register team members and allocate annual leaves.' : 'Edit profiles and adjust numerical annual leave limits.'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form Body */}
                    <form id="employeeForm" onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                        
                        {/* Profile Picture Upload Section */}
                        <div className="flex flex-col items-center gap-3">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-100 transition-all overflow-hidden relative group shadow-sm"
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                        <span className="text-[9px] text-slate-400 font-bold mt-1">Upload</span>
                                    </>
                                )}
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageChange} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            <p className="text-[10px] text-slate-400 font-medium italic">Recommended: Square image, max 5MB</p>
                        </div>

                        {/* Name & Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-none">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    value={formInput.name}
                                    onChange={(e) => setFormInput({ ...formInput, name: e.target.value })}
                                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs outline-none text-slate-800 transition-all ${
                                        submitted && !formInput.name ? 'border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    }`}
                                />
                                {submitted && !formInput.name && (
                                    <p className="text-red-500 text-[10px] font-semibold mt-1">Name is required!</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="john@ideafueled.com"
                                    value={formInput.email}
                                    onChange={(e) => setFormInput({ ...formInput, email: e.target.value })}
                                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs outline-none text-slate-800 transition-all ${
                                        submitted && !formInput.email ? 'border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    }`}
                                />
                                {submitted && !formInput.email && (
                                    <p className="text-red-500 text-[10px] font-semibold mt-1">Email is required!</p>
                                )}
                            </div>
                        </div>

                        {/* Phone & Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="+1 555-0199"
                                    value={formInput.phone}
                                    onChange={(e) => setFormInput({ ...formInput, phone: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department *</label>
                                <select
                                    required
                                    value={formInput.department}
                                    onChange={(e) => setFormInput({ ...formInput, department: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                >
                                    <option value="">Select Department...</option>
                                    {departments.map(d => (
                                        <option key={d._id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Designation & Role Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Designation *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Senior Frontend Developer"
                                    value={formInput.designation}
                                    onChange={(e) => setFormInput({ ...formInput, designation: e.target.value })}
                                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs outline-none text-slate-800 transition-all ${
                                        submitted && !formInput.designation ? 'border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    }`}
                                />
                                {submitted && !formInput.designation && (
                                    <p className="text-red-500 text-[10px] font-semibold mt-1">Designation Title is required!</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Category *</label>
                                <select
                                    required
                                    value={formInput.role}
                                    onChange={(e) => {
                                        const r = e.target.value;
                                        setFormInput({ 
                                            ...formInput, 
                                            role: r,
                                            permissions: DEFAULT_ROLE_PERMISSIONS[r] || DEFAULT_ROLE_PERMISSIONS.developer
                                        });
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                >
                                    <option value="developer">Employee</option>
                                    <option value="TL">Team Lead</option>
                                    <option value="qa">QA</option>
                                    <option value="hr">HR</option>
                                    {isAdminRole && <option value="admin">Admin</option>}
                                </select>
                            </div>
                        </div>

                        {/* Password / Change Password Flow */}
                        {mode === "create" ? (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password (Optional)</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={formInput.password}
                                        onChange={(e) => setFormInput({...formInput, password: e.target.value})}
                                        placeholder="Leave blank to send setup email"
                                        className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-normal font-medium mt-0.5">
                                    If left blank, the employee will receive a welcome email with a secure link to set up their password.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password Management</label>
                                <button
                                    type="button"
                                    onClick={() => setIsChangePwdOpen(true)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-xl hover:bg-amber-100 hover:border-amber-300 transition-all text-xs font-bold group"
                                >
                                    <div className="flex items-center gap-2">
                                        <KeyRound className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
                                        Change Password
                                    </div>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">
                                        Secure Flow
                                    </span>
                                </button>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium leading-normal">
                                    Password changes are handled securely through an inline, encrypted credentials update pipeline.
                                </p>
                            </div>
                        )}

                        {/* Reporting Managers Select */}
                        {formInput.role !== 'admin' && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reporting Managers (Multi-Select)</label>
                                <SearchableMultiSelectDropdown
                                    options={employee ? managers.filter(m => m.id !== (employee.raw?._id || employee._id || employee.id)) : managers}
                                    selectedValues={formInput.reportingManagers}
                                    onChange={(vals) => setFormInput({ ...formInput, reportingManagers: vals })}
                                    placeholder="Search and allocate supervisors..."
                                />
                            </div>
                        )}

                        {/* Leave Allocation Fields Section (Temporarily Commented Out) */}
                        {/* <div className="border-t border-slate-100 pt-4 mt-2">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                {mode === 'create' ? 'Allocate Annual Leaves Balances' : 'Modify Annual Leaves Balances'}
                            </span>
                            <div className="grid grid-cols-3 gap-4 mt-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Casual Leave</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formInput.casualLeaveBalance}
                                        onChange={(e) => setFormInput({ ...formInput, casualLeaveBalance: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Sick Leave</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formInput.sickLeaveBalance}
                                        onChange={(e) => setFormInput({ ...formInput, sickLeaveBalance: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Earned Leave</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formInput.earnedLeaveBalance}
                                        onChange={(e) => setFormInput({ ...formInput, earnedLeaveBalance: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                    />
                                </div>
                            </div>
                        </div> */}

                        {/* Permissions Block - Admin only */}
                        {isAdminRole && (
                            <div className="space-y-1.5 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                                    <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Permissions & Access Control</label>
                                </div>
                                <div className="w-full border border-slate-200 rounded-2xl p-4 bg-slate-50/30 max-h-[220px] overflow-y-auto custom-scrollbar">
                                    <PermissionGroups 
                                        permissions={formInput.permissions || []} 
                                        onChange={(perms) => setFormInput({...formInput, permissions: perms})} 
                                    />
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Footer */}
                    <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-[24px]">
                        <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition text-xs">
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            form="employeeForm"
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition text-xs shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : (mode === 'create' ? "Confirm Onboarding" : "Save Modifications")}
                        </button>
                    </div>
                </div>
            </div>

            {/* Reusable ChangePasswordModal */}
            {isChangePwdOpen && employee && (
                <ChangePasswordModal
                    isOpen={isChangePwdOpen}
                    employeeId={employee.raw?._id || employee._id || employee.id}
                    employeeName={formInput.name}
                    onClose={() => setIsChangePwdOpen(false)}
                />
            )}
        </>
    );
}
