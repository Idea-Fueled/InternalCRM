import React, { useState, useEffect } from 'react';
import { projectService, taskService, userService } from '../../api/services';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { toast } from 'sonner';
import { 
  Search, Filter, Plus, Calendar, Users, 
  CheckCircle2, Clock, MoreVertical, AlertCircle, LayoutList, ArrowLeft, X, Download
} from 'lucide-react';
import { exportPDF } from '../../utils/pdfExport';

const TeamLeadProjects = () => {
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
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [newTask, setNewTask] = useState({ taskName: "", description: "", priority: "Medium", assignedTo: "", assignedQA: "", endDate: "" });
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [submittedTask, setSubmittedTask] = useState(false);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const [projRes, usersRes] = await Promise.all([
                projectService.getAllProjects(),
                userService.getAllUsers()
            ]);

            if (usersRes.data?.data) {
                setTeam(usersRes.data.data);
            }

            const formatted = (projRes.data.projects || []).map(p => {
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
                        initial: m.name?.charAt(0).toUpperCase() || "U",
                        name: m.name || "Unknown",
                        role: m.role,
                        profilePic: m.profilePic
                    })) || [],
                    tasks: (p.tasks || []).map(t => ({
                        ...t,
                        id: t._id,
                        name: t.taskName,
                        start: (t.startDate || t.createdAt) ? new Date(t.startDate || t.createdAt).toLocaleDateString() : 'N/A',
                        end: t.endDate ? new Date(t.endDate).toLocaleDateString() : 'N/A',
                        assignee: t.assignedTo?.name || "Unassigned",
                        assigneeInitial: t.assignedTo?.name?.charAt(0).toUpperCase() || "?",
                        assigneePic: t.assignedTo?.profilePic
                    }))
                };
            });
            setProjects(formatted);
        } catch (error) {
            console.error("Failed to load projects", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
        const interval = setInterval(fetchProjects, 30000);
        return () => clearInterval(interval);
    }, []);
    const handleCreateTask = async (e) => {
        e.preventDefault();
        setSubmittedTask(true);
        if (!newTask.taskName || !newTask.endDate || !newTask.assignedTo || !newTask.assignedQA) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            setIsCreatingTask(true);
            await taskService.createTask({
                ...newTask,
                project: selectedProject._id || selectedProject.id
            });
            toast.success("Task created successfully");
            setIsTaskModalOpen(false);
            setSubmittedTask(false);
            setNewTask({ taskName: "", description: "", priority: "Medium", assignedTo: "", assignedQA: "", endDate: "" });
            // Refresh project data
            const res = await projectService.getProjectById(selectedProject._id || selectedProject.id);
            setSelectedProject(res.data.project);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create task");
        } finally {
            setIsCreatingTask(false);
        }
    };

    const handleEditTask = (task, e) => {
        if (e) e.stopPropagation();
        setEditingTask(task);
        setNewTask({
            taskName: task.taskName || task.name,
            description: task.description || "",
            priority: task.priority || "Medium",
            assignedTo: task.assignedTo?._id || task.assignedTo || "",
            assignedQA: task.assignedQA?._id || task.assignedQA || "",
            endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : ""
        });
        setIsEditTaskModalOpen(true);
    };

    const handleUpdateTask = async (e) => {
        e.preventDefault();
        setSubmittedTask(true);
        if (!newTask.taskName || !newTask.endDate || !newTask.assignedTo || !newTask.assignedQA) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            setIsCreatingTask(true);
            await taskService.updateTask(editingTask._id || editingTask.id, newTask);
            toast.success("Task updated successfully");
            setIsEditTaskModalOpen(false);
            setEditingTask(null);
            setSubmittedTask(false);
            setNewTask({ taskName: "", description: "", priority: "Medium", assignedTo: "", assignedQA: "", endDate: "" });
            // Refresh project data
            const res = await projectService.getProjectById(selectedProject._id || selectedProject.id);
            setSelectedProject(res.data.project);
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update task");
        } finally {
            setIsCreatingTask(false);
        }
    };

    const handleExportProjectTasks = () => {
        if (!selectedProject) return;
        const columns = ["Task Name", "Start Date", "End Date", "Assignee", "Status"];
        const data = (selectedProject.tasks || []).map(t => [
            t.name,
            t.start,
            t.end,
            t.assignee,
            t.status
        ]);
        exportPDF({
            title: `Project Tasks: ${selectedProject.name}`,
            filename: `project_tasks_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };
    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="teamLead" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Projects" role="teamLead" />
                
                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto">
                    {selectedProject ? (
                        /* ---- DETAILED PROJECT VIEW ---- */
                        <div className="w-full max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
                            {/* Back Button */}
                            <button 
                                onClick={() => setSelectedProject(null)} 
                                className="flex items-center text-slate-500 hover:text-blue-600 transition-colors mb-6 text-sm font-semibold group"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
                                Back to Projects
                            </button>

                            {/* Project Header */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                                <div>
                                    <div className="mb-4">
                                        <h1 className="dashboard-heading">{selectedProject.name}</h1>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                            selectedProject.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                                            selectedProject.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-rose-100 text-rose-700'
                                        }`}>
                                            {selectedProject.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 max-w-2xl text-sm md:text-base leading-relaxed">{selectedProject.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                                {/* Left Column: Task List (8 cols) */}
                                <div className="lg:col-span-8 flex flex-col gap-6">
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                            <h3 className="section-title flex items-center">
                                                <LayoutList className="w-5 h-5 mr-2 text-indigo-500" />
                                                Tasks ({selectedProject?.tasks?.length || 0})
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={handleExportProjectTasks}
                                                    className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                                >
                                                    <Download className="w-4 h-4 mr-1.5" />
                                                    Export PDF
                                                </button>
                                                <button 
                                                    onClick={() => setIsTaskModalOpen(true)}
                                                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm shadow-blue-200"
                                                >
                                                    <Plus className="w-4 h-4 mr-1.5" />
                                                    Add Task
                                                </button>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-white border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                                                    <tr>
                                                        <th className="px-6 py-4">Task Name</th>
                                                        <th className="px-6 py-4">Timeline</th>
                                                        <th className="px-6 py-4">Assignee</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {(selectedProject?.tasks || []).map(task => (
                                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                                                            <td className="px-6 py-4">
                                                                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{task.name}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center text-xs text-slate-500 font-medium">
                                                                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                                    {task.start} — {task.end}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                 <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 overflow-hidden">
                                                                        {task.assigneePic ? (
                                                                            <img src={task.assigneePic} alt={task.assignee} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            task.assigneeInitial
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-slate-600">{task.assignee}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                                                    task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                                                    task.status === 'Overdue' ? 'bg-rose-50 text-rose-600' :
                                                                    'bg-blue-50 text-blue-600'
                                                                }`}>
                                                                    {task.status === 'Completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                                    {task.status === 'Overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
                                                                    {task.status === 'In Progress' && <Clock className="w-3 h-3 mr-1" />}
                                                                    {task.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button 
                                                                    onClick={(e) => handleEditTask(task, e)}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Edit Task"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(selectedProject?.tasks?.length || 0) === 0 && (
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-20 text-center bg-slate-50/20">
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                                                        <LayoutList className="w-8 h-8" />
                                                                    </div>
                                                                    <h4 className="text-base font-bold text-slate-800">No tasks yet</h4>
                                                                    <p className="text-sm text-slate-400 mt-1 max-w-[240px] mx-auto">Get started by adding your first task to this project.</p>
                                                                    <button className="mt-5 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                                                                        Create First Task
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Overview (4 cols) */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Project Overview</h3>
                                        
                                        <div className="space-y-8">
                                            {/* Progress */}
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Completion Progress</span>
                                                    <span className="text-sm font-black text-blue-600">{selectedProject.progress}%</span>
                                                </div>
                                                <div className="bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${
                                                            selectedProject.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                                        }`}
                                                        style={{ width: `${selectedProject.progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2 space-y-6">
                                                {/* Timeline */}
                                                <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                    <div className="shrink-0 p-2.5 bg-blue-50 rounded-xl text-blue-500">
                                                        <Calendar className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Timeline</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-800">{formatDate(selectedProject.startDate)}</span>
                                                            <span className="text-slate-300">—</span>
                                                            <span className="text-sm font-bold text-slate-800">{formatDate(selectedProject.endDate)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Team */}
                                                <div className="p-5 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Team Members ({selectedProject?.members?.length || 0})</p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {(selectedProject?.members || []).map((member, i) => (
                                                            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100/50">
                                                                <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                                                    {member.initial}
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-700 truncate">{member.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ---- PROJECTS GRID VIEW ---- */
                        <div className="w-full max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <h1 className="dashboard-heading">Projects</h1>
                                    <p className="dashboard-subheading">Manage all projects and drill down into tasks.</p>
                                </div>

                            </div>

                            {/* Search & Filters */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search projects by name..." 
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-40">
                                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select 
                                            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                        >
                                            <option value="All">All Statuses</option>
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                            <option value="At Risk">At Risk</option>
                                        </select>
                                    </div>
                                    <button className="flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                        Date Range
                                    </button>
                                </div>
                            </div>

                            {/* Projects Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {loading ? (
                                    <div className="col-span-full flex justify-center py-10">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : projects
                                    .filter(p => selectedStatus === "All" || p.status === selectedStatus)
                                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((project) => (
                                    <div 
                                        key={project.id} 
                                        onClick={() => setSelectedProject(project)}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer group flex flex-col overflow-hidden"
                                    >
                                        <div className="p-6 flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                                    project.status === 'Active' ? 'bg-blue-50 text-blue-600' :
                                                    project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                                    'bg-rose-50 text-rose-600'
                                                }`}>
                                                    {project.status}
                                                </div>
                                                <button className="text-slate-300 hover:text-slate-500 transition-colors p-1" onClick={(e) => e.stopPropagation()}>
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </div>
                                            
                                            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-6 min-h-[40px] leading-relaxed">{project.description}</p>
                                            
                                            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-6 bg-slate-50 px-3 py-2 rounded-lg">
                                                <div className="flex items-center">
                                                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                    {project.startDate} — {project.endDate}
                                                </div>
                                            </div>

                                            <div className="space-y-2.5">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-semibold text-slate-600">Progress</span>
                                                    <span className="font-bold text-slate-900">{project.progress}%</span>
                                                </div>
                                                <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${
                                                            project.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                                        }`}
                                                        style={{ width: `${project.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center -space-x-2">
                                                {project.members.map((member, i) => (
                                                    <div key={i} title={member.name} className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm z-10 relative">
                                                        {member.initial}
                                                    </div>
                                                ))}
                                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm z-0 relative ml-1 hover:bg-slate-300 transition-colors">
                                                    <Plus className="w-3 h-3" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-5 text-xs font-semibold">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-slate-400 uppercase tracking-wider text-[10px]">Tasks</span>
                                                    <span className="text-slate-800 mt-0.5">{project.totalTasks}</span>
                                                </div>
                                                {project.overdueTasks > 0 && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-rose-400 uppercase tracking-wider text-[10px]">Overdue</span>
                                                        <span className="text-rose-600 mt-0.5">{project.overdueTasks}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!loading && projects.length === 0 && (
                                    <div className="col-span-full text-center p-10 text-slate-500">
                                        No projects found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>


            {/* Create Task Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" />Create New Task</h2>
                            <button onClick={() => { setIsTaskModalOpen(false); setSubmittedTask(false); }} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateTask} noValidate className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-5 text-sm overflow-y-auto flex-1 custom-scrollbar">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">Task Title <span className="text-red-500">*</span></label>
                                    <input type="text" required value={newTask.taskName} onChange={e => setNewTask({ ...newTask, taskName: e.target.value })} placeholder="e.g. Design UI Mockups"
                                        className={`w-full px-4 py-2.5 bg-white border ${submittedTask && !newTask.taskName ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300`} />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">Description</label>
                                    <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Detailed task description..." rows="3"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Developer <span className="text-red-500">*</span></label>
                                        <select value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-white border ${submittedTask && !newTask.assignedTo ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium`}>
                                            <option value="">Select Developer</option>
                                            {team.filter(m => m.role?.toLowerCase() === 'developer').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">QA <span className="text-red-500">*</span></label>
                                        <select value={newTask.assignedQA} onChange={e => setNewTask({ ...newTask, assignedQA: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-white border ${submittedTask && !newTask.assignedQA ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium`}>
                                            <option value="">Select QA</option>
                                            {team.filter(m => m.role?.toLowerCase() === 'qa').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Priority</label>
                                        <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium">
                                            {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Due Date <span className="text-red-500">*</span></label>
                                        <input type="date" required value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-white border ${submittedTask && !newTask.endDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-700`} />
                                </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 flex items-center gap-3 bg-slate-50 shrink-0">
                                <button type="button" onClick={() => { setIsTaskModalOpen(false); setSubmittedTask(false); }}
                                    className="flex-1 justify-center px-5 py-2.5 text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition shadow-sm">Cancel</button>
                                <button type="submit" disabled={isCreatingTask}
                                    className="flex-1 justify-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50">
                                    {isCreatingTask ? 'Creating...' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Task Modal */}
            {isEditTaskModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><div className="p-1 bg-blue-100 rounded-lg"><svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></div>Edit Task</h2>
                            <button onClick={() => { setIsEditTaskModalOpen(false); setSubmittedTask(false); }} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleUpdateTask} noValidate className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-5 text-sm overflow-y-auto flex-1 custom-scrollbar">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">Task Title <span className="text-red-500">*</span></label>
                                    <input type="text" required value={newTask.taskName} onChange={e => setNewTask({ ...newTask, taskName: e.target.value })} placeholder="e.g. Design UI Mockups"
                                        className={`w-full px-4 py-2.5 bg-white border ${submittedTask && !newTask.taskName ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300`} />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">Description</label>
                                    <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Detailed task description..." rows="3"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Developer <span className="text-red-500">*</span></label>
                                        <select value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-white border ${submittedTask && !newTask.assignedTo ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium`}>
                                            <option value="">Select Developer</option>
                                            {team.filter(m => m.role?.toLowerCase() === 'developer').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">QA <span className="text-red-500">*</span></label>
                                        <select value={newTask.assignedQA} onChange={e => setNewTask({ ...newTask, assignedQA: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-white border ${submittedTask && !newTask.assignedQA ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium`}>
                                            <option value="">Select QA</option>
                                            {team.filter(m => m.role?.toLowerCase() === 'qa').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Priority</label>
                                        <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium">
                                            {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Due Date <span className="text-red-500">*</span></label>
                                        <input type="date" required value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-white border ${submittedTask && !newTask.endDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-700`} />
                                </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 flex items-center gap-3 bg-slate-50 shrink-0">
                                <button type="button" onClick={() => { setIsEditTaskModalOpen(false); setSubmittedTask(false); }}
                                    className="flex-1 justify-center px-5 py-2.5 text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition shadow-sm">Cancel</button>
                                <button type="submit" disabled={isCreatingTask}
                                    className="flex-1 justify-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50">
                                    {isCreatingTask ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamLeadProjects;
