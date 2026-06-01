import React, { useState, useEffect } from "react";
import { 
    X, Mail, Phone, Shield, Calendar, Briefcase, User, 
    Folder, CheckCircle, Clock, AlertTriangle, Layers,
    Activity, ClipboardList
} from "lucide-react";
import { projectService, taskService } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function EmployeeDetailsSidebar({ isOpen, employee, onClose }) {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [activeSection, setActiveSection] = useState("overview"); // "overview" | "projects" | "tasks"

    const empRaw = employee?.raw || employee;
    const { user: currentUser } = useAuth();

    useEffect(() => {
        if (isOpen && empRaw?._id) {
            setActiveSection("overview");
            fetchInvolvementData();
        }
    }, [isOpen, empRaw?._id]);

    const fetchInvolvementData = async () => {
        if (!empRaw?._id) return;

        // Fetch Projects
        try {
            setLoadingProjects(true);
            const res = await projectService.getAllProjects();
            if (res.data?.success && Array.isArray(res.data.projects)) {
                // Filter projects where employee is Team Lead or a Team Member
                const empId = empRaw._id.toString();
                const filtered = res.data.projects.filter(p => {
                    const isLead = p.teamLead?._id?.toString() === empId || p.teamLead?.toString() === empId;
                    const isMember = p.teamMembers?.some(m => m._id?.toString() === empId || m.toString() === empId);
                    return isLead || isMember;
                });
                setProjects(filtered);
            }
        } catch (err) {
            console.error("Failed to load employee projects:", err);
            toast.error("Failed to retrieve assigned projects.");
        } finally {
            setLoadingProjects(false);
        }

        // Fetch Tasks
        try {
            setLoadingTasks(true);
            const res = await taskService.getTasksByUser(empRaw._id);
            if (res.data?.success && Array.isArray(res.data.data)) {
                setTasks(res.data.data);
            } else if (Array.isArray(res.data)) {
                setTasks(res.data);
            }
        } catch (err) {
            console.error("Failed to load employee tasks:", err);
            toast.error("Failed to retrieve active tasks.");
        } finally {
            setLoadingTasks(false);
        }
    };

    if (!isOpen || !empRaw) return null;

    const initials = empRaw.name?.charAt(0).toUpperCase() || "U";
    const viewedIsAdmin = empRaw.role?.toLowerCase() === 'admin';
    const loggedInIsAdmin = currentUser?.role?.toLowerCase() === 'admin';

    const statusColor = empRaw.status === "Inactive" 
        ? "bg-slate-100 text-slate-650 border-slate-200" 
        : "bg-emerald-50 text-emerald-700 border-emerald-100";

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case "admin": return "bg-purple-50 text-purple-700 border-purple-100";
            case "tl":
            case "teamlead": return "bg-blue-50 text-blue-700 border-blue-100";
            case "hr": return "bg-pink-50 text-pink-700 border-pink-100";
            case "qa": return "bg-amber-50 text-amber-700 border-amber-100";
            default: return "bg-indigo-50 text-indigo-700 border-indigo-100";
        }
    };

    const getTaskStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "in progress": return "bg-blue-50 text-blue-700 border-blue-100";
            case "testing": return "bg-amber-50 text-amber-700 border-amber-100";
            case "todo": return "bg-slate-100 text-slate-600 border-slate-200";
            default: return "bg-slate-100 text-slate-600 border-slate-200";
        }
    };

    const getInactivityDaysLeft = (inactiveUntil) => {
        if (!inactiveUntil) return "Indefinite";
        const diffTime = new Date(inactiveUntil) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? `${diffDays} days remaining` : "Reactivating...";
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sliding Panel */}
            <div className="relative w-full max-w-lg bg-slate-50 shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out border-l border-slate-100 animate-in slide-in-from-right duration-250">
                {/* Header */}
                <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-650" />
                        <h2 className="text-base font-black text-slate-800 tracking-tight">Employee Profile</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Profile Card Summary */}
                <div className="p-6 bg-white border-b border-slate-100 shrink-0">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl font-black text-slate-600 overflow-hidden shrink-0 shadow-sm">
                            {empRaw.profilePic ? (
                                <img src={empRaw.profilePic} alt="" className="w-full h-full object-cover" />
                            ) : initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-slate-800 leading-none truncate">{empRaw.name}</h3>
                                {!(viewedIsAdmin && !loggedInIsAdmin) && (
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full ${statusColor}`}>
                                        {empRaw.status || "Active"}
                                    </span>
                                )}
                            </div>
                            {!viewedIsAdmin && (
                            <p className="text-xs font-bold text-slate-500 mt-1.5 flex items-center gap-1.5">
                                <span className="text-slate-800">{empRaw.designation || "Developer"}</span>
                                <span className="text-slate-300">•</span>
                                <span>{empRaw.department?.name || empRaw.department || "No Department"}</span>
                            </p>
                            )}
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                                 <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-lg ${getRoleBadgeColor(empRaw.role)}`}>
                                     {empRaw.designation || (empRaw.role === "TL" ? "Team Lead" : (empRaw.role === "qa" || empRaw.role === "QA" ? "QA" : (empRaw.role === "admin" ? "Admin" : (empRaw.role === "developer" ? "Employee" : (empRaw.role?.charAt(0).toUpperCase() + empRaw.role?.slice(1)) || "Employee"))))}
                                 </span>
                                {empRaw.status === "Inactive" && empRaw.inactiveReason && (
                                    <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg truncate max-w-xs" title={empRaw.inactiveReason}>
                                        Reason: {empRaw.inactiveReason}
                                    </span>
                                )}
                                {/* Hide availability/status pill for admin profiles when the logged-in user is not an admin */}
                                {!(viewedIsAdmin && !loggedInIsAdmin) && (
                                    <></>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 bg-white px-6 shrink-0">
                    {[
                        { id: "overview", label: "Overview", icon: <User className="w-4 h-4" /> },
                        ...(!viewedIsAdmin ? [
                            { id: "projects", label: `Projects (${projects.length})`, icon: <Folder className="w-4 h-4" /> },
                            { id: "tasks", label: `Tasks (${tasks.length})`, icon: <ClipboardList className="w-4 h-4" /> }
                        ] : [])
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold transition-all relative border-b-2 -mb-px cursor-pointer ${
                                activeSection === tab.id
                                    ? "border-blue-600 text-blue-650 font-extrabold"
                                    : "border-transparent text-slate-450 hover:text-slate-700"
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
                    {/* If viewing an admin profile as a non-admin, show only contact info */}
                    {viewedIsAdmin && !loggedInIsAdmin ? (
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Contact Details</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold block">Email Address</span>
                                    <a href={`mailto:${empRaw.email}`} className="text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 truncate">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        {empRaw.email}
                                    </a>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold block">Phone Number</span>
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        {empRaw.phone || "Not provided"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : activeSection === "overview" ? (
                        <>
                            {/* Contact Details */}
                            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Contact Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-slate-400 font-bold block">Email Address</span>
                                        <a href={`mailto:${empRaw.email}`} className="text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 truncate">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            {empRaw.email}
                                        </a>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-slate-400 font-bold block">Phone Number</span>
                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            {empRaw.phone || "Not provided"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Reporting Structure (hidden for admins) */}
                            {!viewedIsAdmin && (
                            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Reporting Structure</h4>
                                <div className="space-y-3">
                                    {empRaw.reportingManagers && empRaw.reportingManagers.length > 0 ? (
                                        empRaw.reportingManagers.map((mgr, idx) => (
                                            <div key={mgr._id || idx} className="flex items-center gap-3 p-2 bg-slate-50/60 border border-slate-100 rounded-xl">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-xs font-black">
                                                    {mgr.profilePic ? (
                                                        <img src={mgr.profilePic} alt="" className="w-full h-full object-cover rounded-lg" />
                                                    ) : (mgr.name?.charAt(0) || "M")}
                                                </div>
                                                <div className="min-w-0">
                                                     <p className="text-xs font-black text-slate-800 leading-none">{mgr.name}</p>
                                                     <p className="text-[10px] font-semibold text-slate-450 mt-1">{mgr.designation || (mgr.role === "TL" ? "Team Lead" : (mgr.role === "qa" || mgr.role === "QA" ? "QA" : (mgr.role === "admin" ? "Admin" : (mgr.role?.charAt(0).toUpperCase() + mgr.role?.slice(1)) || "Reporting Manager")))}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : empRaw.reportingManager ? (
                                        <div className="flex items-center gap-3 p-2 bg-slate-50/60 border border-slate-100 rounded-xl">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-xs font-black">
                                                {empRaw.reportingManager.name?.charAt(0) || "M"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-800 leading-none">{empRaw.reportingManager.name || empRaw.reportingManager}</p>
                                                <p className="text-[10px] font-semibold text-slate-455 mt-1">Reporting Manager</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs font-bold text-slate-400 italic">No reporting manager assigned.</p>
                                    )}
                                </div>
                            </div>
                            )}

                            {/* Inactivity Schedule Detail */}
                            {empRaw.status === "Inactive" && (
                                <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-5 shadow-sm space-y-3">
                                    <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        Inactivity Period Settings
                                    </div>
                                    <div className="text-xs font-medium text-rose-600 leading-relaxed">
                                        <span className="font-bold">Scheduled reactivate: </span> 
                                        {getInactivityDaysLeft(empRaw.inactiveUntil)}
                                        {empRaw.inactiveUntil && ` (until ${new Date(empRaw.inactiveUntil).toLocaleDateString()})`}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}

                    {activeSection === "projects" && (
                        <div className="space-y-4">
                            {loadingProjects ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[11px] text-slate-450 font-bold">Querying assigned projects...</span>
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="text-center py-16 bg-white border border-slate-200/60 rounded-[24px] p-6 shadow-sm">
                                    <Folder className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <h5 className="text-xs font-bold text-slate-500">No projects assigned</h5>
                                    <p className="text-slate-450 text-[10px] mt-1">This employee is not currently assigned to any active projects.</p>
                                </div>
                            ) : (
                                projects.map(proj => {
                                    const isLead = proj.teamLead?._id?.toString() === empRaw._id.toString() || proj.teamLead?.toString() === empRaw._id.toString();
                                    return (
                                        <div key={proj._id} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col gap-2.5">
                                            <div className="flex justify-between items-start gap-2">
                                                <h5 className="text-xs font-black text-slate-800 truncate">{proj.projectName}</h5>
                                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                                                    isLead 
                                                        ? "bg-blue-50 text-blue-700 border-blue-100" 
                                                        : "bg-slate-50 text-slate-500 border-slate-200"
                                                }`}>
                                                    {isLead ? "Team Lead" : "Member"}
                                                </span>
                                            </div>
                                            {proj.description && (
                                                <p className="text-[10px] text-slate-450 font-medium line-clamp-2 leading-relaxed">{proj.description}</p>
                                            )}
                                            {proj.techStack && proj.techStack.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {proj.techStack.map((tech, tIdx) => (
                                                        <span key={tIdx} className="text-[8px] font-black text-slate-550 bg-slate-50 px-1.5 py-0.5 rounded">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeSection === "tasks" && (
                        <div className="space-y-4">
                            {loadingTasks ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[11px] text-slate-450 font-bold">Querying task backlog...</span>
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-16 bg-white border border-slate-200/60 rounded-[24px] p-6 shadow-sm">
                                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <h5 className="text-xs font-bold text-slate-500">No tasks assigned</h5>
                                    <p className="text-slate-450 text-[10px] mt-1">This employee has no active tasks in their backlog.</p>
                                </div>
                            ) : (
                                tasks.map(task => (
                                    <div key={task._id} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <h5 className="text-xs font-black text-slate-800 leading-snug">{task.title}</h5>
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${getTaskStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Layers className="w-3 h-3 shrink-0" />
                                                {task.project?.projectName || "Direct Task"}
                                            </span>
                                            {task.priority && (
                                                <span className={`font-black tracking-wider uppercase ${
                                                    task.priority === "High" ? "text-rose-600" :
                                                    task.priority === "Medium" ? "text-amber-600" :
                                                    "text-slate-400"
                                                }`}>
                                                    {task.priority} Priority
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
