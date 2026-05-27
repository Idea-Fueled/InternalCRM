import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { userService, taskService } from '../../api/services';
import { 
  Search, Filter, Users, CheckCircle2, Clock, AlertCircle, 
  MoreVertical, X, Calendar, Activity, Briefcase, Download
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

const TeamLeadTeam = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [team, setTeam] = useState([]);
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
                    userService.getAllUsers(),
                    taskService.getAllTasks()
                ]);
                
                if (usersRes.data?.data && tasksRes.data?.success) {
                    const allUsers = usersRes.data.data;
                    const allTasks = tasksRes.data.tasks;
                    
                    const teamMembers = allUsers.map((u, i) => {
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
                                className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export PDF
                            </button>
                        </div>
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
                                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group flex flex-col"
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
                                                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{member.name}</h3>
                                                    <p className="text-xs font-medium text-slate-500">{member.role}</p>
                                                </div>
                                            </div>
                                            <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="mb-5">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${AVAILABILITY_COLORS[member.availability]}`}>
                                                {member.availability}
                                            </span>
                                        </div>

                                        {/* Performance Bar */}
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
                                    <p className="text-sm font-medium text-slate-500 mt-1">{selectedMember.role}</p>
                                    
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
