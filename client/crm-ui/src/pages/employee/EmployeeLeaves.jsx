import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { leaveService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { 
    Calendar, CheckCircle2, XCircle, Clock, Info, 
    ChevronRight, Plus, Eye, Send, ArrowRight
} from "lucide-react";

const EmployeeLeaves = () => {
    const { user, checkAuth } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Application Form States
    const [formInput, setFormInput] = useState({
        leaveType: "Casual Leave",
        startDate: "",
        endDate: "",
        reason: ""
    });
    const [submitting, setSubmitting] = useState(false);

    const loadLeavesData = async () => {
        try {
            setLoading(true);
            const res = await leaveService.getLeaves();
            if (res.data?.success && Array.isArray(res.data.data)) {
                setLeaves(res.data.data);
            }
        } catch (err) {
            console.error("Failed to load employee leave requests:", err);
            toast.error("Failed to load leave history.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeavesData();
    }, []);

    const handleApplySubmit = async (e) => {
        e.preventDefault();
        
        if (!formInput.startDate || !formInput.endDate || !formInput.reason) {
            toast.error("All fields are required!");
            return;
        }

        try {
            setSubmitting(true);
            const res = await leaveService.applyLeave(formInput);
            if (res.data?.success) {
                toast.success("Leave application submitted successfully!");
                setFormInput({
                    leaveType: "Casual Leave",
                    startDate: "",
                    endDate: "",
                    reason: ""
                });
                // Reload data and check auth to sync user leave balances!
                await Promise.all([loadLeavesData(), checkAuth()]);
            }
        } catch (err) {
            console.error("Leave application failed:", err);
            toast.error(err.response?.data?.message || "Failed to submit leave request.");
        } finally {
            setSubmitting(false);
        }
    };

    const userRole = user?.role || "employee";

    return (
        <div className="flex h-screen bg-slate-50/50 text-slate-800 overflow-hidden font-sans">
            <AdminSidebar role={userRole === "TL" ? "teamLead" : userRole === "qa" ? "qa" : "employee"} />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
                <Topbar DashboardTile="Leave Center" role={userRole === "TL" ? "teamLead" : userRole === "qa" ? "qa" : "employee"} />
                
                <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
                    {/* Header Banner */}
                    <div className="bg-white border border-slate-200/60 shadow-sm rounded-[24px] p-6">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800">Leave Center</h1>
                        <p className="text-slate-500 text-xs font-semibold mt-1">Apply for annual leave, view numerical balances, and track approvals.</p>
                    </div>

                    {/* Balance Cards Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-5 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/80 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Casual Leave</span>
                            <p className="text-2xl font-black text-slate-800 mt-1.5 font-mono">{user?.casualLeaveBalance ?? 12}</p>
                            <span className="text-[9px] text-slate-450 font-bold block mt-1">days remaining</span>
                        </div>
                        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-5 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/80 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Sick Leave</span>
                            <p className="text-2xl font-black text-slate-800 mt-1.5 font-mono">{user?.sickLeaveBalance ?? 10}</p>
                            <span className="text-[9px] text-slate-450 font-bold block mt-1">days remaining</span>
                        </div>
                        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-5 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/80 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Earned Leave</span>
                            <p className="text-2xl font-black text-slate-800 mt-1.5 font-mono">{user?.earnedLeaveBalance ?? 15}</p>
                            <span className="text-[9px] text-slate-450 font-bold block mt-1">days remaining</span>
                        </div>
                        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-5 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Unpaid Leave</span>
                            <p className="text-2xl font-black text-slate-700 mt-1.5 font-mono">∞</p>
                            <span className="text-[9px] text-slate-450 font-bold block mt-1">Unlimited</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Application Form */}
                        <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-[28px] p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                                <Send className="w-4 h-4 text-blue-500" />
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Apply for Leave</h3>
                            </div>
                            
                            <form onSubmit={handleApplySubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leave Type *</label>
                                    <select
                                        value={formInput.leaveType}
                                        onChange={(e) => setFormInput({ ...formInput, leaveType: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-bold"
                                    >
                                        <option value="Casual Leave">Casual Leave (Limited)</option>
                                        <option value="Sick Leave">Sick Leave (Limited)</option>
                                        <option value="Earned Leave">Earned Leave (Limited)</option>
                                        <option value="Unpaid Leave">Unpaid Leave (Unlimited)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formInput.startDate}
                                        onChange={(e) => setFormInput({ ...formInput, startDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-bold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formInput.endDate}
                                        onChange={(e) => setFormInput({ ...formInput, endDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-bold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason *</label>
                                    <textarea
                                        required
                                        rows="4"
                                        placeholder="Brief details regarding leave reason..."
                                        value={formInput.reason}
                                        onChange={(e) => setFormInput({ ...formInput, reason: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none font-medium"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg disabled:opacity-50 active:scale-95 cursor-pointer mt-2"
                                >
                                    {submitting ? "Submitting Application..." : "Submit Leave Application"}
                                </button>
                            </form>
                        </div>

                        {/* Leave History list */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-3">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">My Leave History</h3>
                            </div>
                            
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-slate-500 text-xs font-bold">Retrieving history...</span>
                                </div>
                            ) : leaves.length === 0 ? (
                                <div className="text-center py-16 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                                    <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                    <h3 className="text-xs font-bold text-slate-500">No leave applications found</h3>
                                    <p className="text-slate-450 text-[10px] mt-1">Applications you file in the future will be documented here.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {leaves.map(l => (
                                        <div key={l._id} className="p-4 bg-white border border-slate-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:scale-[1.005] duration-200 transition-all">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-800">{l.leaveType}</span>
                                                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{l.totalDays} days</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500">
                                                    Period: {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                                </p>
                                                <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-lg mt-2 text-[10px] font-medium text-slate-600 italic">
                                                    "{l.reason}"
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                    l.status === "Pending" ? "bg-amber-55 text-amber-600 border-amber-200" :
                                                    l.status === "Approved" ? "bg-emerald-55 text-emerald-600 border-emerald-250" :
                                                    "bg-rose-55 text-rose-600 border-rose-200"
                                                }`}>
                                                    {l.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default EmployeeLeaves;
