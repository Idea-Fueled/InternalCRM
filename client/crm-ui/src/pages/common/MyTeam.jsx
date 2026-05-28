import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { userService, taskService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { 
    Users, ShieldAlert, Award, Calendar, CheckCircle2, AlertCircle, Briefcase, Mail, UserCheck
} from "lucide-react";

const getInactivityDaysLeft = (inactiveUntil) => {
    if (!inactiveUntil) return "Indefinite";
    const diffTime = new Date(inactiveUntil) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days remaining` : "Reactivating...";
};

const AVAILABILITY_COLORS = {
    'Free': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Busy': 'bg-blue-100 text-blue-700 border-blue-200',
    'Overloaded': 'bg-rose-100 text-rose-700 border-rose-200'
};

const MyTeam = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [reportingManagers, setReportingManagers] = useState([]);
    const [teammates, setTeammates] = useState([]);
    
    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                if (!user) return;
                
                const [usersRes, tasksRes] = await Promise.all([
                    userService.getAllUsers({ orgTree: true }),
                    taskService.getAllTasks()
                ]);
                
                if (usersRes.data?.data && tasksRes.data?.success) {
                    const allUsers = usersRes.data.data;
                    const allTasks = tasksRes.data.tasks;
                    
                    const getIdString = (id) => {
                        if (!id) return "";
                        if (typeof id === 'object') return id._id ? String(id._id) : String(id);
                        return String(id);
                    };
                    
                    const userRole = user.role;
                    const myTeamLeadIds = (user.teamLeads || []).map(tl => getIdString(tl._id || tl));
                    
                    // 1. Resolve Reporting Managers
                    let managers = [];
                    if (userRole === "TL") {
                        // TL reports to assigned team leads if set, else falls back to Admins
                        if (myTeamLeadIds.length > 0) {
                            managers = allUsers.filter(u => myTeamLeadIds.includes(getIdString(u._id)));
                        } else {
                            managers = allUsers.filter(u => u.role === "admin");
                        }
                    } else {
                        // Dev / QA reports to assigned Team Leads
                        managers = allUsers.filter(u => 
                            (u.role === "TL" || u.role === "admin") && myTeamLeadIds.includes(getIdString(u._id))
                        );
                    }
                    
                    const formattedManagers = managers.map(mgr => ({
                        ...mgr,
                        id: mgr._id,
                        status: mgr.status === "inactive" ? "Inactive" : "Active"
                    }));
                    setReportingManagers(formattedManagers);
                    
                    // 2. Resolve Teammates / Team Members
                    let teamMembers = [];
                    if (userRole === "TL") {
                        // TL's team members are developers and QAs assigned under them
                        teamMembers = allUsers.filter(u => 
                            (u.teamLeads || []).map(tl => getIdString(tl._id || tl)).includes(getIdString(user._id))
                        );
                    } else {
                        // Dev / QA: teammates assigned to same Team Lead
                        if (myTeamLeadIds.length > 0) {
                            teamMembers = allUsers.filter(u => 
                                (u.teamLeads || []).map(tl => getIdString(tl._id || tl)).some(tlId => myTeamLeadIds.includes(tlId))
                            );
                        }
                    }
                    
                    const formattedTeammates = teamMembers.map((u, i) => {
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
                    
                    setTeammates(formattedTeammates);
                }
            } catch (err) {
                console.error("Failed to load my team details:", err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchTeamData();
    }, [user]);

    const displaySidebarRole = user?.role === 'TL' ? 'teamLead' : (user?.role === 'qa' ? 'qa' : 'employee');

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role={displaySidebarRole} />
            
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="My Team" role={displaySidebarRole} />
                
                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar space-y-8">
                    
                    {/* Header Section */}
                    <div>
                        <h1 className="dashboard-heading">My Team</h1>
                        <p className="dashboard-subheading">View your reporting structure, manager, and team members.</p>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <h3 className="text-lg font-bold text-slate-700">Loading your team structure...</h3>
                        </div>
                    ) : (
                        <>
                            {/* ─── Reporting Manager Section ──────────────────────────────── */}
                            <div className="space-y-3">
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
                                                        <p className="text-xs font-semibold text-slate-450 mt-1 capitalize">
                                                            {mgr.role === 'TL' ? 'Team Lead' : (mgr.role === 'admin' ? 'Corporate Admin' : mgr.role)}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1.5 font-medium">
                                                            <Mail className="w-3.5 h-3.5" />
                                                            <span className="truncate">{mgr.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {mgr.status === 'Inactive' && (
                                                    <div className="sm:max-w-xs p-3 bg-slate-100/50 border border-slate-200/40 rounded-xl text-xs space-y-1 self-stretch flex flex-col justify-center">
                                                        {(user?.role === 'admin' || user?.role === 'TL') && (
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

                            {/* ─── Teammates / Team Members Section ──────────────────────── */}
                            <div className="space-y-4 pt-4 border-t border-slate-200/50">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-500" />
                                        {user?.role === 'TL' ? "My Team Members" : "My Teammates"}
                                    </h3>
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-black">{teammates.length} Total</span>
                                </div>
                                
                                {teammates.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                                        {teammates.map(member => {
                                            const completionRatio = member.stats.total > 0 
                                                ? Math.round((member.stats.completed / member.stats.total) * 100) 
                                                : 0;
                                            const isSelf = member.id === user?._id;
                                            
                                            return (
                                                <div 
                                                    key={member.id} 
                                                    className={`rounded-2xl border shadow-sm transition-all flex flex-col relative ${
                                                        member.status === 'Inactive' 
                                                            ? 'bg-slate-50 border-slate-200/85 hover:shadow-md hover:border-slate-355'
                                                            : 'bg-white border-slate-200 hover:shadow-lg hover:border-blue-300'
                                                    }`}
                                                >
                                                    {isSelf && (
                                                        <span className="absolute top-3 right-3 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-blue-100 shadow-sm z-10">
                                                            You
                                                        </span>
                                                    )}
                                                    
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
                                                                        <h3 className={`font-bold text-base transition-colors ${member.status === 'Inactive' ? 'text-slate-500' : 'text-slate-800'}`}>{member.name}</h3>
                                                                        {member.status === 'Inactive' && (
                                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider shrink-0">Inactive</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs font-medium text-slate-500 capitalize">{member.role === 'TL' ? 'Team Lead' : (member.role === 'qa' ? 'QA' : member.role)}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mb-5 flex flex-wrap gap-2 items-center">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${AVAILABILITY_COLORS[member.availability]}`}>
                                                                {member.availability}
                                                            </span>
                                                        </div>

                                                        {member.status === 'Inactive' ? (
                                                            <div className="p-2.5 bg-slate-100/50 border border-slate-200/40 rounded-xl text-xs space-y-1">
                                                                {(user?.role === 'admin' || user?.role === 'TL') && (
                                                                    <div className="flex items-start gap-1 min-w-0">
                                                                        <span className="font-bold text-slate-700 shrink-0">Reason:</span>
                                                                        <span className="truncate italic text-slate-600">{member.inactiveReason || "None specified"}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <span className="font-bold text-slate-700">Duration:</span>
                                                                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-[10px]">
                                                                        {member.inactiveUntil ? `${getInactivityDaysLeft(member.inactiveUntil)}` : "Indefinite"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
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
                                                        )}
                                                    </div>
                                                    
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
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-20 bg-white border border-slate-200 rounded-2xl text-center">
                                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-slate-600">No teammates found</h3>
                                        <p className="text-slate-400 text-sm mt-1">Contact your supervisor to assign teammates under your reporting lead.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>

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
        </div>
    );
};

export default MyTeam;
