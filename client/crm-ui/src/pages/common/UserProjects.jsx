import React, { useState, useEffect } from 'react';
import { projectService } from '../../api/services';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { 
  Search, Filter, Calendar, Users, 
  CheckCircle2, Clock, AlertCircle, LayoutList, ArrowLeft, ClipboardList, Download, X
} from 'lucide-react';
import { exportPDF } from '../../utils/pdfExport';
import StatDetailModal from '../../components/StatDetailModal';
import { getProjectStatus, getProjectStatusDetails } from '../../utils/projectStatus';

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
    const [fromDateFilter, setFromDateFilter] = useState("");
    const [toDateFilter, setToDateFilter] = useState("");
    const [selectedProject, setSelectedProject] = useState(null);
    const [statModal, setStatModal] = useState({ isOpen: false, title: "", data: [], type: "" });

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await projectService.getAllProjects();
            const formatted = (res.data.projects || []).map(p => {
                const totalTasks = p.tasks?.length || 0;
                const completedTasks = p.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0;
                const overdueTasks = p.tasks?.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done").length || 0;
                const timelineTag = getProjectStatus(p);

                return {
                    ...p,
                    id: p._id,
                    name: p.projectName,
                    status: p.status || "Active",
                    progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                    totalTasks,
                    overdueTasks,
                    timelineTag,
                    members: p.teamMembers?.map(m => ({
                        id: m._id,
                        name: m.name,
                        initial: m.name.charAt(0),
                        profilePic: m.profilePic
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

    const handleExportProjects = () => {
        const columns = ["Project Name", "Status", "Progress", "Total Tasks", "Due Date"];
        const data = filteredProjects.map(p => [
            p.name,
            p.status,
            `${p.progress}%`,
            p.totalTasks,
            formatDate(p.endDate)
        ]);

        exportPDF({
            title: `${role.charAt(0).toUpperCase() + role.slice(1)} - Projects Report`,
            filename: `${role}_projects_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    const handleExportProjectTasks = () => {
        if (!selectedProject) return;
        const columns = ["Task Name", "Timeline", "Assignee", "Status"];
        const data = (selectedProject.tasks || []).map(t => [
            t.taskName,
            `${formatDate(t.startDate)} - ${formatDate(t.endDate)}`,
            t.assignedTo?.name || "Unassigned",
            t.status
        ]);

        exportPDF({
            title: `Tasks - ${selectedProject.name}`,
            filename: `tasks_${selectedProject.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === "All" || p.timelineTag === selectedStatus;

        let matchesDateRange = true;
        if (fromDateFilter || toDateFilter) {
            const projectDate = new Date(p.createdAt || p.startDate);
            projectDate.setHours(0, 0, 0, 0);
            
            if (fromDateFilter) {
                const fromDate = new Date(fromDateFilter);
                fromDate.setHours(0, 0, 0, 0);
                if (projectDate < fromDate) matchesDateRange = false;
            }
            if (toDateFilter) {
                const toDate = new Date(toDateFilter);
                toDate.setHours(0, 0, 0, 0);
                if (projectDate > toDate) matchesDateRange = false;
            }
        }

        return matchesSearch && matchesStatus && matchesDateRange;
    });

    if (selectedProject) {
        const statusDetails = getProjectStatusDetails(selectedProject.timelineTag || getProjectStatus(selectedProject));
        return (
            <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
                <AdminSidebar role={role} />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <Topbar DashboardTile="Project Details" />
                    
                    <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
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
                                                <h1 className="dashboard-heading">{selectedProject.name}</h1>
                                                <div className="flex flex-wrap gap-2 items-center mt-3">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusDetails.badgeClass} flex items-center gap-1 w-fit shrink-0`}>
                                                        <span>{statusDetails.emoji}</span>
                                                        <span>{statusDetails.label}</span>
                                                    </span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                                                        selectedProject.priority === "Critical" ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" :
                                                        selectedProject.priority === "High" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                                        selectedProject.priority === "Medium" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                        "bg-slate-50 text-slate-500 border-slate-100"
                                                    } flex items-center gap-1 w-fit shrink-0`}>
                                                        {selectedProject.priority || "Medium"} Priority
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
                                        
                                        <div className="w-full bg-slate-200 rounded-full h-3 mb-8">
                                            <div 
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" 
                                                style={{ width: `${selectedProject.progress}%` }}
                                            ></div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div onClick={() => setStatModal({ isOpen: true, title: "Total Tasks", data: selectedProject.tasks || [], type: "task" })} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:border-blue-300 hover:scale-[1.02] transition-all cursor-pointer">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
                                                        <LayoutList className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks</span>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-800">{selectedProject.totalTasks}</div>
                                            </div>
                                            <div onClick={() => setStatModal({ isOpen: true, title: "Completed Tasks", data: (selectedProject.tasks || []).filter(t => t.status === "Completed" || t.status === "Done"), type: "task" })} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:border-emerald-300 hover:scale-[1.02] transition-all cursor-pointer">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-800">{selectedProject.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0}</div>
                                            </div>
                                            <div onClick={() => setStatModal({ isOpen: true, title: "Overdue Tasks", data: (selectedProject.tasks || []).filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== "Completed" && t.status !== "Done"), type: "task" })} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:border-rose-300 hover:scale-[1.02] transition-all cursor-pointer">
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

                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
                                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="section-title flex items-center">
                                            <LayoutList className="w-5 h-5 mr-2 text-indigo-500" />
                                            Tasks ({selectedProject.tasks?.length || 0})
                                        </h3>
                                        <button 
                                            onClick={handleExportProjectTasks}
                                            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm"
                                        >
                                            <Download className="w-4 h-4 mr-1.5" />
                                            Export PDF
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse table-fixed">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                                    <th className="px-6 py-4 w-[35%] font-bold">Task Name</th>
                                                    <th className="px-6 py-4 w-[25%] font-bold">Timeline</th>
                                                    <th className="px-6 py-4 w-[30%] font-bold">Assignee</th>
                                                    <th className="px-6 py-4 w-[10%] font-bold text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 bg-white">
                                                {(selectedProject.tasks || []).map(task => (
                                                    <tr key={task._id} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{task.taskName}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center text-xs text-slate-600 font-bold">
                                                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                                                                {formatDate(task.startDate)} — {formatDate(task.endDate)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-2">
                                                                {/* Developer */}
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-100 overflow-hidden shrink-0">
                                                                        {task.assignedTo?.profilePic ? (
                                                                            <img src={task.assignedTo.profilePic} alt={task.assignedTo.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            task.assignedTo?.name?.charAt(0) || "U"
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-slate-700 leading-tight">{task.assignedTo?.name || "Unassigned"}</span>
                                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Developer</span>
                                                                    </div>
                                                                </div>
                                                                {/* QA */}
                                                                {task.assignedQA && (
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-100 overflow-hidden shrink-0">
                                                                            {task.assignedQA.profilePic ? (
                                                                                <img src={task.assignedQA.profilePic} alt={task.assignedQA.name} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                task.assignedQA.name?.charAt(0) || "Q"
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-bold text-slate-700 leading-tight">{task.assignedQA.name}</span>
                                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">QA Reviewer</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                                task.status === 'Completed' || task.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                task.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                'bg-blue-50 text-blue-600 border border-blue-100'
                                                            }`}>
                                                                {task.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(selectedProject.tasks?.length || 0) === 0 && (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-20 text-center bg-slate-50/20">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                                                    <LayoutList className="w-8 h-8" />
                                                                </div>
                                                                <h4 className="text-base font-bold text-slate-800">No tasks yet</h4>
                                                                <p className="text-sm font-medium text-slate-500 mt-1">This project doesn't have any tasks assigned yet.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
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
                                                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden">
                                                    {member.profilePic ? (
                                                        <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        member.initial
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{member.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Attachment */}
                                {selectedProject?.attachment && (
                                    <div className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Project Attachment</p>
                                        <a 
                                            href={selectedProject.attachment} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100/50"
                                        >
                                            <div className="shrink-0 p-2 bg-white rounded-lg shadow-sm">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                            </div>
                                            <span className="text-sm font-bold truncate">View Attachment</span>
                                        </a>
                                    </div>
                                )}
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
                
                <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="dashboard-heading">Assigned Projects</h1>
                            <p className="dashboard-subheading">Overview of projects you are currently a part of.</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleExportProjects}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Download Report
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
                        {/* Top Row: Search and Dates */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="relative flex-1 lg:max-w-md">
                                <input 
                                    type="text" 
                                    placeholder="Search your projects..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition font-medium text-sm placeholder-slate-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                            </div>
                            
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto overflow-x-auto hide-scrollbar">
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none outline-none text-slate-700 text-xs font-semibold cursor-pointer w-[110px]"
                                        value={fromDateFilter}
                                        onChange={(e) => setFromDateFilter(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</span>
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none outline-none text-slate-700 text-xs font-semibold cursor-pointer w-[110px]"
                                        value={toDateFilter}
                                        onChange={(e) => setToDateFilter(e.target.value)}
                                    />
                                </div>
                                {(fromDateFilter || toDateFilter) && (
                                    <button 
                                        onClick={() => { setFromDateFilter(""); setToDateFilter(""); }}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center shrink-0"
                                        title="Clear dates"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Bottom Row: Tabs */}
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto hide-scrollbar">
                            <button onClick={() => setSelectedStatus("All")} className={`px-5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${selectedStatus === 'All' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}>All Projects</button>
                            <button onClick={() => setSelectedStatus("Upcoming")} className={`px-5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${selectedStatus === 'Upcoming' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}>Upcoming</button>
                            <button onClick={() => setSelectedStatus("In Progress")} className={`px-5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${selectedStatus === 'In Progress' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}>In Progress</button>
                            <button onClick={() => setSelectedStatus("Completed")} className={`px-5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${selectedStatus === 'Completed' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}>Completed</button>
                            <button onClick={() => setSelectedStatus("Overdue")} className={`px-5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${selectedStatus === 'Overdue' ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}>Overdue</button>
                        </div>
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
                            {filteredProjects.map((p) => {
                                const status = getProjectStatus(p);
                                const statusDetails = getProjectStatusDetails(status);

                                return (
                                <div 
                                    key={p.id}
                                    onClick={() => setSelectedProject(p)}
                                    className={`rounded-3xl p-6 border-y border-r border-l-[5px] ${statusDetails.borderClass} hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative ${statusDetails.bgClass}`}
                                >
                                    <div className="relative z-10 flex flex-col gap-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusDetails.badgeClass} flex items-center gap-1 w-fit shrink-0`}>
                                                        <span>{statusDetails.emoji}</span>
                                                        <span>{statusDetails.label}</span>
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold tracking-wider text-slate-400 bg-white/75 border border-slate-200/50 px-2 py-0.5 rounded-full w-fit shrink-0 mt-0.5">{p.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>

                                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 leading-relaxed">
                                            <Clock className="w-3.5 h-3.5" />
                                            Due {formatDate(p.endDate)}
                                        </p>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                <span>Progress</span>
                                                <span className="text-slate-700">{p.progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                <div 
                                                    className={`h-1.5 rounded-full transition-all duration-500 ${p.progress < 30 ? 'bg-amber-400' : p.progress < 70 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${p.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                            <div className="flex -space-x-2" onClick={(e) => e.stopPropagation()}>
                                                {p.members.slice(0, 3).map((m, i) => (
                                                    <div key={m.id} className={`w-7 h-7 rounded-lg border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm overflow-hidden ${i === 0 ? 'bg-blue-600 text-white' : i === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                        {m.profilePic ? (
                                                            <img src={m.profilePic} alt={m.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            m.initial
                                                        )}
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
                                );
                            })}
                        </div>
                    )}
                </main>
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

export default UserProjects;
