import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { useAuth } from '../../context/AuthContext';
import { userService, taskService } from '../../api/services';
import { 
  Search, Filter, Users, CheckCircle2, Clock, AlertCircle, 
  MoreVertical, X, Calendar, Activity, Briefcase, Download,
  UserCheck, Mail, User, Phone
} from 'lucide-react';
import { exportPDF } from '../../utils/pdfExport';
import StatDetailModal from '../../components/StatDetailModal';

const AVAILABILITY_COLORS = {
  'Free': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Busy': 'bg-blue-100 text-blue-700 border-blue-200',
  'Overloaded': 'bg-rose-100 text-rose-700 border-rose-200'
};

const TASK_STATUS_COLORS = {
  'New': 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-emerald-100 text-emerald-700',
  'Overdue': 'bg-rose-100 text-rose-700',
};

const getInactivityDaysLeft = (inactiveUntil) => {
    if (!inactiveUntil) return "Indefinite";
    const diffTime = new Date(inactiveUntil) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days remaining` : "Reactivating...";
};

const formatRole = (r) => {
    if (!r) return 'Employee';
    const lower = r.toString().toLowerCase();
    if (lower === 'tl') return 'Team Lead';
    if (lower === 'qa') return 'QA';
    if (lower === 'admin') return 'Admin';
    if (lower === 'developer') return 'Developer';
    return r.charAt(0).toUpperCase() + r.slice(1);
};

const getUserRoleCategory = (u) => {
    if (!u) return 'employee';
    const role = (u.role || '').toLowerCase();
    const designation = (u.designation || '').toLowerCase();
    if (role === 'admin' || designation === 'admin') {
        return 'admin';
    }
    if (role === 'hr' || designation.includes('hr')) {
        return 'hr';
    }
    const checkText = designation || role;
    if (checkText.includes('qa')) {
        return 'qa';
    }
    if (checkText.includes('team lead') || checkText.includes('lead') || role === 'tl') {
        return 'TL';
    }
    return 'employee';
};

const TeamLeadTeam = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [team, setTeam] = useState([]);
    const [reportingManagers, setReportingManagers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("All");
    const [filterAvailability, setFilterAvailability] = useState("All");
    const [selectedMember, setSelectedMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });

    const handleTaskClick = (taskId) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('taskId', taskId);
        nextParams.delete('projectId');
        setSearchParams(nextParams, { replace: true });
        setSelectedMember(null); // Close member drawer
    };

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                const [usersRes, tasksRes] = await Promise.all([
                    userService.getAllUsers({ orgTree: true }),
                    taskService.getAllTasks()
                ]);
                
                if (usersRes.data?.data && tasksRes.data?.success) {
                    const allUsers = usersRes.data.data;
                    const allTasks = tasksRes.data.tasks;
                    
                    // Resolve Reporting Managers strictly from database relationships
                    const getManagersForUser = (userObj) => {
                        let ids = [];
                        if (userObj.reportingManagers && userObj.reportingManagers.length > 0) {
                            ids = userObj.reportingManagers.map(m => m._id || m);
                        } else if (userObj.reportingManager) {
                            ids = [userObj.reportingManager._id || userObj.reportingManager];
                        } else if (userObj.teamLeads && userObj.teamLeads.length > 0) {
                            ids = userObj.teamLeads.map(tl => tl._id || tl);
                        }
                        const idStrings = [...new Set(ids.map(id => {
                            if (!id) return "";
                            return typeof id === 'object' ? String(id._id || id) : String(id);
                        }))].filter(Boolean);
                        return allUsers.filter(u => idStrings.includes(String(u._id)));
                    };

                    const managers = getManagersForUser(user);
                    const formattedManagers = managers.map(mgr => ({
                        ...mgr,
                        id: mgr._id,
                        status: mgr.status === "inactive" ? "Inactive" : "Active"
                    }));
                    setReportingManagers(formattedManagers);
                    
                    const myId = user?._id;
                    const filteredUsers = allUsers.filter(u => {
                        const isSelf = String(u._id) === String(myId);
                        
                        const inSameDept = user?.department && u.department && String(u.department).toLowerCase().trim() === String(user.department).toLowerCase().trim();
                        
                        const isDirectReport = (
                            u.reportingManagers?.some(m => String(m._id || m) === String(myId)) ||
                            String(u.reportingManager?._id || u.reportingManager) === String(myId) ||
                            u.teamLeads?.some(tl => String(tl._id || tl) === String(myId))
                        );
                        
                        return isSelf || inSameDept || isDirectReport;
                    });
                    
                    const teamMembers = filteredUsers.map((u, i) => {
                        const userTasks = allTasks.filter(t => t.assignedTo?._id === u._id);
                        const completed = userTasks.filter(t => t.status === "Completed" || t.status === "Done").length;
                        const overdue = userTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length;
                        
                        const pending = userTasks.length - completed;
                        const availability = pending === 0 ? "Free" : (pending > 5 ? "Overloaded" : "Busy");
                        
                        const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-slate-500'];
                        
                        return {
                            ...u,
                            id: u._id,
                            initial: u.name?.substring(0, 2).toUpperCase() || 'U',
                            availability,
                            status: u.status === 'inactive' ? 'Inactive' : 'Active',
                            avatarColor: colors[i % colors.length],
                            stats: { total: userTasks.length, completed, overdue },
                            tasks: userTasks
                        };
                    });
                    
                    setTeam(teamMembers);
                }
            } catch (error) {
                console.error("Failed to fetch team data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeamData();
    }, []);

    // Calculate Insights
    const totalMembers = team.length;
    const totalAssigned = team.reduce((acc, emp) => acc + emp.stats.total, 0);
    const totalCompleted = team.reduce((acc, emp) => acc + emp.stats.completed, 0);
    const totalOverdue = team.reduce((acc, emp) => acc + emp.stats.overdue, 0);

    const filteredTeam = team.filter(member => {
        const matchesSearch = member.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              member.role?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === "All" || member.role === filterRole;
        const matchesAvailability = filterAvailability === "All" || member.availability === filterAvailability;
        return matchesSearch && matchesRole && matchesAvailability;
    });

    const uniqueRoles = ["All", ...new Set(team.map(m => m.role).filter(Boolean))];

    const handleExportTeam = () => {
        const columns = ["Name", "Role", "Availability", "Tasks (Done/Total)", "Overdue", "Performance %"];
        const data = filteredTeam.map(m => [
            m.name,
            m.role,
            m.availability,
            `${m.stats.completed}/${m.stats.total}`,
            m.stats.overdue,
            `${m.stats.total > 0 ? Math.round((m.stats.completed / m.stats.total) * 100) : 0}%`
        ]);
        exportPDF({
            title: "Team Performance & Availability Report",
            filename: `team_report_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="teamLead" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="Team Management" role="teamLead" />
                
                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
                    
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="dashboard-heading">Team Overview</h1>
                            <p className="dashboard-subheading">Manage workload, track performance, and view member availability.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleExportTeam}
                                disabled={filteredTeam.length === 0}
                                className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition shadow-sm"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Reporting Manager Section */}
                    <div className="space-y-3 mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-blue-500" />
                            Reporting Manager
                        </h3>
                        
                        {reportingManagers.length > 0 ? (
                            <div className="space-y-3">
                                {reportingManagers.map(mgr => (
                                    <div 
                                        key={mgr.id} 
                                        className={`p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-2xl transition-all ${
                                            mgr.status === 'Inactive' 
                                                ? 'bg-slate-50 border-slate-200/85' 
                                                : 'bg-white border-slate-200/60 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="relative flex-shrink-0">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm overflow-hidden ${
                                                    mgr.status === 'Inactive' ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700'
                                                }`}>
                                                    {mgr.profilePic ? (
                                                        <img src={mgr.profilePic} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        mgr.name?.charAt(0) || "M"
                                                    )}
                                                </div>
                                                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full z-10 shadow-sm ${
                                                    mgr.status === 'Inactive' ? 'bg-slate-400' : 'bg-emerald-500'
                                                }`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className={`text-base font-bold truncate ${mgr.status === 'Inactive' ? 'text-slate-500' : 'text-slate-800'}`}>{mgr.name}</h4>
                                                    {mgr.status === 'Inactive' && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider shrink-0">Inactive</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                    <p className="text-xs font-semibold text-slate-500 capitalize">
                                                        {mgr.designation || (mgr.role === 'TL' ? 'Team Lead' : (mgr.role === 'admin' ? 'Corporate Admin' : mgr.role))}
                                                    </p>
                                                    {mgr.department && (
                                                        <>
                                                            <span className="text-slate-300 text-xs font-semibold">•</span>
                                                            <p className="text-xs font-semibold text-slate-450 capitalize">
                                                                {mgr.department}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1.5 font-medium">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    <span className="truncate">{mgr.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {mgr.status === 'Inactive' && (
                                            <div className="sm:max-w-xs p-3 bg-slate-100/50 border border-slate-200/40 rounded-xl text-xs space-y-1 self-stretch flex flex-col justify-center">
                                                {user?.role === 'admin' && (
                                                    <div className="flex items-start gap-1 min-w-0">
                                                        <span className="font-bold text-slate-700 shrink-0">Reason:</span>
                                                        <span className="truncate italic text-slate-600">{mgr.inactiveReason || "None specified"}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="font-bold text-slate-700">Duration:</span>
                                                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-[10px]">
                                                        {mgr.inactiveUntil ? `${getInactivityDaysLeft(mgr.inactiveUntil)}` : "Indefinite"}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-5 bg-white border border-slate-200 rounded-2xl max-w-2xl text-center text-sm font-semibold text-slate-450 shadow-sm">
                                No supervisor/reporting manager assigned in your organization tree.
                            </div>
                        )}
                    </div>

                    {/* Insights Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div onClick={() => setStatModal({ isOpen: true, title: "Total Members", data: team, type: "employee" })} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 hover:scale-[1.02] cursor-pointer transition-all">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Total Members</p>
                                <p className="text-2xl font-bold text-slate-800">{totalMembers}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div onClick={() => setStatModal({ isOpen: true, title: "Total Assigned Tasks", data: team.flatMap(m => m.tasks), type: "task" })} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 hover:scale-[1.02] cursor-pointer transition-all">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Total Assigned Tasks</p>
                                <p className="text-2xl font-bold text-slate-800">{totalAssigned}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Briefcase className="w-5 h-5" />
                            </div>
                        </div>
                        <div onClick={() => setStatModal({ isOpen: true, title: "Tasks Completed", data: team.flatMap(m => m.tasks).filter(t => t.status === "Completed" || t.status === "Done"), type: "task" })} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-300 hover:scale-[1.02] cursor-pointer transition-all">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Tasks Completed</p>
                                <p className="text-2xl font-bold text-emerald-600">{totalCompleted}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                        <div onClick={() => setStatModal({ isOpen: true, title: "Overdue Tasks", data: team.flatMap(m => m.tasks).filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done"), type: "task" })} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-rose-300 hover:scale-[1.02] cursor-pointer transition-all">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Overdue Tasks</p>
                                <p className="text-2xl font-bold text-rose-600">{totalOverdue}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name or role..." 
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role:</span>
                                <select 
                                    className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                >
                                    {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Availability:</span>
                                <select 
                                    className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
                                    value={filterAvailability}
                                    onChange={(e) => setFilterAvailability(e.target.value)}
                                >
                                    <option value="All">All</option>
                                    <option value="Free">Free</option>
                                    <option value="Busy">Busy</option>
                                    <option value="Overloaded">Overloaded</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Team Members Grid */}
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">Loading team data...</div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
                        {filteredTeam.map(member => {
                            const completionRatio = member.stats.total > 0 
                                ? Math.round((member.stats.completed / member.stats.total) * 100) 
                                : 0;
                            
                            return (
                                <div 
                                    key={member.id} 
                                    onClick={() => setSelectedMember(member)}
                                    className={`rounded-2xl border shadow-sm transition-all cursor-pointer group flex flex-col ${
                                        member.status === 'Inactive' 
                                            ? 'bg-slate-50 border-slate-200/85 hover:shadow-md hover:border-slate-355'
                                            : 'bg-white border-slate-200 hover:shadow-lg hover:border-blue-300'
                                    }`}
                                >
                                    <div className="p-5 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className={`w-12 h-12 rounded-full ${member.avatarColor} text-white flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden`}>
                                                        {member.profilePic ? (
                                                            <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            member.initial
                                                        )}
                                                    </div>
                                                    {member.status === 'Active' ? (
                                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full z-10 shadow-sm"></div>
                                                    ) : member.status === 'Inactive' ? (
                                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-400 border-2 border-white rounded-full z-10 shadow-sm"></div>
                                                    ) : null}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`font-bold text-lg group-hover:text-blue-600 transition-colors ${member.status === 'Inactive' ? 'text-slate-500' : 'text-slate-800'}`}>{member.name}</h3>
                                                        {member.status === 'Inactive' && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider shrink-0">Inactive</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500">{member.designation || formatRole(member.role)}</p>
                                                </div>
                                            </div>
                                            <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="mb-5 flex flex-wrap gap-2 items-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${AVAILABILITY_COLORS[member.availability]}`}>
                                                {member.availability}
                                            </span>
                                        </div>
                                        
                                        {member.status === 'Inactive' ? (
                                            <div className="mb-5 p-2.5 bg-slate-100/50 border border-slate-200/40 rounded-xl text-xs space-y-1">
                                                <div className="flex items-start gap-1 min-w-0">
                                                    <span className="font-bold text-slate-700 shrink-0">Reason:</span>
                                                    <span className="truncate italic text-slate-600">{member.inactiveReason || "None specified"}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="font-bold text-slate-700">Duration:</span>
                                                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-[10px]">
                                                        {member.inactiveUntil ? `${getInactivityDaysLeft(member.inactiveUntil)} (Until ${new Date(member.inactiveUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})` : "Indefinite"}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : getUserRoleCategory(member) !== 'admin' ? (
                                            /* Performance Bar */
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-xs font-semibold">
                                                    <span className="text-slate-500">Task Completion</span>
                                                    <span className="text-slate-800">{completionRatio}%</span>
                                                </div>
                                                <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${
                                                            completionRatio > 80 ? 'bg-emerald-500' : 
                                                            completionRatio > 40 ? 'bg-blue-500' : 'bg-amber-500'
                                                        }`}
                                                        style={{ width: `${completionRatio}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                    
                                    {getUserRoleCategory(member) !== 'admin' && (
                                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex justify-between items-center">
                                            <div className="flex items-center gap-4 text-xs font-semibold">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">Total</span>
                                                    <span className="text-slate-700">{member.stats.total}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-emerald-500 uppercase tracking-wider text-[9px]">Done</span>
                                                    <span className="text-emerald-700">{member.stats.completed}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-rose-400 uppercase tracking-wider text-[9px]">Overdue</span>
                                                    <span className="text-rose-600">{member.stats.overdue}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
                    )}
                    {!loading && filteredTeam.length === 0 && (
                        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-slate-600">No members found</h3>
                            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters.</p>
                        </div>
                    )}
                </main>

                {/* Team Member Details Drawer */}
                {selectedMember && (
                    <div className="absolute inset-0 z-50 flex justify-end">
                        <div 
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setSelectedMember(null)}
                        />
                        <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300">
                            
                            {/* Drawer Header */}
                            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50 relative">
                                <button 
                                    onClick={() => setSelectedMember(null)}
                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                
                                <div className="flex flex-col items-center mt-2">
                                    <div className="relative mb-4">
                                        <div className={`w-20 h-20 rounded-full ${selectedMember.avatarColor} text-white flex items-center justify-center font-bold text-3xl shadow-md overflow-hidden`}>
                                            {selectedMember.profilePic ? (
                                                <img src={selectedMember.profilePic} alt={selectedMember.name} className="w-full h-full object-cover" />
                                            ) : (
                                                selectedMember.initial
                                            )}
                                        </div>
                                        {selectedMember.status === 'Active' ? (
                                            <div className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full z-10 shadow-sm"></div>
                                        ) : selectedMember.status === 'Inactive' ? (
                                            <div className="absolute bottom-0 right-1 w-4 h-4 bg-slate-400 border-2 border-white rounded-full z-10 shadow-sm"></div>
                                        ) : null}
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedMember.name}</h2>
                                    <p className="text-sm font-medium text-slate-500 mt-1">{selectedMember.designation || formatRole(selectedMember.role)}</p>
                                    {/* Top-level Contact Info */}
                                    <div className="flex flex-col items-center gap-1.5 mt-2.5 text-xs text-slate-500 font-semibold">
                                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedMember.email}</span>
                                        {selectedMember.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedMember.phone}</span>}
                                    </div>
                                    
                                    <div className="flex gap-2 mt-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${AVAILABILITY_COLORS[selectedMember.availability]}`}>
                                            {selectedMember.availability}
                                        </span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-slate-200 bg-white text-slate-600">
                                            {selectedMember.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {selectedMember.status === 'Inactive' && (
                                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-2.5 text-xs text-slate-600 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">Inactivity Profile</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Reason for Inactivity</span>
                                            <p className="italic text-slate-700 text-xs font-semibold">{selectedMember.inactiveReason || "No reason specified"}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Duration</span>
                                            <p className="text-slate-800 font-bold">
                                                {selectedMember.inactiveUntil ? `${getInactivityDaysLeft(selectedMember.inactiveUntil)} (Until ${new Date(selectedMember.inactiveUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})` : "Indefinite"}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {getUserRoleCategory(selectedMember) === 'admin' ? (
                                    <div className="space-y-6">
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-4">
                                            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center gap-2">
                                                <User className="w-4 h-4 text-blue-500" />
                                                Admin Information
                                            </h3>
                                            <div className="space-y-3.5 text-xs font-semibold text-slate-650 leading-relaxed">
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                                                    <span className="text-slate-800 mt-1 block font-bold">{selectedMember.name}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Designation</span>
                                                    <span className="text-slate-800 mt-1 block font-bold">{selectedMember.designation || "Corporate Administrator"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                                                    <span className="text-slate-800 mt-1 block">{selectedMember.department || "Administration"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                                                    <span className="text-slate-800 mt-1 block font-mono">{selectedMember.email}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                                                    <span className="text-slate-800 mt-1 block">{selectedMember.phone || "Not provided"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] mt-1 border ${selectedMember.status === "Inactive" ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                                                        {selectedMember.status}
                                                    </span>
                                                </div>
                                                {selectedMember.reportingManager && (
                                                    <div>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Reporting Manager</span>
                                                        <span className="text-slate-800 mt-1 block">{selectedMember.reportingManager?.name || selectedMember.reportingManager}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : getUserRoleCategory(selectedMember) === 'TL' ? (
                                    <div className="space-y-6">
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-4">
                                            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-purple-500" />
                                                Team & Project Metrics
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-xl border border-slate-150 text-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Managed Tasks</span>
                                                    <span className="text-xl font-bold text-purple-700 mt-1 block">{selectedMember.tasks?.length || 0}</span>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-slate-150 text-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                                                    <span className="text-xl font-bold text-emerald-700 mt-1 block">{selectedMember.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : getUserRoleCategory(selectedMember) === 'qa' ? (
                                    <div className="space-y-6">
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-4">
                                            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                QA Review Metrics
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-xl border border-slate-150 text-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Reviewed Tasks</span>
                                                    <span className="text-xl font-bold text-emerald-700 mt-1 block">{selectedMember.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0}</span>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-slate-150 text-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pending Reviews</span>
                                                    <span className="text-xl font-bold text-amber-700 mt-1 block">{selectedMember.tasks?.filter(t => t.status === "Testing" || t.status === "In Progress").length || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : getUserRoleCategory(selectedMember) === 'hr' ? (
                                    <div className="space-y-6">
                                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-4">
                                            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center gap-2">
                                                <Users className="w-4 h-4 text-pink-500" />
                                                HR Management Metrics
                                            </h3>
                                            <div className="bg-white p-4 rounded-xl border border-slate-150 text-center">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Roster Access</span>
                                                <span className="text-xl font-bold text-pink-700 mt-1 block">Active HR Executive</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Quick Stats */}
                                        <div className="grid grid-cols-3 gap-3 mb-8">
                                            <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
                                                <p className="text-xl font-bold text-slate-800">{selectedMember.stats.total}</p>
                                            </div>
                                            <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100">
                                                <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Done</p>
                                                <p className="text-xl font-bold text-emerald-700">{selectedMember.stats.completed}</p>
                                            </div>
                                            <div className="bg-rose-50 p-4 rounded-2xl text-center border border-rose-100">
                                                <p className="text-[10px] font-bold text-rose-600/70 uppercase tracking-wider mb-1">Overdue</p>
                                                <p className="text-xl font-bold text-rose-700">{selectedMember.stats.overdue}</p>
                                            </div>
                                        </div>

                                        {/* Active Tasks List */}
                                        <div className="mb-6">
                                            <h3 className="section-title mb-4 flex items-center">
                                                <Briefcase className="w-4 h-4 mr-2 text-indigo-500" />
                                                Assigned Tasks
                                            </h3>
                                            
                                            <div className="space-y-3">
                                                {selectedMember.tasks.map(task => (
                                                    <div 
                                                        key={task.id} 
                                                        onClick={() => handleTaskClick(task._id || task.id)}
                                                        className="p-4 border border-slate-200 rounded-xl hover:bg-blue-50/50 hover:border-l-blue-500 hover:border-blue-300 border-l-4 border-l-transparent cursor-pointer transition-all group"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{task.taskName}</h4>
                                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS['New']}`}>
                                                                {task.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-3 text-xs">
                                                            <div className={`flex items-center font-medium ${task.endDate && new Date(task.endDate) < new Date() ? 'text-rose-600' : 'text-slate-500'}`}>
                                                                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                                                {task.endDate ? new Date(task.endDate).toLocaleDateString() : "No deadline"}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                {task.priority} Priority
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {selectedMember.tasks.length === 0 && (
                                                    <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium">
                                                        No tasks currently assigned.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{__html: `
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                        height: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                `}} />
            </div>
            
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

export default TeamLeadTeam;
