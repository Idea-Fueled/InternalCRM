import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { leaveService, userService } from "../../api/services";
import { toast } from "sonner";
import { 
    Calendar, CheckCircle2, XCircle, Clock, Info, 
    ChevronRight, ArrowUpRight, ArrowDownRight, Edit2, Users,
    ShieldAlert, X, BadgeAlert, FileSpreadsheet
} from "lucide-react";

const HRLeaveManagement = () => {
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Pending"); // "Pending" | "Approved" | "Rejected" | "Balances"
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Balance modal states
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [balanceInput, setBalanceInput] = useState({
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        earnedLeaveBalance: 15
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const [leavesRes, employeesRes] = await Promise.all([
                leaveService.getLeaves(),
                userService.getAllUsers({ status: 'all' })
            ]);

            if (leavesRes.data?.success && Array.isArray(leavesRes.data.data)) {
                setLeaves(leavesRes.data.data);
            }
            if (employeesRes.data?.success && Array.isArray(employeesRes.data.data)) {
                // Filter out Admin to match permissions boundaries
                setEmployees(employeesRes.data.data.filter(u => u.role !== "admin"));
            }
        } catch (err) {
            console.error("Failed to load leave logs:", err);
            toast.error("Failed to retrieve leave information.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleProcessLeave = async (leaveId, status) => {
        try {
            const res = await leaveService.updateLeaveStatus(leaveId, status);
            if (res.data?.success) {
                toast.success(`Leave request successfully ${status.toLowerCase()}!`);
                setSelectedLeave(null);
                loadData();
            }
        } catch (err) {
            console.error("Failed to process leave status update:", err);
            toast.error(err.response?.data?.message || "Failed to update leave request.");
        }
    };

    const handleAdjustBalanceClick = (emp) => {
        setSelectedEmployee(emp);
        setBalanceInput({
            casualLeaveBalance: emp.casualLeaveBalance !== undefined ? emp.casualLeaveBalance : 12,
            sickLeaveBalance: emp.sickLeaveBalance !== undefined ? emp.sickLeaveBalance : 10,
            earnedLeaveBalance: emp.earnedLeaveBalance !== undefined ? emp.earnedLeaveBalance : 15
        });
        setIsBalanceModalOpen(true);
    };

    const handleBalanceSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await leaveService.adjustBalances({
                employeeId: selectedEmployee._id,
                ...balanceInput
            });
            if (res.data?.success) {
                toast.success("Leave balances updated successfully!");
                setIsBalanceModalOpen(false);
                loadData();
            }
        } catch (err) {
            console.error("Failed to adjust balances:", err);
            toast.error("Failed to update leave balances.");
        }
    };

    // Filters leaves list based on search and selected tab status
    const filteredLeaves = leaves.filter(l => {
        const name = l.employee?.name || "";
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = l.status === activeTab;
        return matchesSearch && matchesStatus;
    });

    const filteredEmployees = employees.filter(emp => {
        return emp.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="flex h-screen bg-[#060B18] text-slate-200 overflow-hidden font-sans">
            <AdminSidebar role="hr" />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
                <Topbar title="Leave Management" />
                
                <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
                    {/* Header Banner */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-[24px] p-6 backdrop-blur-md">
                        <h1 className="text-xl sm:text-2xl font-black text-white">Leave Approvals & Allocation</h1>
                        <p className="text-slate-400 text-xs font-semibold mt-1">Review leave applications, authorize time off, and adjust numerical leave balances.</p>
                    </div>

                    {/* Tab Selection */}
                    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
                        {["Pending", "Approved", "Rejected", "Balances"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                                className={`px-4 py-2.5 text-xs font-bold transition-all relative ${
                                    activeTab === tab
                                        ? "text-blue-500 font-extrabold"
                                        : "text-slate-500 hover:text-slate-300"
                                }`}
                            >
                                {tab === "Balances" ? "Leave Balances Matrix" : `${tab} Requests`}
                                {activeTab === tab && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search bar */}
                    <div className="relative max-w-md">
                        <input
                            type="text"
                            placeholder="Search employees by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs outline-none text-slate-200 focus:border-blue-500"
                        />
                    </div>

                    {/* Content Section */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-400 text-xs font-bold">Retrieving leave datasets...</span>
                        </div>
                    ) : activeTab === "Balances" ? (
                        /* Balances Matrix View */
                        <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-sm">
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                            <th className="p-4">Employee Info</th>
                                            <th className="p-4 text-center">Casual Balance (Limited)</th>
                                            <th className="p-4 text-center">Sick Balance (Limited)</th>
                                            <th className="p-4 text-center">Earned Balance (Limited)</th>
                                            <th className="p-4 text-center">Unpaid Balance (Unlimited)</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-850 text-xs font-bold text-slate-300">
                                        {filteredEmployees.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-10 text-slate-500">No employee records match the search terms.</td>
                                            </tr>
                                        ) : (
                                            filteredEmployees.map(emp => (
                                                <tr key={emp._id} className="hover:bg-slate-900/10 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden shrink-0">
                                                                {emp.profilePic ? <img src={emp.profilePic} alt="" className="w-full h-full object-cover" /> : emp.name?.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-white truncate">{emp.name}</p>
                                                                <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{emp.designation || emp.role}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center font-mono text-slate-200">{emp.casualLeaveBalance ?? 12} days</td>
                                                    <td className="p-4 text-center font-mono text-slate-200">{emp.sickLeaveBalance ?? 10} days</td>
                                                    <td className="p-4 text-center font-mono text-slate-200">{emp.earnedLeaveBalance ?? 15} days</td>
                                                    <td className="p-4 text-center font-mono text-slate-500 italic">Unlimited</td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => handleAdjustBalanceClick(emp)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-500/20 transition-all font-black text-[10px] uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                            Adjust
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* Request Lists View */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Request list */}
                            <div className="lg:col-span-2 space-y-4">
                                {filteredLeaves.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-900/10 border border-slate-800/40 rounded-3xl p-6">
                                        <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                        <h3 className="text-sm font-bold text-slate-400">No {activeTab.toLowerCase()} requests found</h3>
                                        <p className="text-slate-600 text-xs mt-1">Leave applications in this folder will appear here.</p>
                                    </div>
                                ) : (
                                    filteredLeaves.map(leave => {
                                        const initials = leave.employee?.name?.charAt(0) || "U";
                                        return (
                                            <div 
                                                key={leave._id}
                                                onClick={() => setSelectedLeave(leave)}
                                                className={`p-4 bg-slate-900/35 border rounded-2xl cursor-pointer hover:border-slate-700/60 transition-all flex justify-between items-center gap-4 ${
                                                    selectedLeave?._id === leave._id ? "border-blue-500/80 bg-slate-900/60" : "border-slate-800"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-center text-sm font-bold text-slate-300 overflow-hidden shrink-0">
                                                        {leave.employee?.profilePic ? (
                                                            <img src={leave.employee.profilePic} alt="" className="w-full h-full object-cover" />
                                                        ) : initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-xs font-black text-white truncate leading-none">{leave.employee?.name}</h3>
                                                        <p className="text-[10px] font-bold text-slate-500 truncate mt-1">
                                                            {leave.leaveType} • <span className="font-mono text-slate-400">{leave.totalDays} days</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-[10px] font-bold text-slate-500 font-mono hidden sm:inline">
                                                        {new Date(leave.startDate).toLocaleDateString()}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Detail Panel */}
                            <div className="lg:col-span-1">
                                {selectedLeave ? (
                                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-[24px] p-6 backdrop-blur-md space-y-6 sticky top-24">
                                        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                                            <div>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Application details</span>
                                                <h3 className="text-sm font-black text-white mt-0.5">{selectedLeave.employee?.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{selectedLeave.employee?.department || "Unassigned"}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                selectedLeave.status === "Pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                selectedLeave.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                            }`}>
                                                {selectedLeave.status}
                                            </span>
                                        </div>

                                        <div className="space-y-4 text-xs font-bold text-slate-300 leading-relaxed">
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Leave Type</span>
                                                <span className="text-white mt-1 block">{selectedLeave.leaveType}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Start Date</span>
                                                    <span className="text-white mt-1 block">{new Date(selectedLeave.startDate).toLocaleDateString()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">End Date</span>
                                                    <span className="text-white mt-1 block">{new Date(selectedLeave.endDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Duration</span>
                                                <span className="text-white mt-1 block font-mono">{selectedLeave.totalDays} days requested</span>
                                            </div>

                                            <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Reason for Leave</span>
                                                <p className="text-slate-400 font-medium italic">"{selectedLeave.reason}"</p>
                                            </div>
                                        </div>

                                        {selectedLeave.status === "Pending" && (
                                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                                                <button
                                                    onClick={() => handleProcessLeave(selectedLeave._id, "Rejected")}
                                                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-600 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleProcessLeave(selectedLeave._id, "Approved")}
                                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        )}

                                        {selectedLeave.status !== "Pending" && selectedLeave.processedBy && (
                                            <div className="pt-3 border-t border-slate-800 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                                <span>Processed by {selectedLeave.processedBy?.name} ({selectedLeave.processedBy?.designation || "HR"})</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="hidden lg:flex flex-col items-center justify-center text-center p-8 bg-slate-900/10 border border-slate-800/40 border-dashed rounded-3xl h-[260px]">
                                        <Info className="w-8 h-8 text-slate-700 mb-2" />
                                        <span className="text-xs font-bold text-slate-500">Select leave request card</span>
                                        <span className="text-[10px] text-slate-600 mt-1">Select an item from the left roster to view audit details and action items.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Adjust Balance Modal */}
            {isBalanceModalOpen && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1120] border border-slate-800 rounded-[28px] shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
                            <div>
                                <h3 className="text-base font-black text-white">Adjust Leave Balances</h3>
                                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Allocate or edit annual leaf allowance for {selectedEmployee.name}.</p>
                            </div>
                            <button onClick={() => setIsBalanceModalOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleBalanceSubmit} className="p-6 space-y-5">
                            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden shrink-0">
                                    {selectedEmployee.profilePic ? <img src={selectedEmployee.profilePic} alt="" className="w-full h-full object-cover" /> : selectedEmployee.name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-white truncate leading-none">{selectedEmployee.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-500 truncate mt-1">{selectedEmployee.designation || selectedEmployee.role}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-4 p-3 bg-slate-900/60 border border-slate-850 rounded-2xl">
                                    <div>
                                        <span className="text-[11px] font-black text-slate-200 block uppercase tracking-wider">Casual Leave</span>
                                        <span className="text-[9px] font-bold text-slate-500 block mt-0.5">Numerical Limit allocation</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        value={balanceInput.casualLeaveBalance}
                                        onChange={(e) => setBalanceInput({ ...balanceInput, casualLeaveBalance: e.target.value })}
                                        className="w-20 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-slate-200 focus:border-blue-500 font-mono text-center shrink-0"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-3 bg-slate-900/60 border border-slate-850 rounded-2xl">
                                    <div>
                                        <span className="text-[11px] font-black text-slate-200 block uppercase tracking-wider">Sick Leave</span>
                                        <span className="text-[9px] font-bold text-slate-500 block mt-0.5">Numerical Limit allocation</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        value={balanceInput.sickLeaveBalance}
                                        onChange={(e) => setBalanceInput({ ...balanceInput, sickLeaveBalance: e.target.value })}
                                        className="w-20 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-slate-200 focus:border-blue-500 font-mono text-center shrink-0"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-3 bg-slate-900/60 border border-slate-850 rounded-2xl">
                                    <div>
                                        <span className="text-[11px] font-black text-slate-200 block uppercase tracking-wider">Earned Leave</span>
                                        <span className="text-[9px] font-bold text-slate-500 block mt-0.5">Numerical Limit allocation</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        value={balanceInput.earnedLeaveBalance}
                                        onChange={(e) => setBalanceInput({ ...balanceInput, earnedLeaveBalance: e.target.value })}
                                        className="w-20 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none text-slate-200 focus:border-blue-500 font-mono text-center shrink-0"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/60">
                                <button
                                    type="button"
                                    onClick={() => setIsBalanceModalOpen(false)}
                                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                                >
                                    Save Balances
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRLeaveManagement;
