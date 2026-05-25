import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { projectService, userService } from "../../api/services";
import { toast } from "sonner";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { exportPDF } from "../../utils/pdfExport";
import { 
    Download, Trash2, Edit3, Briefcase, 
    Calendar, Users, MoreVertical, Layout, LayoutList, LayoutGrid, Search, Filter, X 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import usePermission from "../../hooks/usePermission";
import ProjectDetailsSidebar from "../../components/ProjectDetailsSidebar";

const ProjectsDashboard = () => {
    const { user } = useAuth();
    const { can } = usePermission();
    const role = user?.role || 'admin';
    const [viewType, setViewType] = useState("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Status: All");
    const [fromDateFilter, setFromDateFilter] = useState("");
    const [toDateFilter, setToDateFilter] = useState("");
    const [newProject, setNewProject] = useState({
        projectName: "",
        description: "",
        teamLead: "",
        startDate: "",
        endDate: "",
        teamMembers: [],
        priority: "Medium",
        status: "Active",
        techStack: "",
        clientName: "",
        estimatedTasks: 0,
        notes: "",
        attachments: []
    });
    const [isCreating, setIsCreating] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [teamLeads, setTeamLeads] = useState([]);
    const [teamMembersList, setTeamMembersList] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const fetchInitialData = async () => {
        try {
            const res = await userService.getAllUsers({ role: 'TL' });
            setTeamLeads(res.data.data || []);
        } catch (err) {
            console.error("Failed to load team leads", err);
        }
    };

    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (!newProject.teamLead) {
                setTeamMembersList([]);
                return;
            }
            try {
                const res = await userService.getAllUsers({ teamLead: newProject.teamLead });
                const members = (res.data.data || []).filter(u => u.role !== 'admin' && u.role !== 'TL');
                setTeamMembersList(members);
            } catch (err) {
                console.error("Failed to fetch team members", err);
            }
        };
        fetchTeamMembers();
    }, [newProject.teamLead]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await projectService.getAllProjects();
            
            const formatted = (res.data.projects || []).map(p => {
                const totalTasks = p.tasks?.length || 0;
                const completedTasks = p.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0;
                
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);
                const deadline = p.endDate ? new Date(p.endDate) : null;
                if (deadline) deadline.setHours(0, 0, 0, 0);
                const start = p.startDate ? new Date(p.startDate) : null;
                if (start) start.setHours(0, 0, 0, 0);

                const isCompleted = totalTasks > 0 && completedTasks === totalTasks;

                let timelineTag = "In Progress";
                if (start && start > currentDate) {
                    timelineTag = "Upcoming";
                } else if (isCompleted) {
                    timelineTag = "Completed";
                } else if (deadline) {
                    const timeDiff = deadline.getTime() - currentDate.getTime();
                    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                    if (daysDiff < 0) {
                        timelineTag = "Overdue";
                    }
                }
                
                return { ...p, timelineTag };
            });
            
            setProjects(formatted);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
        fetchInitialData();
        const interval = setInterval(fetchProjects, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const projectIdParam = searchParams.get("projectId");
        if (projectIdParam) {
            setSelectedProjectId(projectIdParam);
        }
    }, [searchParams]);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setSubmitted(true);

        if (!newProject.projectName || !newProject.description || !newProject.teamLead || !newProject.startDate || !newProject.endDate || !newProject.teamMembers || newProject.teamMembers.length === 0) {
            return;
        }

        try {
            setIsCreating(true);
            const formData = new FormData();
            formData.append("projectName", newProject.projectName);
            formData.append("description", newProject.description);
            formData.append("teamLead", newProject.teamLead);
            formData.append("startDate", newProject.startDate);
            formData.append("endDate", newProject.endDate);
            formData.append("teamMembers", JSON.stringify(newProject.teamMembers));
            formData.append("priority", newProject.priority);
            formData.append("status", newProject.status);
            formData.append("techStack", JSON.stringify(newProject.techStack.split(",").map(t => t.trim()).filter(Boolean)));
            formData.append("clientName", newProject.clientName);
            formData.append("estimatedTasks", newProject.estimatedTasks);
            if (newProject.notes) {
                formData.append("notes", newProject.notes);
            }
            if (newProject.attachments && newProject.attachments.length > 0) {
                newProject.attachments.forEach(file => {
                    formData.append("attachments", file);
                });
            }

            await projectService.createProject(formData);
            toast.success("Project created successfully");
            setIsModalOpen(false);
            setSubmitted(false);
            setNewProject({
                projectName: "",
                description: "",
                teamLead: "",
                startDate: "",
                endDate: "",
                teamMembers: [],
                priority: "Medium",
                status: "Active",
                techStack: "",
                clientName: "",
                estimatedTasks: 0,
                notes: "",
                attachments: []
            });
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create project");
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditProject = (proj, e) => {
        if (e) e.stopPropagation();
        setEditingProject(proj);
        setNewProject({
            projectName: proj.projectName,
            description: proj.description || "",
            teamLead: proj.teamLead?._id || proj.teamLead || "",
            startDate: proj.startDate ? new Date(proj.startDate).toISOString().split('T')[0] : "",
            endDate: proj.endDate ? new Date(proj.endDate).toISOString().split('T')[0] : "",
            teamMembers: proj.teamMembers?.map(m => m._id || m) || [],
            priority: proj.priority || "Medium",
            status: proj.status || "Active",
            techStack: proj.techStack?.join(", ") || "",
            clientName: proj.clientName || "",
            estimatedTasks: proj.estimatedTasks || 0,
            notes: "",
            attachments: []
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        if (!editingProject) return;
        setSubmitted(true);

        if (!newProject.projectName || !newProject.description || !newProject.teamLead || !newProject.startDate || !newProject.endDate || !newProject.teamMembers || newProject.teamMembers.length === 0) {
            return;
        }

        try {
            setIsCreating(true);
            const formData = new FormData();
            formData.append("projectName", newProject.projectName);
            formData.append("description", newProject.description);
            formData.append("teamLead", newProject.teamLead);
            formData.append("startDate", newProject.startDate);
            formData.append("endDate", newProject.endDate);
            formData.append("teamMembers", JSON.stringify(newProject.teamMembers));
            formData.append("priority", newProject.priority);
            formData.append("status", newProject.status);
            formData.append("techStack", JSON.stringify(newProject.techStack.split(",").map(t => t.trim()).filter(Boolean)));
            formData.append("clientName", newProject.clientName);
            formData.append("estimatedTasks", newProject.estimatedTasks);
            if (newProject.attachments && newProject.attachments.length > 0) {
                newProject.attachments.forEach(file => {
                    formData.append("attachments", file);
                });
            }

            await projectService.updateProject(editingProject._id, formData);
            toast.success("Project updated successfully");
            setIsEditModalOpen(false);
            setEditingProject(null);
            setSubmitted(false);
            setNewProject({
                projectName: "",
                description: "",
                teamLead: "",
                startDate: "",
                endDate: "",
                teamMembers: [],
                priority: "Medium",
                status: "Active",
                techStack: "",
                clientName: "",
                estimatedTasks: 0,
                notes: "",
                attachments: []
            });
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update project");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteProject = (projId, e) => {
        if (e) e.stopPropagation();
        setProjectToDelete(projId);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;
        try {
            setIsDeleting(true);
            await projectService.deleteProject(projectToDelete);
            toast.success("Project moved to trash");
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
            fetchProjects();
        } catch (err) {
            toast.error("Failed to delete project");
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleMember = (userId) => {
        setNewProject(prev => {
            const exists = prev.teamMembers.includes(userId);
            if (exists) {
                return { ...prev, teamMembers: prev.teamMembers.filter(id => id !== userId) };
            } else {
                return { ...prev, teamMembers: [...prev.teamMembers, userId] };
            }
        });
    };

    const handleExport = () => {
        const columns = ["Project Name", "Team Lead", "Status", "Progress", "Start Date", "End Date"];
        const data = filteredProjects.map(p => [
            p.projectName,
            p.teamLead?.name || "Unassigned",
            p.status,
            `${p.status === "Completed" ? 100 : 50}%`,
            p.startDate ? new Date(p.startDate).toLocaleDateString() : "N/A",
            p.endDate ? new Date(p.endDate).toLocaleDateString() : "N/A"
        ]);
        exportPDF({
            title: "Project Master List",
            filename: `projects_report_${new Date().getTime()}.pdf`,
            columns,
            data
        });
    };

    const filteredProjects = projects.filter(proj => {
        const matchesSearch = proj.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               proj.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "Status: All" || statusFilter === "All" || proj.timelineTag === statusFilter;
        
        let matchesDateRange = true;
        if (fromDateFilter || toDateFilter) {
            const projectDate = new Date(proj.createdAt || proj.startDate);
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

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar role={role === 'TL' ? 'teamLead' : role} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Projects" />
                
                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
                    
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="dashboard-heading">Projects</h1>
                            <p className="dashboard-subheading">Manage and track all ongoing project lifecycles across teams.</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {(can('projects.create') || role === 'admin') && (
                                <>
                                    <button 
                                        onClick={handleExport} 
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm text-sm"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export
                                    </button>
                                    {can('projects.create') && (
                                        <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-200 text-sm">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                            New Project
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Toolbar (Search & Filters) */}
                    <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
                        {/* Top Row: Search and Dates */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <div className="relative w-full xl:w-[400px]">
                                <input
                                    type="text"
                                    placeholder="Search projects by name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition text-sm font-medium placeholder-slate-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <div className="absolute left-3 top-3 text-slate-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                </div>
                            </div>

                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full xl:w-auto overflow-x-auto hide-scrollbar">
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none outline-none text-slate-600 text-xs font-semibold cursor-pointer w-[110px]"
                                        value={fromDateFilter}
                                        onChange={(e) => setFromDateFilter(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</span>
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none outline-none text-slate-600 text-xs font-semibold cursor-pointer w-[110px]"
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

                        {/* Bottom Row: Status Tabs & View Toggle */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {["Status: All", "Upcoming", "In Progress", "Completed", "Overdue"].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all ${
                                            statusFilter === status 
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                                                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                        }`}
                                    >
                                        {status === "Status: All" ? "All Projects" : status}
                                    </button>
                                ))}
                            </div>
                            <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-0.5 shadow-sm">
                                <button 
                                    onClick={() => setViewType("list")} 
                                    className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${viewType === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`} 
                                    title="List View"
                                >
                                    <LayoutList className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setViewType("card")} 
                                    className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${viewType === "card" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`} 
                                    title="Card View"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-10">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium">
                            {error}
                        </div>
                    ) : (
                    <div className={viewType === "list" ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                        {/* Projects List (Card-Table Hybrid) */}
                        {filteredProjects.length === 0 ? (
                            <div className="bg-white rounded-2xl p-20 flex flex-col items-center justify-center border border-slate-200/60 shadow-sm opacity-60">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">No projects found</h3>
                                {can('projects.create') ? (
                                    <>
                                        <p className="text-sm font-medium text-slate-500 mt-1 max-w-xs text-center">It looks like there are no projects matching your criteria. Start by creating a new one!</p>
                                        <button onClick={() => setIsModalOpen(true)} className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm">Create Project</button>
                                    </>
                                ) : (
                                    <p className="text-sm font-medium text-slate-500 mt-1 max-w-xs text-center">There are no projects assigned to you that match the selected criteria.</p>
                                )}
                            </div>
                        ) : (
                            filteredProjects.map((project, i) => {
                                const totalTasks = project.tasks?.length || 0;
                                const completedTasks = project.tasks?.filter(t => t.status === "Completed" || t.status === "Done").length || 0;
                                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                const isCompleted = totalTasks > 0 && completedTasks === totalTasks;

                                const leadName = project.teamLead?.name || "Unassigned";
                                const leadInitial = project.teamLead?.name?.charAt(0) || "U";
                                const membersCount = project.teamMembers?.length || 0;
                                const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A";
                                const endDate = project.endDate ? new Date(project.endDate).toLocaleDateString() : "N/A";

                                const currentDate = new Date();
                                currentDate.setHours(0, 0, 0, 0);
                                const deadline = project.endDate ? new Date(project.endDate) : null;
                                if (deadline) deadline.setHours(0, 0, 0, 0);
                                const start = project.startDate ? new Date(project.startDate) : null;
                                if (start) start.setHours(0, 0, 0, 0);

                                let bgClass = "bg-white hover:border-blue-300 border-slate-200/60";
                                let timelineTag = "In Progress";
                                let timelineClass = "bg-blue-50 text-blue-600 border-blue-200";

                                if (start && start > currentDate) {
                                    bgClass = "bg-purple-50 border-purple-200 hover:border-purple-400 hover:shadow-purple-100/50";
                                    timelineTag = "Upcoming";
                                    timelineClass = "bg-purple-100 text-purple-700 border-purple-200";
                                } else if (isCompleted) {
                                    bgClass = "bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100/50";
                                    timelineTag = "Completed";
                                    timelineClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                                } else if (deadline) {
                                    const timeDiff = deadline.getTime() - currentDate.getTime();
                                    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                                    
                                    if (daysDiff < 0) {
                                        bgClass = "bg-rose-50 border-rose-200 hover:border-rose-400 hover:shadow-rose-100/50";
                                        timelineTag = "Overdue";
                                        timelineClass = "bg-rose-100 text-rose-700 border-rose-200";
                                    } else if (daysDiff <= 3) {
                                        bgClass = "bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-orange-100/50";
                                        timelineTag = "Due Soon";
                                        timelineClass = "bg-orange-100 text-orange-700 border-orange-200";
                                    }
                                }

                                return viewType === "card" ? (
                                    <div 
                                        key={project._id || i} 
                                        onClick={() => {
                                            setSelectedProjectId(project._id);
                                        }}
                                        className={`group rounded-3xl p-6 flex flex-col gap-5 border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${bgClass}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full w-fit">{project._id.slice(-6).toUpperCase()}</span>
                                                <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{project.projectName}</h3>
                                            </div>
                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border whitespace-nowrap ${
                                                project.status === 'Active' || project.status === 'On Track' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                project.status === 'At Risk' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}>
                                                {project.status}
                                            </span>
                                        </div>

                                        <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed">{project.description}</p>

                                        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100">
                                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shadow-sm uppercase overflow-hidden shrink-0">
                                                {project.teamLead?.profilePic ? (
                                                    <img src={project.teamLead.profilePic} alt={project.teamLead.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    leadInitial
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1 overflow-hidden">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Team Lead</span>
                                                <span className="text-sm font-semibold text-slate-700 truncate">{leadName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                <span className="text-xs font-bold text-slate-600">{membersCount}</span>
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                                <span>PROGRESS</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                <div 
                                                    className={`h-1.5 rounded-full ${progress < 30 ? 'bg-amber-400' : progress < 70 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                <div 
                                    key={project._id || i} 
                                    onClick={() => {
                                        setSelectedProjectId(project._id);
                                    }}
                                    className={`group rounded-2xl p-5 flex flex-col xl:flex-row items-center gap-6 xl:gap-8 border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${bgClass}`}
                                >
                                    
                                    {/* Left: Name & Desc */}
                                    <div className="w-full xl:w-[30%]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{project._id.slice(-6).toUpperCase()}</span>
                                            <h3 className="text-base font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{project.projectName}</h3>
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed pr-4">{project.description}</p>
                                    </div>

                                    <div className="w-full xl:w-[25%] flex flex-col gap-3 border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shadow-sm uppercase overflow-hidden">
                                                {project.teamLead?.profilePic ? (
                                                    <img src={project.teamLead.profilePic} alt={project.teamLead.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    leadInitial
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Lead</span>
                                                <span className="text-sm font-semibold text-slate-700">{leadName}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                            <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> {startDate}</div>
                                            <span className="text-slate-300">-</span>
                                            <div className="flex items-center gap-1.5">{endDate}</div>
                                        </div>
                                    </div>

                                    {/* Middle 2: Stats & Progress */}
                                    <div className="w-full xl:w-[25%] flex flex-col gap-3 border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                                                    project.status === 'Active' || project.status === 'On Track' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    project.status === 'At Risk' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>
                                                    {project.status}
                                                </span>
                                                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${timelineClass}`}>
                                                    {timelineTag}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="relative group/badge" onClick={(e) => e.stopPropagation()}>
                                                    <span className="flex items-center gap-1.5 font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md cursor-default hover:bg-slate-200 transition-colors">
                                                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                        {membersCount}
                                                    </span>
                                                    
                                                    {membersCount > 0 && (
                                                        <div className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all duration-200 z-[100]">
                                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1 text-left">Team Members</h4>
                                                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                                                                {project.teamMembers.map(m => (
                                                                    <div key={m._id} className="flex items-center gap-2 text-left bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                                                                        <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border border-blue-100">
                                                                            {m.profilePic ? (
                                                                                <img src={m.profilePic} alt={m.name} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                m.name?.charAt(0).toUpperCase() || 'U'
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col overflow-hidden">
                                                                            <span className="text-xs font-bold text-slate-700 truncate">{m.name}</span>
                                                                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider truncate">{m.role || 'Member'}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                                <span>PROGRESS</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                <div 
                                                    className={`h-1.5 rounded-full ${progress < 30 ? 'bg-amber-400' : progress < 70 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Action */}
                                    <div className="w-full xl:w-[20%] flex items-center justify-end border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-8">
                                        <div className="flex items-center gap-2">

                                            {(can('projects.update') || can('projects.delete')) && (
                                                <>
                                                    {can('projects.update') && (
                                                        <button 
                                                            onClick={(e) => handleEditProject(project, e)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit Project"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                        </button>
                                                    )}
                                                    {can('projects.delete') && (
                                                        <button 
                                                            onClick={(e) => handleDeleteProject(project._id, e)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Project"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const routeBase = role === 'TL' ? 'teamLead' : role;
                                                    navigate(`/${routeBase}/kanban?project=${encodeURIComponent(project.projectName)}`);
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5"
                                            >
                                                Board <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                                );
                            })
                        )}
                    </div>
                    )}
                    


                </main>
            </div>

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[700px] flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out] border border-slate-100">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                                <div className="text-blue-600 relative flex items-center justify-center bg-blue-50 p-2 rounded-xl">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                </div>
                                Create New Project
                            </h2>
                            <button onClick={() => { setIsModalOpen(false); setSubmitted(false); }} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} noValidate className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-6 py-5 space-y-5 text-sm overflow-y-auto flex-1 scrollbar-thin">
                                {/* Name and Client Name */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            required
                                            value={newProject.projectName}
                                            onChange={(e) => setNewProject({...newProject, projectName: e.target.value})}
                                            placeholder="e.g. E-Commerce Platform" 
                                            className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.projectName ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700`} 
                                        />
                                        {submitted && !newProject.projectName && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1">Project Name is required!</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Client Name (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={newProject.clientName}
                                            onChange={(e) => setNewProject({...newProject, clientName: e.target.value})}
                                            placeholder="e.g. Acme Corp" 
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700" 
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Description <span className="text-red-500">*</span></label>
                                    <textarea 
                                        required
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                                        placeholder="Detailed project description outlining scope and goals..." 
                                        rows="3" 
                                        className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.description ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none font-medium text-slate-700`}
                                    ></textarea>
                                    {submitted && !newProject.description && (
                                        <p className="text-red-500 text-[11px] font-semibold mt-1">Description is required!</p>
                                    )}
                                </div>

                                {/* Team Lead & Tech Stack */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Team Lead <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select 
                                                required
                                                value={newProject.teamLead}
                                                onChange={(e) => setNewProject({...newProject, teamLead: e.target.value})}
                                                className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.teamLead ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition cursor-pointer appearance-none text-slate-700 font-bold`}
                                            >
                                                <option value="">Select Team Lead</option>
                                                {teamLeads.map(tl => (
                                                    <option key={tl._id} value={tl._id}>{tl.name}</option>
                                                ))}
                                            </select>
                                            {submitted && !newProject.teamLead && (
                                                <p className="text-red-500 text-[11px] font-semibold mt-1">Team Lead is required!</p>
                                            )}
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Tech Stack (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={newProject.techStack}
                                            onChange={(e) => setNewProject({...newProject, techStack: e.target.value})}
                                            placeholder="e.g. React, Node.js, MongoDB" 
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700" 
                                        />
                                    </div>
                                </div>

                                {/* Start & End Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            required
                                            value={newProject.startDate}
                                            onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                                            className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.startDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition text-slate-700 font-medium`} 
                                        />
                                        {submitted && !newProject.startDate && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1">Start Date is required!</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">End Date <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            required
                                            value={newProject.endDate}
                                            onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                                            className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.endDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition text-slate-700 font-medium`} 
                                        />
                                        {submitted && !newProject.endDate && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1">End Date is required!</p>
                                        )}
                                    </div>
                                </div>

                                {/* Priority, Status & Estimated Tasks */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Priority <span className="text-red-500">*</span></label>
                                        <select 
                                            required
                                            value={newProject.priority}
                                            onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-slate-700 font-bold transition appearance-none cursor-pointer"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Project Status <span className="text-red-500">*</span></label>
                                        <select 
                                            required
                                            value={newProject.status}
                                            onChange={(e) => setNewProject({...newProject, status: e.target.value})}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-slate-700 font-bold transition appearance-none cursor-pointer"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                            <option value="On Track">On Track</option>
                                            <option value="At Risk">At Risk</option>
                                            <option value="Upcoming">Upcoming</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Planning">Planning</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Estimated Tasks (Optional)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={newProject.estimatedTasks}
                                            onChange={(e) => setNewProject({...newProject, estimatedTasks: parseInt(e.target.value) || 0})}
                                            placeholder="e.g. 15" 
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700" 
                                        />
                                    </div>
                                </div>

                                {/* Team Members Checklist Cards */}
                                <div>
                                    <label className="block font-bold text-slate-800 mb-2">Team Members <span className="text-red-500">*</span></label>
                                    <div className="w-full border border-slate-100 rounded-2xl bg-slate-50/50 p-4 max-h-[220px] overflow-y-auto scrollbar-thin">
                                        {teamMembersList.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-sm italic flex flex-col items-center gap-2">
                                                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                {newProject.teamLead ? "No members are assigned under this Team Lead" : "Please select a Team Lead above first"}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {teamMembersList.map((user) => {
                                                    const isChecked = newProject.teamMembers.includes(user._id);
                                                    const initials = user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'U';
                                                    return (
                                                        <label 
                                                            key={user._id} 
                                                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                                                                isChecked 
                                                                    ? 'bg-blue-50/50 border-blue-500 shadow-sm shadow-blue-50' 
                                                                    : 'bg-white border-slate-200/60 hover:bg-slate-100/30'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={() => toggleMember(user._id)}
                                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer" 
                                                            />
                                                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200/50 text-xs shrink-0 overflow-hidden shadow-inner">
                                                                {user.profilePic ? (
                                                                    <img src={user.profilePic} alt={user.name} className="w-full h-full object-cover" />
                                                                ) : initials}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-slate-800 font-bold text-sm truncate">{user.name}</span>
                                                                <span className={`text-[10px] font-bold tracking-wider uppercase ${
                                                                    user.role === 'qa' ? 'text-amber-600' : 'text-indigo-600'
                                                                }`}>{user.role === 'qa' ? 'QA Reviewer' : 'Developer'}</span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {submitted && (!newProject.teamMembers || newProject.teamMembers.length === 0) && (
                                        <p className="text-red-500 text-[11px] font-semibold mt-1">Please assign at least one Team Member!</p>
                                    )}
                                </div>

                                {/* Project Notes */}
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Project Notes (Optional)</label>
                                    <textarea 
                                        value={newProject.notes}
                                        onChange={(e) => setNewProject({...newProject, notes: e.target.value})}
                                        placeholder="Add initial notes or scope requirements here..." 
                                        rows="2" 
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none font-medium text-slate-700"
                                    ></textarea>
                                </div>

                                {/* Attachments with Multi-Upload Previews */}
                                <div>
                                    <label className="block font-bold text-slate-800 mb-2">Attachments (Optional)</label>
                                    
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-100 cursor-pointer transition-colors shadow-sm text-xs">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                                + Add Files
                                                <input 
                                                    type="file" 
                                                    multiple
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files);
                                                        setNewProject(prev => ({
                                                            ...prev,
                                                            attachments: [...prev.attachments, ...files]
                                                        }));
                                                    }}
                                                    className="hidden" 
                                                />
                                            </label>
                                            <span className="text-slate-400 text-xs font-semibold">Supports Images, Screenshots, PDFs, ZIPs, Docs</span>
                                        </div>

                                        {newProject.attachments.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto scrollbar-thin bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl">
                                                {newProject.attachments.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200/50 rounded-lg group shadow-sm">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="text-blue-500 shrink-0">
                                                                {file.type?.includes('image') ? (
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-slate-700 font-bold text-xs truncate max-w-[200px]">{file.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setNewProject(prev => ({
                                                                    ...prev,
                                                                    attachments: prev.attachments.filter((_, i) => i !== idx)
                                                                }));
                                                            }}
                                                            className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-5 flex items-center gap-4 shrink-0 border-t border-slate-100 bg-slate-50/50">
                                <button type="button" onClick={() => { setIsModalOpen(false); setSubmitted(false); }} className="flex-1 justify-center px-6 py-2.5 text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 justify-center flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                                >
                                    {isCreating ? "Creating Project..." : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Project Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[700px] flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out] border border-slate-100">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                                <div className="text-blue-600 relative flex items-center justify-center bg-blue-50 p-2 rounded-xl">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                </div>
                                Edit Project
                            </h2>
                            <button onClick={() => { setIsEditModalOpen(false); setSubmitted(false); }} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateProject} noValidate className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-6 py-5 space-y-5 text-sm overflow-y-auto flex-1 scrollbar-thin">
                                {/* Name and Client Name */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            required
                                            value={newProject.projectName}
                                            onChange={(e) => setNewProject({...newProject, projectName: e.target.value})}
                                            placeholder="e.g. E-Commerce Platform" 
                                            className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.projectName ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700`} 
                                        />
                                        {submitted && !newProject.projectName && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1">Project Name is required!</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Client Name (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={newProject.clientName}
                                            onChange={(e) => setNewProject({...newProject, clientName: e.target.value})}
                                            placeholder="e.g. Acme Corp" 
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700" 
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Description <span className="text-red-500">*</span></label>
                                    <textarea 
                                        required
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                                        placeholder="Detailed project description outlining scope and goals..." 
                                        rows="3" 
                                        className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.description ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none font-medium text-slate-700`}
                                    ></textarea>
                                    {submitted && !newProject.description && (
                                        <p className="text-red-500 text-[11px] font-semibold mt-1">Description is required!</p>
                                    )}
                                </div>

                                {/* Team Lead & Tech Stack */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Team Lead <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select 
                                                required
                                                value={newProject.teamLead}
                                                onChange={(e) => setNewProject({...newProject, teamLead: e.target.value})}
                                                className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.teamLead ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition cursor-pointer appearance-none text-slate-700 font-bold`}
                                            >
                                                <option value="">Select Team Lead</option>
                                                {teamLeads.map(tl => (
                                                    <option key={tl._id} value={tl._id}>{tl.name}</option>
                                                ))}
                                            </select>
                                            {submitted && !newProject.teamLead && (
                                                <p className="text-red-500 text-[11px] font-semibold mt-1">Team Lead is required!</p>
                                            )}
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Tech Stack (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={newProject.techStack}
                                            onChange={(e) => setNewProject({...newProject, techStack: e.target.value})}
                                            placeholder="e.g. React, Node.js, MongoDB" 
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700" 
                                        />
                                    </div>
                                </div>

                                {/* Start & End Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            required
                                            value={newProject.startDate}
                                            onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                                            className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.startDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition text-slate-700 font-medium`} 
                                        />
                                        {submitted && !newProject.startDate && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1">Start Date is required!</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">End Date <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            required
                                            value={newProject.endDate}
                                            onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                                            className={`w-full px-3.5 py-2.5 bg-white border ${submitted && !newProject.endDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition text-slate-700 font-medium`} 
                                        />
                                        {submitted && !newProject.endDate && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1">End Date is required!</p>
                                        )}
                                    </div>
                                </div>

                                {/* Priority, Status & Estimated Tasks */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Priority <span className="text-red-500">*</span></label>
                                        <select 
                                            required
                                            value={newProject.priority}
                                            onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-slate-700 font-bold transition appearance-none cursor-pointer"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Project Status <span className="text-red-500">*</span></label>
                                        <select 
                                            required
                                            value={newProject.status}
                                            onChange={(e) => setNewProject({...newProject, status: e.target.value})}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-slate-700 font-bold transition appearance-none cursor-pointer"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                            <option value="On Track">On Track</option>
                                            <option value="At Risk">At Risk</option>
                                            <option value="Upcoming">Upcoming</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Planning">Planning</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-1.5">Estimated Tasks (Optional)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={newProject.estimatedTasks}
                                            onChange={(e) => setNewProject({...newProject, estimatedTasks: parseInt(e.target.value) || 0})}
                                            placeholder="e.g. 15" 
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700" 
                                        />
                                    </div>
                                </div>

                                {/* Team Members Checklist Cards */}
                                <div>
                                    <label className="block font-bold text-slate-800 mb-2">Team Members <span className="text-red-500">*</span></label>
                                    <div className="w-full border border-slate-100 rounded-2xl bg-slate-50/50 p-4 max-h-[220px] overflow-y-auto scrollbar-thin">
                                        {teamMembersList.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-sm italic flex flex-col items-center gap-2">
                                                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                {newProject.teamLead ? "No members are assigned under this Team Lead" : "Please select a Team Lead above first"}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {teamMembersList.map((user) => {
                                                    const isChecked = newProject.teamMembers.includes(user._id);
                                                    const initials = user.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'U';
                                                    return (
                                                        <label 
                                                            key={user._id} 
                                                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                                                                isChecked 
                                                                    ? 'bg-blue-50/50 border-blue-500 shadow-sm shadow-blue-50' 
                                                                    : 'bg-white border-slate-200/60 hover:bg-slate-100/30'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={() => toggleMember(user._id)}
                                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer" 
                                                            />
                                                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200/50 text-xs shrink-0 overflow-hidden shadow-inner">
                                                                {user.profilePic ? (
                                                                    <img src={user.profilePic} alt={user.name} className="w-full h-full object-cover" />
                                                                ) : initials}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-slate-800 font-bold text-sm truncate">{user.name}</span>
                                                                <span className={`text-[10px] font-bold tracking-wider uppercase ${
                                                                    user.role === 'qa' ? 'text-amber-600' : 'text-indigo-600'
                                                                }`}>{user.role === 'qa' ? 'QA Reviewer' : 'Developer'}</span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {submitted && (!newProject.teamMembers || newProject.teamMembers.length === 0) && (
                                        <p className="text-red-500 text-[11px] font-semibold mt-1">Please assign at least one Team Member!</p>
                                    )}
                                </div>

                                {/* Existing Attachments Section */}
                                {editingProject?.attachments && editingProject.attachments.length > 0 && (
                                    <div>
                                        <label className="block font-bold text-slate-800 mb-2">Existing Attachments</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50 p-2.5 border border-slate-150 rounded-xl max-h-[140px] overflow-y-auto scrollbar-thin">
                                            {editingProject.attachments.map((file, idx) => (
                                                <div key={file._id || idx} className="flex items-center justify-between p-2 bg-white border border-slate-200/50 rounded-lg shadow-sm">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="text-blue-500 shrink-0">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-slate-700 font-bold text-xs truncate max-w-[200px]">{file.filename || "Attachment"}</span>
                                                        </div>
                                                    </div>
                                                    <a 
                                                        href={file.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-2"
                                                    >
                                                        View
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Attachments with Multi-Upload Previews */}
                                <div>
                                    <label className="block font-bold text-slate-800 mb-2">Upload More Attachments (Optional)</label>
                                    
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-100 cursor-pointer transition-colors shadow-sm text-xs">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                                + Add Files
                                                <input 
                                                    type="file" 
                                                    multiple
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files);
                                                        setNewProject(prev => ({
                                                            ...prev,
                                                            attachments: [...prev.attachments, ...files]
                                                        }));
                                                    }}
                                                    className="hidden" 
                                                />
                                            </label>
                                            <span className="text-slate-400 text-xs font-semibold">Add new files to this project</span>
                                        </div>

                                        {newProject.attachments.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto scrollbar-thin bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl">
                                                {newProject.attachments.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200/50 rounded-lg group shadow-sm">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="text-blue-500 shrink-0">
                                                                {file.type?.includes('image') ? (
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-slate-700 font-bold text-xs truncate max-w-[200px]">{file.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setNewProject(prev => ({
                                                                    ...prev,
                                                                    attachments: prev.attachments.filter((_, i) => i !== idx)
                                                                }));
                                                            }}
                                                            className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-5 flex items-center gap-4 shrink-0 border-t border-slate-100 bg-slate-50/50">
                                <button type="button" onClick={() => { setIsEditModalOpen(false); setSubmitted(false); }} className="flex-1 justify-center px-6 py-2.5 text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 justify-center flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                                >
                                    {isCreating ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ─── Delete Confirmation Modal ───────────────────────────────── */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="pt-8 pb-6 px-6 text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                                <Trash2 className="w-8 h-8 text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Move to Trash?</h3>
                            <p className="text-sm text-slate-500 leading-relaxed px-2">
                                This project will be moved to the <span className="font-bold text-slate-700">Trash</span>. You can restore it within <span className="text-blue-600 font-bold">30 days</span> before it is permanently deleted.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteProject}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Moving...</>
                                ) : 'Move to Trash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Project Details Sidebar */}
            {selectedProjectId && (
                <ProjectDetailsSidebar 
                    projectId={selectedProjectId} 
                    onClose={() => setSelectedProjectId(null)} 
                />
            )}
        </div>
    );
};

export default ProjectsDashboard;
