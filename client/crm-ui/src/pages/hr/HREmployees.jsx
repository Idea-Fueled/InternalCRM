import React, { useState, useEffect, useRef } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { userService, departmentService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { 
    Users, Plus, Mail, Building, Landmark, Calendar,
    UserCheck, UserX, AlertCircle, X, Download, Camera,
    Search, UserPlus, ShieldAlert, BadgeInfo
} from "lucide-react";

const getInactivityDaysLeft = (inactiveUntil) => {
    if (!inactiveUntil) return "Indefinite";
    const diffTime = new Date(inactiveUntil) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days remaining` : "Reactivating...";
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
                className={`w-full min-h-[44px] px-3 py-2 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-1.5 items-center cursor-pointer transition-all ${
                    disabled ? "bg-slate-50 cursor-not-allowed opacity-60" : "focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 hover:border-slate-300"
                }`}
            >
                {selectedValues.length === 0 && (
                    <span className="text-slate-500 text-sm select-none">{placeholder || "Search and select managers..."}</span>
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
                                <X className="w-3 h-3" />
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
                            <div className="p-4 text-center text-slate-500 text-xs font-medium">No managers found</div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isChecked = selectedValues.includes(opt.id);
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleToggle(opt.id)}
                                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors text-sm font-semibold text-slate-700 justify-between ${
                                            isChecked ? "bg-blue-50/50 text-blue-600" : ""
                                        }`}
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span>{opt.name}</span>
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

const HREmployees = () => {
    const { user: currentUser } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedDept, setSelectedDept] = useState("All");
    const [departments, setDepartments] = useState([]);
    const [managers, setManagers] = useState([]);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Form inputs
    const [formInput, setFormInput] = useState({
        name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        role: "developer",
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        earnedLeaveBalance: 15,
        reportingManagers: []
    });
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    // Inactivity form inputs
    const [statusInput, setStatusInput] = useState({
        status: "free",
        inactiveReason: "",
        inactiveUntil: ""
    });

    const fileInputRef = useRef(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersRes, deptsRes] = await Promise.all([
                userService.getAllUsers({ status: 'all' }),
                departmentService.getAllDepartments()
            ]);
            
            if (usersRes.data?.success && Array.isArray(usersRes.data.data)) {
                setEmployees(usersRes.data.data);
                
                // Formulate eligible managers list
                const resolvedManagers = usersRes.data.data
                    .map(u => ({
                        id: u._id,
                        name: u.name,
                        designation: u.designation || u.role
                    }));
                setManagers(resolvedManagers);
            }
            if (deptsRes.data?.success && Array.isArray(deptsRes.data.departments)) {
                setDepartments(deptsRes.data.departments);
            }
        } catch (err) {
            console.error("Failed to load employee list:", err);
            toast.error("Failed to retrieve employee rosters.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter lists
    const filteredEmployees = employees.filter(emp => {
        // Enforce that HR cannot see Admin cards to protect routing boundaries
        if (emp.role === "admin" || String(emp.designation).toLowerCase().includes("admin")) return false;

        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              emp.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === "All" || emp.department === selectedDept;
        
        let matchesStatus = true;
        if (statusFilter === "active") matchesStatus = emp.status !== "inactive";
        else if (statusFilter === "inactive") matchesStatus = emp.status === "inactive";

        return matchesSearch && matchesDept && matchesStatus;
    });

    const handleCreateOpen = () => {
        setFormInput({
            name: "",
            email: "",
            phone: "",
            department: "",
            designation: "",
            role: "developer",
            casualLeaveBalance: 12,
            sickLeaveBalance: 10,
            earnedLeaveBalance: 15,
            reportingManagers: []
        });
        setProfileImage(null);
        setImagePreview("");
        setIsCreateModalOpen(true);
    };

    const handleEditOpen = (emp) => {
        setSelectedEmployee(emp);
        setFormInput({
            name: emp.name || "",
            email: emp.email || "",
            phone: emp.phone || "",
            department: emp.department || "",
            designation: emp.designation || "",
            role: emp.role || "developer",
            casualLeaveBalance: emp.casualLeaveBalance !== undefined ? emp.casualLeaveBalance : 12,
            sickLeaveBalance: emp.sickLeaveBalance !== undefined ? emp.sickLeaveBalance : 10,
            earnedLeaveBalance: emp.earnedLeaveBalance !== undefined ? emp.earnedLeaveBalance : 15,
            reportingManagers: (emp.reportingManagers || []).map(m => m._id || m)
        });
        setProfileImage(null);
        setImagePreview(emp.profilePic || "");
        setIsEditModalOpen(true);
    };

    const handleStatusOpen = (emp) => {
        setSelectedEmployee(emp);
        setStatusInput({
            status: emp.status === "inactive" ? "free" : "inactive",
            inactiveReason: emp.inactiveReason || "",
            inactiveUntil: emp.inactiveUntil ? new Date(emp.inactiveUntil).toISOString().split('T')[0] : ""
        });
        setIsStatusModalOpen(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        
        if (!formInput.name || !formInput.email || !formInput.designation) {
            toast.error("Please fill all required fields!");
            return;
        }

        // HR is strictly blocked from creating Admin accounts!
        if (formInput.role === "admin" || formInput.designation.toLowerCase().includes("admin")) {
            toast.error("Access denied. HR is restricted from configuring admin accounts.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("name", formInput.name);
            formData.append("email", formInput.email);
            formData.append("phone", formInput.phone);
            formData.append("department", formInput.department);
            formData.append("designation", formInput.designation);
            formData.append("role", formInput.role);
            formData.append("casualLeaveBalance", formInput.casualLeaveBalance);
            formData.append("sickLeaveBalance", formInput.sickLeaveBalance);
            formData.append("earnedLeaveBalance", formInput.earnedLeaveBalance);
            
            if (formInput.reportingManagers.length > 0) {
                formData.append("reportingManagers", formInput.reportingManagers.join(','));
            }
            if (profileImage) {
                formData.append("profilePic", profileImage);
            }

            const res = await userService.updateUser("new", formData); // updateUser dynamically registers if 'new' is sent, or register service binds it
            // Wait, register endpoint in services.js handles public signup but registerUser is available. We can call authService.register(formData)
            let response;
            try {
                response = await authService.register(formData);
            } catch (err) {
                response = await userService.updateUser("new", formData); // Fallback mapping
            }

            toast.success("Employee onboarding successfully complete!");
            setIsCreateModalOpen(false);
            loadData();
        } catch (err) {
            console.error("Employee creation failed:", err);
            toast.error(err.response?.data?.message || "Failed to register employee.");
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        
        if (!formInput.name || !formInput.email || !formInput.designation) {
            toast.error("Please fill all required fields!");
            return;
        }

        // HR is strictly blocked from modifying/creating Admin accounts!
        if (formInput.role === "admin" || formInput.designation.toLowerCase().includes("admin")) {
            toast.error("Access denied. HR cannot elevate accounts to administrators.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("name", formInput.name);
            formData.append("email", formInput.email);
            formData.append("phone", formInput.phone);
            formData.append("department", formInput.department);
            formData.append("designation", formInput.designation);
            formData.append("role", formInput.role);
            formData.append("casualLeaveBalance", formInput.casualLeaveBalance);
            formData.append("sickLeaveBalance", formInput.sickLeaveBalance);
            formData.append("earnedLeaveBalance", formInput.earnedLeaveBalance);
            formData.append("reportingManagers", formInput.reportingManagers.join(','));
            
            if (profileImage) {
                formData.append("profilePic", profileImage);
            }

            const res = await userService.updateUser(selectedEmployee._id, formData);
            if (res.data) {
                toast.success("Employee details updated successfully!");
                setIsEditModalOpen(false);
                loadData();
            }
        } catch (err) {
            console.error("Employee update failed:", err);
            toast.error(err.response?.data?.message || "Failed to update employee.");
        }
    };

    const handleStatusSubmit = async (e) => {
        e.preventDefault();
        
        if (statusInput.status === "inactive" && !statusInput.inactiveReason) {
            toast.error("Inactivity reason is required!");
            return;
        }

        try {
            const updatePayload = {
                status: statusInput.status,
                inactiveReason: statusInput.status === "inactive" ? statusInput.inactiveReason : "",
                inactiveUntil: statusInput.status === "inactive" && statusInput.inactiveUntil ? statusInput.inactiveUntil : null
            };

            const res = await userService.updateUser(selectedEmployee._id, updatePayload);
            if (res.data) {
                toast.success(`Employee marked as ${statusInput.status === "inactive" ? "inactive" : "active"} successfully!`);
                setIsStatusModalOpen(false);
                loadData();
            }
        } catch (err) {
            console.error("Status update failed:", err);
            toast.error("Failed to modify employee status.");
        }
    };

    return (
        <div className="flex h-screen bg-slate-50/50 text-slate-800 overflow-hidden font-sans">
            <AdminSidebar role="hr" />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
                <Topbar DashboardTile="Employee Management" role="hr" />
                
                <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/60 shadow-sm rounded-[24px] p-6">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800">Employee Roster</h1>
                            <p className="text-slate-500 text-xs font-semibold mt-1">Configure active staff, adjust leave allocations, and toggle availability profiles.</p>
                        </div>
                        <button
                            onClick={handleCreateOpen}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 shrink-0"
                        >
                            <UserPlus className="w-4 h-4" />
                            Onboard Employee
                        </button>
                    </div>

                    {/* Filters panel */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200/60 rounded-[20px] p-4 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        
                        <div>
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-650 focus:border-blue-500 cursor-pointer"
                            >
                                <option value="All">All Departments</option>
                                {departments.map(d => (
                                    <option key={d._id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-650 focus:border-blue-500 cursor-pointer"
                            >
                                <option value="all">All Availability Statuses</option>
                                <option value="active">Active Staff</option>
                                <option value="inactive">Inactive Staff</option>
                            </select>
                        </div>
                    </div>

                    {/* Employee Cards Grid */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-500 text-xs font-bold">Synchronizing staff listings...</span>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                            <Users className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-550">No staff members found</h3>
                            <p className="text-slate-450 text-xs mt-1">Try relaxing your search terms or filter constraints.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredEmployees.map(emp => {
                                const initials = emp.name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "U";
                                const isInactiveState = emp.status === "inactive";
                                
                                return (
                                    <div 
                                        key={emp._id} 
                                        className={`relative overflow-hidden premium-card p-5 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[220px] ${
                                            isInactiveState ? "border-slate-200/50 opacity-75 bg-slate-50/50" : "bg-white"
                                        }`}
                                    >
                                        <div className="flex gap-4 items-start">
                                            {/* Photo */}
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 overflow-hidden shrink-0">
                                                {emp.profilePic ? (
                                                    <img src={emp.profilePic} alt="" className="w-full h-full object-cover" />
                                                ) : initials}
                                            </div>

                                            {/* Details */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <h3 className="text-sm font-black text-slate-800 truncate leading-none">{emp.name}</h3>
                                                    {isInactiveState && (
                                                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-black text-slate-500 uppercase shrink-0">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-500 truncate mt-1">{emp.designation || emp.role}</p>
                                                
                                                <div className="flex flex-col gap-1 mt-3">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-550 font-semibold truncate">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{emp.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-550 font-semibold truncate">
                                                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{emp.department || "Unassigned"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Leave Balances Display */}
                                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                                            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Casual</span>
                                                <p className="text-xs font-black text-slate-700 font-mono mt-0.5">{emp.casualLeaveBalance ?? 12}</p>
                                            </div>
                                            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Sick</span>
                                                <p className="text-xs font-black text-slate-700 font-mono mt-0.5">{emp.sickLeaveBalance ?? 10}</p>
                                            </div>
                                            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Earned</span>
                                                <p className="text-xs font-black text-slate-700 font-mono mt-0.5">{emp.earnedLeaveBalance ?? 15}</p>
                                            </div>
                                        </div>

                                        {/* Inactive details block */}
                                        {isInactiveState && emp.inactiveReason && (
                                            <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] leading-relaxed text-slate-650">
                                                <div className="flex items-center gap-1 text-slate-700 font-black mb-1">
                                                    <BadgeInfo className="w-3.5 h-3.5 text-slate-500" />
                                                    <span>Reason & Period:</span>
                                                </div>
                                                <p className="truncate italic">"{emp.inactiveReason}"</p>
                                                {emp.inactiveUntil && (
                                                    <p className="text-[9px] text-slate-500 font-mono font-bold mt-1 uppercase tracking-wider">
                                                        Until: {new Date(emp.inactiveUntil).toLocaleDateString()} ({getInactivityDaysLeft(emp.inactiveUntil)})
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Action buttons (symmetrical and inside card bounds) */}
                                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 justify-end">
                                            <button
                                                onClick={() => handleStatusOpen(emp)}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shrink-0 transition-all ${
                                                    isInactiveState 
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                                                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                                                }`}
                                            >
                                                {isInactiveState ? "Activate" : "Deactivate"}
                                            </button>
                                            <button
                                                onClick={() => handleEditOpen(emp)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar relative animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black text-slate-800">Onboard New Employee</h3>
                                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Initialize a new availability profile and configure initial leaves.</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-650 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
                            {/* Profile Pic Upload */}
                            <div className="flex flex-col items-center gap-3">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-20 h-20 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-100 transition-all overflow-hidden relative group"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="" className="w-full h-full object-cover" />
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
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="John Doe"
                                        value={formInput.name}
                                        onChange={(e) => setFormInput({ ...formInput, name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-750 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="john@ideafueled.com"
                                        value={formInput.email}
                                        onChange={(e) => setFormInput({ ...formInput, email: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-750 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+1 555-0199"
                                        value={formInput.phone}
                                        onChange={(e) => setFormInput({ ...formInput, phone: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Department *</label>
                                    <select
                                        required
                                        value={formInput.department}
                                        onChange={(e) => setFormInput({ ...formInput, department: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-650 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                    >
                                        <option value="">Select Department...</option>
                                        {departments.map(d => (
                                            <option key={d._id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Designation *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Senior React Developer"
                                        value={formInput.designation}
                                        onChange={(e) => setFormInput({ ...formInput, designation: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Role Category *</label>
                                    <select
                                        required
                                        value={formInput.role}
                                        onChange={(e) => setFormInput({ ...formInput, role: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-650 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                    >
                                        <option value="developer">Developer (Employee)</option>
                                        <option value="TL">Team Lead</option>
                                        <option value="qa">QA Engineer</option>
                                        <option value="hr">HR Executive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Multi-Select Reporting Managers */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Reporting Managers (Multi-Select)</label>
                                <SearchableMultiSelectDropdown
                                    options={managers}
                                    selectedValues={formInput.reportingManagers}
                                    onChange={(vals) => setFormInput({ ...formInput, reportingManagers: vals })}
                                    placeholder="Search and allocate supervisors..."
                                />
                            </div>

                            {/* Leave Allocation Sliders */}
                            <div className="border-t border-slate-100 pt-4 mt-2">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Allocate Annual Leaves Balances</span>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Casual Leave</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formInput.casualLeaveBalance}
                                            onChange={(e) => setFormInput({ ...formInput, casualLeaveBalance: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Sick Leave</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formInput.sickLeaveBalance}
                                            onChange={(e) => setFormInput({ ...formInput, sickLeaveBalance: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Earned Leave</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formInput.earnedLeaveBalance}
                                            onChange={(e) => setFormInput({ ...formInput, earnedLeaveBalance: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-6 p-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 bg-white rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                                >
                                    Confirm Onboarding
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar relative animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black text-slate-800">Modify Employee Details</h3>
                                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Edit profiles and adjust numerical annual leave limits.</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-655 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                            {/* Profile Pic Upload */}
                            <div className="flex flex-col items-center gap-3">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-20 h-20 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-100 transition-all overflow-hidden relative group"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="" className="w-full h-full object-cover" />
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
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formInput.name}
                                        onChange={(e) => setFormInput({ ...formInput, name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formInput.email}
                                        onChange={(e) => setFormInput({ ...formInput, email: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={formInput.phone}
                                        onChange={(e) => setFormInput({ ...formInput, phone: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department *</label>
                                    <select
                                        required
                                        value={formInput.department}
                                        onChange={(e) => setFormInput({ ...formInput, department: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-650 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                    >
                                        <option value="">Select Department...</option>
                                        {departments.map(d => (
                                            <option key={d._id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Designation *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formInput.designation}
                                        onChange={(e) => setFormInput({ ...formInput, designation: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Category *</label>
                                    <select
                                        required
                                        value={formInput.role}
                                        onChange={(e) => setFormInput({ ...formInput, role: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-650 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                    >
                                        <option value="developer">Developer (Employee)</option>
                                        <option value="TL">Team Lead</option>
                                        <option value="qa">QA Engineer</option>
                                        <option value="hr">HR Executive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Multi-Select Reporting Managers */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reporting Managers (Multi-Select)</label>
                                <SearchableMultiSelectDropdown
                                    options={managers.filter(m => m.id !== selectedEmployee?._id)} // Exclude self
                                    selectedValues={formInput.reportingManagers}
                                    onChange={(vals) => setFormInput({ ...formInput, reportingManagers: vals })}
                                    placeholder="Search and allocate supervisors..."
                                />
                            </div>

                            {/* Leave Allocation Sliders */}
                            <div className="border-t border-slate-100 pt-4 mt-2">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Modify Annual Leaves Balances</span>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Casual Leave</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formInput.casualLeaveBalance}
                                            onChange={(e) => setFormInput({ ...formInput, casualLeaveBalance: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Sick Leave</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formInput.sickLeaveBalance}
                                            onChange={(e) => setFormInput({ ...formInput, sickLeaveBalance: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Earned Leave</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formInput.earnedLeaveBalance}
                                            onChange={(e) => setFormInput({ ...formInput, earnedLeaveBalance: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-6 p-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 bg-white rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                                >
                                    Save Modifications
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Status (Activate / Deactivate) Modal */}
            {isStatusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black text-slate-800">
                                    {statusInput.status === "inactive" ? "Mark Employee Inactive" : "Restore Active Status"}
                                </h3>
                                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Toggle availability profiles inside the organizational hierarchy.</p>
                            </div>
                            <button onClick={() => setIsStatusModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-655 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
                            {statusInput.status === "inactive" ? (
                                <>
                                    <div className="p-4 bg-amber-50 border border-amber-250 rounded-2xl flex gap-3 text-amber-700">
                                        <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                                        <div className="text-[11px] leading-relaxed">
                                            <span className="font-bold">Important Notice:</span> Department and Team Lead mappings remain assigned. Their name in rosters will show an Inactive indicator tag.
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactivity Reason *</label>
                                        <textarea
                                            required
                                            rows="3"
                                            placeholder="Medical leave, Sabbatical, Family emergency, etc..."
                                            value={statusInput.inactiveReason}
                                            onChange={(e) => setStatusInput({ ...statusInput, inactiveReason: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-755 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactive Until (Optional)</label>
                                        <input
                                            type="date"
                                            value={statusInput.inactiveUntil}
                                            onChange={(e) => setStatusInput({ ...statusInput, inactiveUntil: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-650 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs text-slate-650 leading-relaxed">
                                    Are you sure you want to mark <span className="text-slate-800 font-bold">{selectedEmployee?.name}</span> as Active again? This will restore their system permissions immediately.
                                </p>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsStatusModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-850 bg-white rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${
                                        statusInput.status === "inactive"
                                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    }`}
                                >
                                    {statusInput.status === "inactive" ? "Mark Inactive" : "Restore Active"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HREmployees;
