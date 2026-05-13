import React, { useState, useEffect } from 'react';
import { projectService } from '../../api/services';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { 
  Search, Filter, Calendar, Users, 
  CheckCircle2, Clock, AlertCircle, LayoutList, ArrowLeft, ClipboardList
} from 'lucide-react';

const UserProjects = ({ role = "developer" }) => {
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [selectedProject, setSelectedProject] = useState(null);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await projectService.getAllProjects();
            const formatted = (res.data.projects || []).map(p => {
                const totalTasks = p.tasks?.length || 0;
                const completedTasks = p.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0;
                const overdueTasks = p.tasks?.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length || 0;
                
                return {
                    ...p,
                    id: p._id,
                    name: p.projectName,
                    status: p.status || "Active",
                    progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                    totalTasks,
                    overdueTasks,
                    members: p.teamMembers?.map(m => ({
                        id: m._id,
                        name: m.name,
                        initial: m.name.charAt(0)
                    })) || []
                };
            });
            setProjects(formatted);
        } catch (err) {
            console.error("Failed to fetch projects", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === "All" || p.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    if (selectedProject) {
        return (
            <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
                <AdminSidebar role={role} />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <Topbar DashboardTile="Project Details" />
                    
                    <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin">
                        <button 
                            onClick={() => setSelectedProject(null)}
                            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-semibold transition group mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Projects
                        </button>

                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Main Info */}
                            <div className="flex-1 space-y-6">
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -z-0 opacity-50"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{selectedProject.name}</h1>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                                        selectedProject.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                        {selectedProject.status}
                                                    </span>
                                                    <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        Created {formatDate(selectedProject.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-bold text-blue-600">{selectedProject.progress}%</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Progress</div>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full bg-slate-100 rounded-full h-3 mb-8">
                                            <div 
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" 
                                                style={{ width: `${selectedProject.progress}%` }}
                                            ></div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
                                                        <LayoutList className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks</span>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-800">{selectedProject.totalTasks}</div>
                                            </div>
                                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-800">{selectedProject.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0}</div>
                                            </div>
                                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-rose-100/50 rounded-lg text-rose-600">
                                                        <Clock className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue</span>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-800">{selectedProject.overdueTasks}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        Description
                                    </h3>
                                    <p className="text-slate-600 leading-relaxed font-medium">
                                        {selectedProject.description || "No description provided for this project."}
                                    </p>
                                </div>
                            </div>

                            {/* Sidebar Info */}
                            <div className="w-full lg:w-80 space-y-6">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Project Overview</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Start Date</span>
                                            <span className="text-sm font-bold text-slate-700">{formatDate(selectedProject.startDate)}</span>
                                        </div>
                                        <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Deadline</span>
                                            <span className="text-sm font-bold text-rose-600">{formatDate(selectedProject.endDate)}</span>
                                        </div>
                                        <div className="pt-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase block mb-3">Team Lead</span>
                                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                                                    {selectedProject.teamLead?.name?.charAt(0) || "L"}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-slate-800 truncate">{selectedProject.teamLead?.name || "N/A"}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Project Lead</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                                        Team Members
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{selectedProject.members.length}</span>
                                    </h3>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                        {selectedProject.members.map(member => (
                                            <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition cursor-default">
                                                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                                                    {member.initial}
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{member.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar role={role} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="My Projects" />
                
                <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Assigned Projects</h1>
                            <p className="text-sm font-medium text-slate-500 mt-1">Overview of projects you are currently a part of.</p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200/60">
                            <button onClick={() => setSelectedStatus("All")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${selectedStatus === 'All' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}>All</button>
                            <button onClick={() => setSelectedStatus("Active")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${selectedStatus === 'Active' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}>Active</button>
                            <button onClick={() => setSelectedStatus("Completed")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${selectedStatus === 'Completed' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}>Completed</button>
                        </div>
                    </div>

                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search your projects..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/60 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {[1,2,3].map(i => (
                                <div key={i} className="bg-white rounded-3xl p-6 h-64 animate-pulse border border-slate-200/60">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-4"></div>
                                    <div className="h-6 bg-slate-100 rounded-lg w-2/3 mb-3"></div>
                                    <div className="h-4 bg-slate-100 rounded-lg w-1/2 mb-6"></div>
                                    <div className="h-2 bg-slate-100 rounded-full w-full mb-8"></div>
                                    <div className="flex justify-between">
                                        <div className="h-8 bg-slate-100 rounded-lg w-20"></div>
                                        <div className="h-8 bg-slate-100 rounded-lg w-20"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-slate-200/60 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Filter className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">No projects found</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredProjects.map((p) => (
                                <div 
                                    key={p.id}
                                    onClick={() => setSelectedProject(p)}
                                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                                >
                                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -z-0 opacity-0 group-hover:opacity-10 transition-opacity ${p.status === 'Active' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-2xl ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} transition-colors group-hover:bg-white group-hover:shadow-lg`}>
                                                <LayoutList className="w-6 h-6" />
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                                p.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate mb-1">{p.name}</h3>
                                        <p className="text-xs font-semibold text-slate-400 mb-6 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            Due {formatDate(p.endDate)}
                                        </p>

                                        <div className="space-y-2 mb-6">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                <span>Progress</span>
                                                <span className="text-slate-700">{p.progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                <div 
                                                    className={`h-1.5 rounded-full transition-all duration-500 ${p.status === 'Active' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${p.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <div className="flex -space-x-2">
                                                {p.members.slice(0, 3).map((m, i) => (
                                                    <div key={m.id} className={`w-7 h-7 rounded-lg border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm ${i === 0 ? 'bg-blue-600 text-white' : i === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                        {m.initial}
                                                    </div>
                                                ))}
                                                {p.members.length > 3 && (
                                                    <div className="w-7 h-7 rounded-lg border-2 border-white bg-slate-50 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                                                        +{p.members.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                <ClipboardList className="w-3.5 h-3.5" />
                                                {p.totalTasks} Tasks
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default UserProjects;
