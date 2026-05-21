import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { dashboardService, projectService, userService, taskService } from '../../api/services';
import { 
  CheckCircle2, 
  Clock, 
  FolderKanban, 
  ListTodo, 
  MoreVertical, 
  TrendingUp, 
  Users, 
  AlertCircle,
  Activity
} from 'lucide-react';
import StatDetailModal from '../../components/StatDetailModal';

const TeamLeadDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalTeamTasks: 0,
        activeProjects: 0,
        qaReviewTasks: 0,
        overdueTasks: 0
    });
    const [teamMembers, setTeamMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });
    
    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "N/A";
        const seconds = Math.floor((new Date() - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [dashRes, projRes, usersRes, tasksRes] = await Promise.all([
                    dashboardService.getTeamLeadDashboard(),
                    projectService.getAllProjects(),
                    userService.getAllUsers(),
                    taskService.getAllTasks()
                ]);

                if (dashRes.data?.success) {
                    setStats(dashRes.data.data);
                }

                if (projRes.data?.success) {
                    const mappedProjects = (projRes.data.projects || []).map(p => ({
                        ...p,
                        id: p._id,
                        name: p.projectName
                    }));
                    setProjects(mappedProjects.slice(0, 3)); // Top 3 projects
                }

                if (usersRes.data?.success && tasksRes.data?.success) {
                    const allUsers = usersRes.data.data || [];
                    const allTasksFetched = tasksRes.data.tasks || [];
                    
                    setAllTasks(allTasksFetched);

                    const computedMembers = allUsers.map((u, i) => {
                        const userTasks = allTasksFetched.filter(t => t.assignedTo?._id === u._id);
                        const completed = userTasks.filter(t => t.status === "Completed" || t.status === "Done").length;
                        const overdue = userTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length;
                        const total = userTasks.length;
                        const pending = total - completed;
                        const status = pending === 0 ? "Free" : "Busy";
                        const workload = total > 0 ? Math.round((pending / total) * 100) : 0;
                        const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-orange-500', 'bg-slate-500'];
                        
                        return {
                            id: u._id,
                            name: u.name,
                            role: u.role,
                            initial: u.name?.substring(0, 2).toUpperCase() || "U",
                            total,
                            completed,
                            overdue,
                            status,
                            workload,
                            color: colors[i % colors.length],
                            profilePic: u.profilePic
                        };
                    });
                    setTeamMembers(computedMembers.slice(0, 4)); // Top 4 members

                    // Compute Recent Activity
                    const activities = [];
                    allTasksFetched.forEach(t => {
                        (t.statusHistory || []).forEach(h => {
                            activities.push({
                                id: h._id,
                                type: h.status,
                                task: t.taskName,
                                user: h.changedBy?.name || "Someone",
                                timestamp: new Date(h.changedAt).getTime()
                            });
                        });
                    });
                    setRecentActivity(activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30));
                }
            } catch (error) {
                console.error("Failed to fetch team lead dashboard data", error);
                if (error.response?.status === 401) {
                    navigate("/");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const kpis = [
      { title: "Team Tasks", value: stats.totalTeamTasks, icon: ListTodo, color: "text-blue-600", bg: "bg-blue-100/50", onClick: () => setStatModal({ isOpen: true, title: "Team Tasks", data: allTasks, type: "task" }) },
      { title: "Active Projects", value: stats.activeProjects, icon: FolderKanban, color: "text-indigo-600", bg: "bg-indigo-100/50", onClick: () => setStatModal({ isOpen: true, title: "Active Projects", data: projects, type: "project" }) },
      { title: "QA Review Tasks", value: stats.qaReviewTasks, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100/50", onClick: () => setStatModal({ isOpen: true, title: "Tasks in QA Review", data: allTasks.filter(t => t.status === "QA Review"), type: "task" }) },
      { title: "Overdue Tasks", value: stats.overdueTasks, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-100/50", onClick: () => setStatModal({ isOpen: true, title: "Overdue Tasks", data: allTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done"), type: "task" }) },
    ];

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="teamLead" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Team Lead Dashboard" role="teamLead" />
                
                <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="dashboard-heading">Overview</h1>
                            <p className="dashboard-subheading">Here's what's happening with your team today.</p>
                        </div>
                    </div>

                    {/* KPI Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {kpis.map((kpi, idx) => {
                            const variants = {
                                'bg-blue-100/50': 'blue',
                                'bg-indigo-100/50': 'indigo',
                                'bg-emerald-100/50': 'emerald',
                                'bg-amber-100/50': 'amber',
                                'bg-rose-100/50': 'rose'
                            };
                            const variant = variants[kpi.bg] || 'slate';
                            
                            return (
                                <div key={idx} onClick={kpi.onClick} className={`premium-stat-card ${variant} flex-row items-center gap-4 p-4 h-[90px] cursor-pointer hover:scale-[1.02] transition-transform`}>
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${kpi.bg.replace('100/50', '200')} ${kpi.color}`}>
                                        <kpi.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <h4 className="text-2xl font-bold tracking-tight text-slate-800 leading-none mb-1">{kpi.value}</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.title}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Middle Section: Projects and Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Projects Overview */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                                <h3 className="section-title flex items-center">
                                    <FolderKanban className="w-5 h-5 mr-2 text-indigo-500" />
                                    Active Projects
                                </h3>
                            </div>
                            <div className="p-6 flex-1">
                                <div className="space-y-6">
                                    {projects.length === 0 && !loading && (
                                        <div className="text-center py-6 text-slate-500 text-sm">No active projects</div>
                                    )}
                                    {projects.map(project => {
                                        // Calculate mock progress based on dates or just default to 0
                                        const progress = 0;
                                        return (
                                            <div key={project._id} className="group cursor-pointer">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div>
                                                        <h4 className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">{project.name}</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'} — {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${project.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            {project.status || 'Active'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        {(() => {
                                                            const totalTasks = project.tasks?.length || 0;
                                                            const completedTasks = project.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0;
                                                            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                                            return (
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${progress > 50 ? 'bg-indigo-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-600 w-10">
                                                        {project.tasks?.length > 0 
                                                            ? Math.round((project.tasks.filter(t => t.status === "Completed" || t.status === "Done").length / project.tasks.length) * 100) 
                                                            : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                                <h3 className="section-title flex items-center">
                                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                                    Recent Activity
                                </h3>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                {recentActivity.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                                        <Activity className="w-10 h-10 text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-500 font-medium">No recent activity</p>
                                    </div>
                                ) : (
                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2 space-y-6">
                                        {recentActivity.map((activity, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    activity.type === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 
                                                    activity.type === 'QA Review' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-slate-800">
                                                        <span className="font-bold">{activity.user}</span> moved <span className="font-semibold text-blue-600">{activity.task}</span> to <span className="font-bold">{activity.type}</span>
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{getTimeAgo(activity.timestamp)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Team Members */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="section-title flex items-center">
                                <Users className="w-5 h-5 mr-2 text-blue-600" />
                                Team Performance
                            </h3>
                            <Link to="/teamLead/team" className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                                        <th className="px-6 py-4 font-medium">Member</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Tasks</th>
                                        <th className="px-6 py-4 font-medium">Workload</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {teamMembers.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-slate-500 text-sm font-medium">
                                                No team members found
                                            </td>
                                        </tr>
                                    )}
                                    {teamMembers.map(member => (
                                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl ${member.color} text-white flex items-center justify-center font-bold shadow-sm overflow-hidden`}>
                                                        {member.profilePic ? (
                                                            <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            member.initial
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                                                        <p className="text-xs text-slate-500">{member.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                                    member.status === 'Free' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                        member.status === 'Free' ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`}></span>
                                                    {member.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-sm">
                                                    <div className="flex items-center justify-between w-32">
                                                        <span className="text-slate-500">Total:</span>
                                                        <span className="font-semibold text-slate-700">{member.total}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between w-32">
                                                        <span className="text-emerald-500">Completed:</span>
                                                        <span className="font-semibold text-slate-700">{member.completed}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between w-32">
                                                        <span className="text-rose-500">Overdue:</span>
                                                        <span className="font-semibold text-slate-700">{member.overdue}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden w-24">
                                                        <div 
                                                            className={`h-full rounded-full ${
                                                                member.workload > 80 ? 'bg-amber-500' : 
                                                                member.workload > 50 ? 'bg-blue-500' : 'bg-emerald-500'
                                                            }`}
                                                            style={{ width: `${member.workload}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600">{member.workload}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
            
            <StatDetailModal 
                isOpen={statModal.isOpen} 
                onClose={() => setStatModal({ ...statModal, isOpen: false })} 
                title={statModal.title} 
                data={statModal.data} 
                type={statModal.type} 
            />
        </div>
    )
}

export default TeamLeadDashboard;