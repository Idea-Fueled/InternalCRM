import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectService, taskService, userService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { toast } from "sonner";
import {
    ArrowLeft, Calendar, Users, CheckCircle2, Clock, AlertCircle,
    LayoutList, Download, X, Paperclip, MessageSquare, Plus, FileText,
    Image as ImageIcon, Archive, Eye, Trash2, Edit3, Send, Check, AlertTriangle, ShieldAlert
} from "lucide-react";

const ProjectDetails = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Core States
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [projectAttachments, setProjectAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sidebar & Role management
    const sidebarRole = user?.role === "TL" ? "teamLead" : user?.role || "admin";
    const isAdmin = user?.role === "admin";
    const isProjectTL = project?.teamLead?._id === user?._id || project?.teamLead === user?._id;

    // Modals & Dynamic UI States
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);

    // Eligible Members (for adding/removing team members)
    const [eligibleMembers, setEligibleMembers] = useState([]);
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);

    // Create Task form state
    const [newTask, setNewTask] = useState({
        taskName: "",
        description: "",
        assignedTo: "",
        assignedQA: "",
        priority: "Medium",
        startDate: new Date().toISOString().split("T")[0],
        endDate: ""
    });
    const [taskSubmitting, setTaskSubmitting] = useState(false);

    // File attachments uploads state (Project details level)
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const fileInputRef = useRef(null);

    // Project comments state
    const [newCommentText, setNewCommentText] = useState("");
    const [commentSubmitting, setCommentSubmitting] = useState(false);

    // Task transition inputs state
    const [transitionStatus, setTransitionStatus] = useState("");
    const [transitionNotes, setTransitionNotes] = useState("");
    const [transitionAttachments, setTransitionAttachments] = useState([]);
    const [uploadingTaskFiles, setUploadingTaskFiles] = useState(false);

    // Task filter states
    const [taskFilterStatus, setTaskFilterStatus] = useState("All");
    const [taskFilterPriority, setTaskFilterPriority] = useState("All");

    // Format Dates Utility
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch (e) {
            return dateString;
        }
    };

    // Load Project details and populated sub-elements
    const loadProject = async () => {
        try {
            setLoading(true);
            const res = await projectService.getProjectById(projectId);
            if (res.data.success) {
                const proj = res.data.project;
                setProject(proj);
                setTasks(proj.tasks || []);
                
                let attachmentsList = proj.attachments || [];
                if (attachmentsList.length === 0 && proj.attachment) {
                    attachmentsList = [{
                        url: proj.attachment,
                        filename: proj.attachment.split('/').pop() || "Legacy Attachment",
                        fileType: proj.attachment.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i) ? "image/png" : "application/octet-stream",
                        uploadedBy: proj.teamLead || { name: "System" },
                        createdAt: proj.createdAt || new Date()
                    }];
                }
                setProjectAttachments(attachmentsList);
                setSelectedMemberIds((proj.teamMembers || []).map(m => m._id));
            }
        } catch (err) {
            console.error("Error loading project details", err);
            setError(err.response?.status === 403 ? "Forbidden" : err.response?.data?.message || "Failed to load project details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            loadProject();
        }
    }, [projectId]);

    // Load Eligible Members for project editing
    useEffect(() => {
        const fetchEligibleMembers = async () => {
            if (!project) return;
            try {
                // If Team Lead is logged in or set, we can load team members reporting to them,
                // or load all Developers & QAs if Admin.
                const params = {};
                if (project.teamLead?._id) {
                    params.teamLead = project.teamLead._id;
                }
                const res = await userService.getAllUsers(params);
                const devsAndQas = (res.data.data || []).filter(u => u.role === "developer" || u.role === "qa");
                setEligibleMembers(devsAndQas);
            } catch (err) {
                console.error("Failed to load eligible team members", err);
            }
        };

        if (isMemberModalOpen) {
            fetchEligibleMembers();
        }
    }, [isMemberModalOpen, project]);

    // ─── Project Management Methods ──────────────────────────────────────────

    // Handle Project File Upload
    const handleProjectFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            setUploadingFiles(true);
            const formData = new FormData();
            files.forEach(file => {
                formData.append("attachments", file);
            });

            const res = await projectService.uploadProjectAttachments(projectId, formData);
            if (res.data.success) {
                toast.success("Project files uploaded successfully!");
                loadProject();
            }
        } catch (err) {
            console.error("Failed to upload project attachments", err);
            toast.error(err.response?.data?.message || "Failed to upload files");
        } finally {
            setUploadingFiles(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Handle Adding Project Notes (Comments)
    const handleAddProjectNote = async (e) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;

        try {
            setCommentSubmitting(true);
            const res = await projectService.addProjectNote(projectId, newCommentText.trim());
            if (res.data.success) {
                toast.success("Note added to project!");
                setNewCommentText("");
                loadProject();
            }
        } catch (err) {
            console.error("Failed to add project note", err);
            toast.error(err.response?.data?.message || "Failed to add comment");
        } finally {
            setCommentSubmitting(false);
        }
    };

    // Save Updated Project Members Checklist
    const handleSaveProjectMembers = async () => {
        try {
            const res = await projectService.updateProjectMembers(projectId, selectedMemberIds);
            if (res.data.success) {
                toast.success("Project team members updated!");
                setIsMemberModalOpen(false);
                loadProject();
            }
        } catch (err) {
            console.error("Failed to update project members", err);
            toast.error(err.response?.data?.message || "Failed to update team members");
        }
    };

    // Toggle Member Selection
    const toggleMemberSelection = (memberId) => {
        setSelectedMemberIds(prev => 
            prev.includes(memberId) 
                ? prev.filter(id => id !== memberId) 
                : [...prev, memberId]
        );
    };

    // ─── Task Management Methods ───────────────────────────────────────────────

    // Create New Task inside project
    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTask.taskName.trim()) {
            toast.error("Task Name is required");
            return;
        }

        try {
            setTaskSubmitting(true);
            const payload = {
                ...newTask,
                project: projectId
            };
            const res = await taskService.createTask(payload);
            if (res.data.success) {
                toast.success(`Task "${newTask.taskName}" created successfully!`);
                setIsTaskModalOpen(false);
                setNewTask({
                    taskName: "",
                    description: "",
                    assignedTo: "",
                    assignedQA: "",
                    priority: "Medium",
                    startDate: new Date().toISOString().split("T")[0],
                    endDate: ""
                });
                loadProject();
            }
        } catch (err) {
            console.error("Failed to create task", err);
            toast.error(err.response?.data?.message || "Failed to create task");
        } finally {
            setTaskSubmitting(false);
        }
    };

    // Upload Task Transition File (sequential upload via standard single Multer field 'file')
    const handleTaskFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingTaskFiles(true);
        const uploadedList = [...transitionAttachments];

        try {
            for (let file of files) {
                const formData = new FormData();
                formData.append("file", file);
                const res = await taskService.uploadAttachment(formData);
                if (res.data.success) {
                    uploadedList.push(res.data.file);
                }
            }
            setTransitionAttachments(uploadedList);
            toast.success("Transition attachments uploaded!");
        } catch (err) {
            console.error("Task upload error", err);
            toast.error("Failed to upload transition file");
        } finally {
            setUploadingTaskFiles(false);
        }
    };

    // Submit Task Transition status update
    const handleSubmitTransition = async (e) => {
        e.preventDefault();
        if (!transitionStatus) {
            toast.error("Status is required");
            return;
        }

        try {
            const res = await taskService.updateTaskStatus(
                selectedTask._id,
                transitionStatus,
                transitionNotes.trim(),
                transitionAttachments,
                [] // Screenshot links
            );

            if (res.data.success) {
                toast.success(`Task status transitioned to "${transitionStatus}"!`);
                setIsTransitionModalOpen(false);
                setSelectedTask(null);
                
                // Clear state
                setTransitionStatus("");
                setTransitionNotes("");
                setTransitionAttachments([]);

                loadProject();
            }
        } catch (err) {
            console.error("Transition failed", err);
            toast.error(err.response?.data?.message || "Failed to update task workflow status");
        }
    };

    // Calculate dynamic activity timeline events sorted chronologically
    const getTimelineEvents = () => {
        const events = [];

        // Project Creation
        if (project) {
            events.push({
                id: "proj-creation",
                type: "project_created",
                title: "Project Initialized",
                description: `Project "${project.projectName}" was set up under ${project.teamLead?.name || "N/A"} for client "${project.clientName || "Internal"}".`,
                date: project.createdAt || project.startDate,
                user: project.teamLead
            });
        }

        // Project Notes
        if (project?.notes) {
            project.notes.forEach((n, idx) => {
                events.push({
                    id: `note-${idx}-${n._id || idx}`,
                    type: "note",
                    title: "Discussion Note Added",
                    description: n.text,
                    date: n.createdAt,
                    user: n.author
                });
            });
        }

        // Project Attachments
        if (projectAttachments) {
            projectAttachments.forEach((att, idx) => {
                events.push({
                    id: `att-${idx}-${att._id || idx}`,
                    type: "attachment",
                    title: "Project Document Uploaded",
                    description: `Uploaded file "${att.filename}" to the project workspace.`,
                    date: att.createdAt,
                    user: att.uploadedBy,
                    meta: att
                });
            });
        }

        // Tasks Status History
        if (tasks) {
            tasks.forEach((task) => {
                if (task.statusHistory) {
                    task.statusHistory.forEach((hist, idx) => {
                        events.push({
                            id: `task-hist-${task._id}-${idx}`,
                            type: "task_status",
                            title: `Task Status Update`,
                            description: `Task "${task.taskName}" shifted from "${hist.fromStatus}" to "${hist.status}".`,
                            comment: hist.notes !== "Initial assignment" ? hist.notes : "",
                            date: hist.changedAt,
                            user: hist.changedBy,
                            meta: { taskName: task.taskName, taskId: task._id, attachments: hist.attachments }
                        });
                    });
                }
            });
        }

        return events.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    // ─── Render Conditions ────────────────────────────────────────────────────

    // 403 Forbidden Access Page
    if (error === "Forbidden") {
        return (
            <div className="flex h-screen w-screen bg-slate-900 font-sans items-center justify-center p-4">
                <div className="bg-slate-950/80 rounded-3xl p-8 max-w-lg border border-rose-500/20 text-center shadow-2xl relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 border border-rose-500/20 animate-pulse">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-2">Access Boundary Violation</h1>
                    <p className="text-sm font-semibold text-slate-400 leading-relaxed mb-8">
                        You do not have active assignment parameters for this project. Restricted access rules strictly enforce visibility scoping for Admin, Team Lead, and assigned Developers/QA.
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-lg shadow-rose-950/40 cursor-pointer"
                    >
                        Go Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    if (loading && !project) {
        return (
            <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
                <AdminSidebar role={sidebarRole} />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <Topbar DashboardTile="Loading Workspace..." />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Project Parameters...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
                <AdminSidebar role={sidebarRole} />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <Topbar DashboardTile="Error" />
                    <main className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
                        <div className="text-center max-w-md bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
                            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h3>
                            <p className="text-sm font-medium text-slate-500 mb-6">{error}</p>
                            <button
                                onClick={() => navigate(-1)}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition"
                            >
                                Go Back
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // Helper counts & stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "Completed" || t.status === "Done").length;
    const inProgressTasks = tasks.filter(t => t.status === "In Progress").length;
    const qaReviewTasks = tasks.filter(t => t.status === "QA Review").length;
    const newTasks = tasks.filter(t => t.status === "New").length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Filtered task items
    const filteredTasks = tasks.filter(t => {
        const matchesStatus = taskFilterStatus === "All" || t.status === taskFilterStatus;
        const matchesPriority = taskFilterPriority === "All" || t.priority === taskFilterPriority;
        return matchesStatus && matchesPriority;
    });

    const isAuthorizedToManage = isAdmin || isProjectTL;
    const timelineEvents = getTimelineEvents();

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar role={sidebarRole} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Project Details Workspace" />

                <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
                    {/* BACK NAVIGATION */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition group mb-2 text-xs uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Workspace
                    </button>

                    {/* SECTION 1: HEADER SECTION */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/60 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/40 rounded-bl-full -z-0 opacity-40"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-3 max-w-3xl">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                            project.status === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                            project.status === "Active" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                            project.status === "On Track" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                            project.status === "At Risk" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                            "bg-slate-50 text-slate-600 border-slate-200"
                                        }`}>
                                            {project.status || "Active"}
                                        </span>
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                            project.priority === "Critical" ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" :
                                            project.priority === "High" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                            project.priority === "Medium" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                            "bg-slate-50 text-slate-500 border-slate-100"
                                        }`}>
                                            {project.priority || "Medium"} Priority
                                        </span>
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{project.projectName}</h1>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Start: {formatDate(project.startDate)}
                                        </span>
                                        <span className="flex items-center gap-1 text-rose-600">
                                            <Clock className="w-3.5 h-3.5" />
                                            End: {formatDate(project.endDate)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            Lead: {project.teamLead?.name || "Unassigned"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end shrink-0 md:text-right">
                                    <div className="text-3xl font-black text-indigo-600">{progressPercent}%</div>
                                    <span className="text-[10px] font-semibold text-slate-400 mt-1">Project Completion</span>
                                </div>
                            </div>

                            {/* Completion Progress Bar */}
                            <div className="space-y-2">
                                <div className="w-full bg-slate-100 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                                    <span>Tasks: {completedTasks} / {totalTasks} Completed</span>
                                    <span>{totalTasks - completedTasks} Remaining</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TWO COLUMN GRID FOR SECTIONS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT COLUMN: MAIN WORKSPACE (Overview, Tasks, Attachments, Notes) */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* SECTION 2: PROJECT DESCRIPTION */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                                    <h3 className="section-title">Overview & Strategy</h3>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Specs</span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                                    {project.description || "No project overview parameters defined yet."}
                                </p>

                                {/* Optional Fields Showcase */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">Client Partner</span>
                                        <span className="text-xs font-bold text-slate-700">{project.clientName || "N/A"}</span>
                                    </div>
                                    <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">Estimated Taskload</span>
                                        <span className="text-xs font-bold text-slate-700">{project.estimatedTasks || 0} Units</span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: TASKS WORKSPACE */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 flex flex-col overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                                    <div>
                                        <h3 className="section-title flex items-center">
                                            <LayoutList className="w-5 h-5 mr-2 text-indigo-600" />
                                            Project Tasks ({filteredTasks.length})
                                        </h3>
                                        <span className="section-subtitle">Sprint tasks and assignment workflow tracker</span>
                                    </div>

                                    {isAuthorizedToManage && (
                                        <button
                                            onClick={() => setIsTaskModalOpen(true)}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-200 transition duration-300 flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Task
                                        </button>
                                    )}
                                </div>

                                {/* Filters Panel */}
                                <div className="px-6 py-3.5 bg-white border-b border-slate-50 flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-semibold text-slate-400">Status:</span>
                                        <select
                                            value={taskFilterStatus}
                                            onChange={(e) => setTaskFilterStatus(e.target.value)}
                                            className="bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1 text-xs font-black text-slate-600 focus:outline-none"
                                        >
                                            <option value="All">All Statuses</option>
                                            <option value="New">New</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="QA Review">QA Review</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-semibold text-slate-400">Priority:</span>
                                        <select
                                            value={taskFilterPriority}
                                            onChange={(e) => setTaskFilterPriority(e.target.value)}
                                            className="bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1 text-xs font-black text-slate-600 focus:outline-none"
                                        >
                                            <option value="All">All Priorities</option>
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Tasks Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/20 border-b border-slate-50 text-[10px] text-slate-400 font-semibold">
                                            <tr>
                                                <th className="px-6 py-3">Task Parameter</th>
                                                <th className="px-6 py-3">Assignees</th>
                                                <th className="px-6 py-3">Priority</th>
                                                <th className="px-6 py-3">Workflow State</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {filteredTasks.map((task) => (
                                                <tr
                                                    key={task._id}
                                                    onClick={() => setSelectedTask(task)}
                                                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1 max-w-[200px] md:max-w-xs">
                                                            <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                                                {task.taskName}
                                                            </p>
                                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                                <Calendar className="w-3 h-3 text-slate-300" />
                                                                Due: {formatDate(task.endDate)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            {/* Dev */}
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center text-[9px] font-black text-blue-600 border border-blue-100 overflow-hidden shrink-0">
                                                                    {task.assignedTo?.profilePic ? (
                                                                        <img src={task.assignedTo.profilePic} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        task.assignedTo?.name?.charAt(0) || "U"
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col leading-tight">
                                                                    <span className="text-[11px] font-bold text-slate-700">{task.assignedTo?.name || "Unassigned"}</span>
                                                                    <span className="text-[8px] font-bold text-slate-400">Developer</span>
                                                                </div>
                                                            </div>
                                                            {/* QA */}
                                                            {task.assignedQA && (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center text-[9px] font-bold text-indigo-600 border border-indigo-100 overflow-hidden shrink-0">
                                                                        {task.assignedQA.profilePic ? (
                                                                            <img src={task.assignedQA.profilePic} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            task.assignedQA.name?.charAt(0) || "Q"
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col leading-tight">
                                                                        <span className="text-[11px] font-bold text-slate-700">{task.assignedQA.name}</span>
                                                                        <span className="text-[8px] font-bold text-slate-400">QA Reviewer</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                            task.priority === "Critical" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                                            task.priority === "High" ? "bg-orange-50 text-orange-600 border border-orange-100" :
                                                            task.priority === "Medium" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                                            "bg-slate-50 text-slate-500 border border-slate-100"
                                                        }`}>
                                                            {task.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-semibold ${
                                                            task.status === "Completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                                            task.status === "QA Review" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                                                            task.status === "In Progress" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                                            "bg-slate-50 text-slate-600 border border-slate-200"
                                                        }`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition"
                                                            title="Edit Task workflow / view details"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTask(task);
                                                            }}
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredTasks.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center bg-slate-50/20">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <LayoutList className="w-8 h-8 text-slate-300 mb-2" />
                                                            <h4 className="text-sm font-bold text-slate-800">No sprint tasks found</h4>
                                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">Start by clicking Add Task to build project sprints.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* SECTION 5: ATTACHMENTS SECTION */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                                    <div>
                                        <h3 className="section-title">Project Attachments</h3>
                                        <span className="section-subtitle">Multi-file document repository</span>
                                    </div>

                                    <div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleProjectFileUpload}
                                            multiple
                                            className="hidden"
                                            id="project-file-upload-input"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingFiles}
                                            className="px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-black transition duration-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            {uploadingFiles ? (
                                                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                            {uploadingFiles ? "Uploading..." : "Add More"}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {projectAttachments.map((file, idx) => {
                                        const isImg = file.fileType?.includes("image");
                                        const isPdf = file.fileType?.includes("pdf");
                                        const isZip = file.fileType?.includes("zip") || file.fileType?.includes("octet-stream") || file.filename.endsWith(".zip");

                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                                        isImg ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        isPdf ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                        isZip ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                        "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                    }`}>
                                                        {isImg ? <ImageIcon className="w-5 h-5" /> :
                                                         isZip ? <Archive className="w-5 h-5" /> :
                                                         <FileText className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 leading-snug">
                                                        <span className="text-xs font-black text-slate-700 truncate max-w-[150px] md:max-w-[200px]" title={file.filename}>
                                                            {file.filename}
                                                        </span>
                                                        <span className="text-[9px] font-semibold text-slate-400">
                                                            By {file.uploadedBy?.name || "System"} • {formatDate(file.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-white hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg shadow-sm border border-slate-100 transition shrink-0"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        );
                                    })}
                                    {projectAttachments.length === 0 && (
                                        <div className="sm:col-span-2 py-8 text-center bg-slate-50/20 rounded-2xl border border-dashed border-slate-100">
                                            <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                                            <p className="text-xs font-bold text-slate-400">No project documents uploaded yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 6: DISCUSSION NOTES */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-6">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                                    <div>
                                        <h3 className="section-title">Discussion & Activity Notes</h3>
                                        <span className="section-subtitle">Admin, Lead, and Dev thread</span>
                                    </div>
                                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                                </div>

                                {/* Comments Thread List */}
                                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin">
                                    {(project.notes || []).map((note, idx) => (
                                        <div key={idx} className="flex gap-3 items-start">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm overflow-hidden">
                                                {note.author?.profilePic ? (
                                                    <img src={note.author.profilePic} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    note.author?.name?.charAt(0) || "U"
                                                )}
                                            </div>
                                            <div className="flex-1 bg-slate-50/60 border border-slate-100/50 p-3 rounded-2xl space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-800">{note.author?.name || "System User"}</span>
                                                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-semibold ${
                                                            note.author?.role === "admin" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                                            note.author?.role === "TL" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                            "bg-blue-50 text-blue-600 border border-blue-100"
                                                        }`}>
                                                            {note.author?.role === "TL" ? "Team Lead" : note.author?.role || "Member"}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400">{formatDate(note.createdAt)}</span>
                                                </div>
                                                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                                                    {note.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {(project.notes || []).length === 0 && (
                                        <div className="py-8 text-center text-slate-400">
                                            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                            <p className="text-xs font-bold">No posts or notes found. Initialize the thread below!</p>
                                        </div>
                                    )}
                                </div>

                                {/* Post Note Form */}
                                <form onSubmit={handleAddProjectNote} className="flex gap-2.5 items-center">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={newCommentText}
                                            onChange={(e) => setNewCommentText(e.target.value)}
                                            placeholder="Post a secure update or architectural note to the team..."
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-700 placeholder-slate-400"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={commentSubmitting || !newCommentText.trim()}
                                        className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md transition disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
                                    >
                                        {commentSubmitting ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Send className="w-4.5 h-4.5" />
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SIDEBAR METRICS & TEAM PARAMETERS */}
                        <div className="space-y-6">

                            {/* PROJECT STATS / QUICK METRICS */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 pb-2 border-b border-slate-50">Taskload Distribution</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50/50 rounded-2xl p-3.5 border border-slate-100 text-center">
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">In Progress</span>
                                        <span className="text-xl font-black text-blue-600">{inProgressTasks}</span>
                                    </div>
                                    <div className="bg-slate-50/50 rounded-2xl p-3.5 border border-slate-100 text-center">
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">QA Review</span>
                                        <span className="text-xl font-black text-indigo-600">{qaReviewTasks}</span>
                                    </div>
                                    <div className="bg-slate-50/50 rounded-2xl p-3.5 border border-slate-100 text-center col-span-2">
                                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">Completed / Sprint Done</span>
                                        <span className="text-xl font-black text-emerald-600">{completedTasks}</span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: PROJECT TEAM SECTION */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400">Project Team</h3>
                                        <span className="text-[9px] font-semibold text-slate-400">Assigned parameters</span>
                                    </div>
                                    {isAuthorizedToManage && (
                                        <button
                                            onClick={() => setIsMemberModalOpen(true)}
                                            className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition"
                                            title="Manage Members"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {/* Team Lead */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-semibold text-slate-400 block">Team Lead</span>
                                        <div className="flex items-center gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                                            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-sm overflow-hidden shrink-0">
                                                {project.teamLead?.profilePic ? (
                                                    <img src={project.teamLead.profilePic} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    project.teamLead?.name?.charAt(0) || "L"
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-black text-slate-800 truncate">{project.teamLead?.name || "N/A"}</span>
                                                <span className="text-[9px] font-semibold text-slate-400">Project Manager / TL</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Developers & QA list */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-semibold text-slate-400 block">Team Members</span>
                                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[9px] font-black">{project.teamMembers?.length || 0}</span>
                                        </div>

                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 scrollbar-thin">
                                            {(project.teamMembers || []).map((m) => (
                                                <div key={m._id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition cursor-default">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-7.5 h-7.5 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                                                            {m.profilePic ? (
                                                                <img src={m.profilePic} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                m.name?.charAt(0) || "U"
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 leading-tight">
                                                            <span className="text-xs font-black text-slate-700 truncate">{m.name}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 truncate">{m.email}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-semibold shrink-0 ${
                                                        m.role === "qa" ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                                                    }`}>
                                                        {m.role === "qa" ? "QA" : "Dev"}
                                                    </span>
                                                </div>
                                            ))}
                                            {(project.teamMembers || []).length === 0 && (
                                                <div className="py-4 text-center text-xs text-slate-400 font-bold">
                                                    No team members assigned
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 7: ACTIVITY TIMELINE */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 pb-2 border-b border-slate-50">Sprint Activity Feed</h3>

                                <div className="max-h-[400px] overflow-y-auto pr-2 pl-6 scrollbar-thin py-2">
                                    <div className="relative border-l-2 border-slate-100 pl-4 space-y-6">
                                        {timelineEvents.map((ev) => {
                                            const isCreate = ev.type === "project_created";
                                            const isNote = ev.type === "note";
                                            const isAttach = ev.type === "attachment";
                                            const isTask = ev.type === "task_status";

                                            return (
                                                <div key={ev.id} className="relative space-y-1.5">
                                                    {/* Left dot */}
                                                    <span className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                                                        isCreate ? "bg-amber-500" :
                                                        isNote ? "bg-indigo-500" :
                                                        isAttach ? "bg-rose-500" :
                                                        "bg-blue-500"
                                                    }`}></span>

                                                    <div className="leading-tight">
                                                        <span className="text-[10px] font-black text-slate-400">{formatDate(ev.date)}</span>
                                                        <h4 className="text-xs font-black text-slate-800">{ev.title}</h4>
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-slate-500 leading-normal">
                                                        {ev.description}
                                                    </p>
                                                    {ev.comment && (
                                                        <p className="text-[10px] font-bold text-slate-400 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100/50">
                                                            "{ev.comment}"
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-1.5 pt-0.5">
                                                        <div className="w-4.5 h-4.5 bg-slate-200 rounded-full flex items-center justify-center font-black text-[7px] text-slate-600 overflow-hidden">
                                                            {ev.user?.profilePic ? (
                                                                <img src={ev.user.profilePic} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                ev.user?.name?.charAt(0) || "S"
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-400">{ev.user?.name || "System"}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {timelineEvents.length === 0 && (
                                            <div className="py-4 text-center text-xs text-slate-400 font-bold">
                                                No recent activities logged
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* ─── MODAL 1: TEAM MEMBERS EDIT MODAL ─────────────────────────────────── */}
            {isMemberModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Manage Team Members</h3>
                                <span className="text-[10px] font-semibold text-slate-400">Select project taskforce</span>
                            </div>
                            <button
                                onClick={() => setIsMemberModalOpen(false)}
                                className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search members bar */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="w-full pl-3 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-700 placeholder-slate-400"
                            />
                        </div>

                        {/* Members Grid selection */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                            {eligibleMembers
                                .filter(m => 
                                    m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                                    m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                                )
                                .map((member) => {
                                    const isChecked = selectedMemberIds.includes(member._id);
                                    return (
                                        <div
                                            key={member._id}
                                            onClick={() => toggleMemberSelection(member._id)}
                                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                                isChecked
                                                    ? "bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50"
                                                    : "bg-white border-slate-100 hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8.5 h-8.5 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-black text-xs overflow-hidden">
                                                    {member.profilePic ? (
                                                        <img src={member.profilePic} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        member.name.charAt(0)
                                                    )}
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className="text-xs font-black text-slate-800">{member.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{member.email}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-semibold ${
                                                    member.role === "qa" ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                                                }`}>
                                                    {member.role === "qa" ? "QA" : "Dev"}
                                                </span>
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                                    isChecked
                                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                                        : "bg-white border-slate-200"
                                                }`}>
                                                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setIsMemberModalOpen(false)}
                                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-black border border-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProjectMembers}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-200 transition"
                            >
                                Save Team Members
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL 2: ADD TASK MODAL ────────────────────────────────────────── */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <form
                        onSubmit={handleCreateTask}
                        className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Create Sprint Task</h3>
                                <span className="text-[10px] font-semibold text-slate-400">Initialize new project workflow task</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTaskModalOpen(false)}
                                className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                            {/* Task Name */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400">Task Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Task summary or feature target..."
                                    value={newTask.taskName}
                                    onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-700"
                                />
                            </div>

                            {/* Task Description */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400">Description</label>
                                <textarea
                                    rows="3"
                                    placeholder="Detailed task guidelines..."
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-700 resize-none"
                                ></textarea>
                            </div>

                            {/* Assignee Developer (filtered from project members) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400">Assign Developer</label>
                                <select
                                    value={newTask.assignedTo}
                                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-600"
                                >
                                    <option value="">Unassigned</option>
                                    {(project.teamMembers || [])
                                        .filter(m => m.role === "developer")
                                        .map(m => (
                                            <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                                        ))
                                    }
                                </select>
                            </div>

                            {/* Assign QA Reviewer (filtered from project members) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400">Assign QA Reviewer</label>
                                <select
                                    value={newTask.assignedQA}
                                    onChange={(e) => setNewTask({ ...newTask, assignedQA: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-600"
                                >
                                    <option value="">Unassigned</option>
                                    {(project.teamMembers || [])
                                        .filter(m => m.role === "qa")
                                        .map(m => (
                                            <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                                        ))
                                    }
                                </select>
                            </div>

                            {/* Grid for Priority, Start & End Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-400">Priority</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                        className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-600"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-400">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={newTask.startDate}
                                        onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                                        className="w-full px-2 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none transition font-semibold text-xs text-slate-600 cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-400">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={newTask.endDate}
                                        onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                                        className="w-full px-2 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none transition font-semibold text-xs text-slate-600 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsTaskModalOpen(false)}
                                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-black border border-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={taskSubmitting}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-200 transition disabled:opacity-50"
                            >
                                {taskSubmitting ? "Creating..." : "Create Task"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ─── MODAL 3: TASK DETAILS WORKSPACE MODAL ───────────────────────────── */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                            <div className="space-y-1 max-w-[80%]">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        selectedTask.priority === "Critical" ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse" :
                                        selectedTask.priority === "High" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                        selectedTask.priority === "Medium" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                        "bg-slate-50 text-slate-500 border border-slate-100"
                                    }`}>
                                        {selectedTask.priority} Priority
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        selectedTask.status === "Completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                        selectedTask.status === "QA Review" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                                        selectedTask.status === "In Progress" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                        "bg-slate-50 text-slate-600 border border-slate-200"
                                    }`}>
                                        {selectedTask.status}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">{selectedTask.taskName}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
                            {/* Two column grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left Side: Details & Activity */}
                                <div className="md:col-span-2 space-y-6">
                                    {/* Description */}
                                    <div className="space-y-1.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-semibold text-slate-400 block">Task Outline</span>
                                        <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                            {selectedTask.description || "No task outline descriptions provided."}
                                        </p>
                                    </div>

                                    {/* Task Status History / notes (masked automatically by backend if unauthorized) */}
                                    <div className="space-y-4">
                                        <span className="text-[10px] font-semibold text-slate-400 block pb-1.5 border-b border-slate-50">Workflow Progress Logs</span>
                                        <div className="relative border-l-2 border-slate-100 pl-4 space-y-4 py-1">
                                            {(selectedTask.statusHistory || []).map((h, idx) => (
                                                <div key={idx} className="relative space-y-1 text-xs">
                                                    {/* dot */}
                                                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-white bg-indigo-600"></span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-slate-800">
                                                            Workflow: {h.fromStatus} → {h.status}
                                                        </span>
                                                        <span className="text-[9px] font-black text-slate-400">{formatDate(h.changedAt)}</span>
                                                    </div>
                                                    <p className="text-slate-500 font-medium">{h.notes}</p>
                                                    
                                                    {/* Transition attachments (Confidentiality handled secure backend) */}
                                                    {h.attachments && h.attachments.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {h.attachments.map((att, aIdx) => (
                                                                <a
                                                                    key={aIdx}
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-indigo-600 rounded text-[10px] font-bold shadow-sm transition"
                                                                >
                                                                    <Paperclip className="w-3 h-3 shrink-0" />
                                                                    <span className="truncate max-w-[120px]">{att.filename}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {(selectedTask.statusHistory || []).length === 0 && (
                                                <span className="text-xs text-slate-400 font-bold block pl-1">No progress updates log.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Assignees & Timeline */}
                                <div className="space-y-4">
                                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-semibold text-slate-400 block pb-1 border-b border-slate-100">Details</span>
                                        
                                        <div>
                                            <span className="text-[9px] font-semibold text-slate-400 block">Developer Assignee</span>
                                            <span className="text-xs font-bold text-slate-700">{selectedTask.assignedTo?.name || "Unassigned"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-semibold text-slate-400 block">QA reviewer</span>
                                            <span className="text-xs font-bold text-slate-700">{selectedTask.assignedQA?.name || "Unassigned"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-semibold text-slate-400 block">Start Date</span>
                                            <span className="text-xs font-bold text-slate-700">{formatDate(selectedTask.startDate)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-semibold text-rose-600 block">Timeline Limit</span>
                                            <span className="text-xs font-bold text-rose-600">{formatDate(selectedTask.endDate)}</span>
                                        </div>
                                    </div>

                                    {/* Action Workflow Button */}
                                    {/* Enforce Workflow State Boundaries */}
                                    {(() => {
                                        const isAssignedDev = selectedTask.assignedTo?._id === user?._id || selectedTask.assignedTo === user?._id;
                                        const isAssignedQA = selectedTask.assignedQA?._id === user?._id || selectedTask.assignedQA === user?._id;
                                        const isTL = project?.teamLead?._id === user?._id || project?.teamLead === user?._id;
                                        const eligibleForTransition = isAdmin || isTL || isAssignedDev || isAssignedQA;

                                        if (!eligibleForTransition) return null;

                                        return (
                                            <button
                                                onClick={() => {
                                                    setTransitionStatus("");
                                                    setTransitionNotes("");
                                                    setTransitionAttachments([]);
                                                    setIsTransitionModalOpen(true);
                                                }}
                                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition duration-300 shadow-md shadow-blue-200 cursor-pointer"
                                            >
                                                Transition Workflow State
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL 4: WORKFLOW STATE TRANSITION MODAL ───────────────────────── */}
            {isTransitionModalOpen && selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <form
                        onSubmit={handleSubmitTransition}
                        className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Transition State</h3>
                                <span className="text-[10px] font-semibold text-slate-400">Change sprint workflow status</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTransitionModalOpen(false)}
                                className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Current Status display */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50 flex justify-between text-xs">
                                <span className="font-bold text-slate-400 text-[10px]">Current State</span>
                                <span className="font-semibold text-slate-700">{selectedTask.status}</span>
                            </div>

                            {/* Select Status Dropdown (Check role bounds) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400">Select Target State *</label>
                                <select
                                    required
                                    value={transitionStatus}
                                    onChange={(e) => setTransitionStatus(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-600"
                                >
                                    <option value="">-- Choose Status --</option>
                                    
                                    {/* Developers can only transition to 'In Progress' or 'QA Review' */}
                                    {user.role === "developer" && (
                                        <>
                                            <option value="In Progress">In Progress</option>
                                            <option value="QA Review">QA Review</option>
                                        </>
                                    )}

                                    {/* QA reviewers can move back to 'In Progress' (Reject) or to 'Completed' (Approve) */}
                                    {user.role === "qa" && (
                                        <>
                                            <option value="Completed">Completed (Approve)</option>
                                            <option value="In Progress">In Progress (Reject Feedback)</option>
                                        </>
                                    )}

                                    {/* Admin & TL can shift to any state */}
                                    {(isAdmin || isProjectTL) && (
                                        <>
                                            <option value="New">New</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="QA Review">QA Review</option>
                                            <option value="Completed">Completed</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Transition Comment (Required if rejecting / adding details) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400">Transition Notes / QA Comments</label>
                                <textarea
                                    rows="3"
                                    value={transitionNotes}
                                    onChange={(e) => setTransitionNotes(e.target.value)}
                                    placeholder="Add feedback, unit testing reports, or deployment notes..."
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition font-semibold text-xs text-slate-700 resize-none"
                                ></textarea>
                            </div>

                            {/* Transition Multi-Files uploads */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-slate-400 block">Upload Files / Screenshots</label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleTaskFileUpload}
                                    className="hidden"
                                    id="task-transition-file-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => document.getElementById("task-transition-file-input")?.click()}
                                    disabled={uploadingTaskFiles}
                                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    {uploadingTaskFiles ? (
                                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Paperclip className="w-4 h-4" />
                                    )}
                                    {uploadingTaskFiles ? "Uploading Files..." : "Choose Files (+ Add)"}
                                </button>

                                {/* Previews list */}
                                {transitionAttachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1.5">
                                        {transitionAttachments.map((f, fIdx) => (
                                            <div key={fIdx} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-700 font-bold">
                                                <FileText className="w-3 h-3" />
                                                <span className="max-w-[120px] truncate">{f.filename}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setTransitionAttachments(prev => prev.filter((_, i) => i !== fIdx))}
                                                    className="p-0.5 hover:bg-indigo-100 rounded-full text-indigo-500 hover:text-indigo-700 transition"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsTransitionModalOpen(false)}
                                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-black border border-slate-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={uploadingTaskFiles || !transitionStatus}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-200 transition disabled:opacity-50"
                            >
                                Confirm Transition
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProjectDetails;
