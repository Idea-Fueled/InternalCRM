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

import EmployeeFormModal from "../../components/EmployeeFormModal";
import EmployeeDetailsSidebar from "../../components/EmployeeDetailsSidebar";

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
    const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState(null);

    // Inactivity form inputs
    const [statusInput, setStatusInput] = useState({
        status: "free",
        inactiveReason: "",
        inactiveUntil: ""
    });

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
        setIsCreateModalOpen(true);
    };

    const handleEditOpen = (emp) => {
        setSelectedEmployee(emp);
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
                                        onClick={() => setSelectedEmployeeForDetails(emp)}
                                        className={`relative overflow-hidden premium-card p-5 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[220px] cursor-pointer ${
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

                                        {/* Leave Balances Display (Temporarily Commented Out) */}
                                        {/* <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
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
                                        </div> */}

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
                                                onClick={(e) => { e.stopPropagation(); handleStatusOpen(emp); }}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shrink-0 transition-all ${
                                                    isInactiveState 
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                                                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                                                }`}
                                            >
                                                {isInactiveState ? "Activate" : "Deactivate"}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditOpen(emp); }}
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
            <EmployeeFormModal
                isOpen={isCreateModalOpen}
                mode="create"
                onClose={() => setIsCreateModalOpen(false)}
                onSave={loadData}
            />

            <EmployeeFormModal
                isOpen={isEditModalOpen}
                mode="edit"
                employee={selectedEmployee}
                onClose={() => { setIsEditModalOpen(false); setSelectedEmployee(null); }}
                onSave={loadData}
            />

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

            <EmployeeDetailsSidebar
                isOpen={!!selectedEmployeeForDetails}
                employee={selectedEmployeeForDetails}
                onClose={() => setSelectedEmployeeForDetails(null)}
            />
        </div>
    );
};

export default HREmployees;
