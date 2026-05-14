import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { notificationService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { 
    History, Search, Filter, Calendar, 
    CheckCircle2, XCircle, Clock, MessageSquare,
    ChevronLeft, ChevronRight, Download
} from "lucide-react";
import { exportPDF } from "../../utils/pdfExport";

const AuditLogs = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");
    
    // Determine role for sidebar
    const role = user?.role === 'TL' ? 'teamLead' : user?.role || 'admin';

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await notificationService.getMyNotifications();
            if (res.data.success) {
                // We use notifications as audit logs for now as they track history
                setLogs(res.data.notifications || []);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             log.message.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === "All" || log.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleExport = () => {
        const columns = ["Date", "Action", "Description", "Category"];
        const data = filteredLogs.map(log => [
            new Date(log.createdAt).toLocaleString(),
            log.title,
            log.message,
            (log.category || "System").replace(/_/g, ' ')
        ]);

        exportPDF({
            title: `Audit Logs - ${user?.name || 'User'}`,
            filename: `audit_logs_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar role={role} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Audit Logs" role={role} />
                
                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Audit Logs</h1>
                            <p className="text-sm font-medium text-slate-500 mt-1">Track all your activities and system interactions in one place.</p>
                        </div>
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export History
                        </button>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col xl:flex-row gap-4 justify-between xl:items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60">
                        <div className="relative w-full xl:w-96">
                            <input
                                type="text"
                                placeholder="Search history..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition text-sm font-medium placeholder-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-3 top-2.5 text-slate-400">
                                <Search className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select 
                                className="px-4 py-2 bg-slate-50 border-none text-slate-600 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                <option value="assignment">Assignments</option>
                                <option value="status_change">Status Changes</option>
                                <option value="approval">Approvals</option>
                                <option value="creation">Creations</option>
                            </select>

                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Event</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic">Loading audit history...</td>
                                        </tr>
                                    ) : filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <History className="w-12 h-12 text-slate-200 mb-2" />
                                                    <p className="text-slate-500 font-medium">No logs found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredLogs.map((log) => {
                                        const isApprove = log.category === 'approval';
                                        const isReject = log.category === 'rejection';
                                        
                                        return (
                                            <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">{new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                                            isApprove ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                            isReject ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                                            'bg-blue-50 border-blue-100 text-blue-600'
                                                        }`}>
                                                            {isApprove ? <CheckCircle2 className="w-4 h-4" /> :
                                                             isReject ? <XCircle className="w-4 h-4" /> :
                                                             log.type === 'project' ? <MessageSquare className="w-4 h-4" /> :
                                                             <Clock className="w-4 h-4" />}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-800">{log.title}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                                        isApprove ? 'bg-emerald-50 text-emerald-600' :
                                                        isReject ? 'bg-rose-50 text-rose-600' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {(log.category || "System").replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-slate-600 max-w-md line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                                                        {log.message}
                                                    </p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Footer */}
                        <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <p className="text-xs font-bold text-slate-400">Showing {filteredLogs.length} entries</p>
                            <div className="flex gap-2">
                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AuditLogs;
