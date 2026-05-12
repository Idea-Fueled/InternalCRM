import React, { useState, useEffect } from 'react';
import { taskService, userService, projectService } from '../../api/services';
import { toast } from 'sonner';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { 
  Plus, Search, Filter, Calendar, MoreVertical, Paperclip, MessageSquare, 
  Clock, X, CheckCircle2, AlertCircle, PlayCircle, ShieldCheck, FileText, Send
} from 'lucide-react';

const initialTasks = [];

const COLUMNS = [
    { id: 'New', title: 'New', color: 'bg-slate-100', dot: 'bg-slate-400', icon: Clock },
    { id: 'In Progress', title: 'In Progress', color: 'bg-blue-50', dot: 'bg-blue-500', icon: PlayCircle },
    { id: 'QA Review', title: 'QA Review', color: 'bg-indigo-50', dot: 'bg-indigo-500', icon: ShieldCheck },
    { id: 'Completed', title: 'Completed', color: 'bg-emerald-50', dot: 'bg-emerald-500', icon: CheckCircle2 },
    { id: 'Done', title: 'Done', color: 'bg-slate-100', dot: 'bg-slate-800', icon: CheckCircle2 }
];

const PRIORITY_COLORS = {
    'Low': 'bg-slate-100 text-slate-600',
    'Medium': 'bg-blue-100 text-blue-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-rose-100 text-rose-700',
};

const KanbanDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newTask, setNewTask] = useState({
        taskName: "",
        description: "",
        project: "",
        assignedTo: "",
        priority: "Medium",
        endDate: ""
    });
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);

    const fetchInitialData = async () => {
        try {
            const [projRes, userRes] = await Promise.all([
                projectService.getAllProjects(),
                userService.getAllUsers()
            ]);
            setProjects(projRes.data.projects || []);
            setUsers(userRes.data.data || []);
        } catch (err) {
            console.error("Failed to load helper data", err);
        }
    };

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await taskService.getAllTasks();
            const formattedTasks = (res.data.tasks || []).map(t => ({
                id: t._id,
                taskName: t.taskName,
                project: t.project?.projectName || "Unassigned",
                projectId: t.project?._id,
                assignee: t.assignedTo?.name || "Unassigned",
                assigneeId: t.assignedTo?._id,
                assigneeInitial: t.assignedTo?.name?.charAt(0).toUpperCase() || "U",
                startDate: t.startDate ? new Date(t.startDate).toLocaleDateString() : "N/A",
                endDate: t.endDate ? new Date(t.endDate).toLocaleDateString() : "N/A",
                priority: t.priority || "Medium",
                status: t.status || "New",
                description: t.description || "",
                comments: [], 
                attachments: t.attachments || [],
                rawTask: t
            }));
            setTasks(formattedTasks);
        } catch (error) {
            console.error("Failed to load tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchInitialData();
    }, []);

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await taskService.updateTask(taskId, { status: newStatus });
            toast.success("Status updated");
            fetchTasks();
            if (selectedTask && selectedTask.id === taskId) {
                setSelectedTask({...selectedTask, status: newStatus});
            }
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            await taskService.createTask(newTask);
            toast.success("Task created successfully");
            setIsTaskModalOpen(false);
            setNewTask({
                taskName: "",
                description: "",
                project: "",
                assignedTo: "",
                priority: "Medium",
                endDate: ""
            });
            fetchTasks();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create task");
        } finally {
            setIsCreating(false);
        }
    };

    const filteredTasks = tasks.filter(task => 
        task.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        task.project?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="admin" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="Kanban Board" role="admin" />
                
                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workflow Management</h1>
                            <p className="text-sm text-slate-500 mt-1">Track and manage task progress across your team.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search tasks..." 
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64 shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="flex items-center justify-center px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                Filters
                            </button>
                            <button onClick={() => setIsTaskModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-200">
                                <Plus className="w-4 h-4 mr-1.5" />
                                Add Task
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                        {/* Kanban Board Area */}
                        <div className="flex gap-6 h-full min-w-max px-1">
                            {COLUMNS.map(col => {
                                const colTasks = filteredTasks.filter(t => t.status === col.id);

                                return (
                                    <div 
                                        key={col.id} 
                                        className={`w-80 flex flex-col h-full rounded-2xl transition-colors duration-200 ${col.color} border border-slate-200/60`}
                                    >
                                        {/* Column Header */}
                                        <div className="p-4 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                                                <h3 className="font-bold text-slate-700">{col.title}</h3>
                                                <span className="bg-white/60 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full ml-1 border border-slate-200/50">
                                                    {colTasks.length}
                                                </span>
                                            </div>
                                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Tasks List */}
                                        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 custom-scrollbar">
                                            {colTasks.map(task => (
                                                <div 
                                                    key={task.id}
                                                    onClick={() => setSelectedTask(task)}
                                                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                                                >
                                                    <div className="flex justify-between items-start mb-2.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                            {task.project}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${PRIORITY_COLORS[task.priority]}`}>
                                                            {task.priority}
                                                        </span>
                                                    </div>
                                                    
                                                    <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors leading-snug">
                                                        {task.taskName}
                                                    </h4>
                                                    
                                                    <div className="flex items-center text-xs text-slate-500 mb-4 mt-2 font-medium">
                                                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                        {task.endDate}
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold shadow-sm" title={task.assignee}>
                                                                {task.assigneeInitial}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-slate-400">
                                                            {task.attachments.length > 0 && (
                                                                <div className="flex items-center text-xs font-medium gap-1">
                                                                    <Paperclip className="w-3.5 h-3.5" />
                                                                    <span>{task.attachments.length}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {colTasks.length === 0 && (
                                                <div className="h-24 border-2 border-dashed border-slate-200/50 rounded-xl flex items-center justify-center text-sm font-medium text-slate-400">
                                                    No tasks
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    )}
                </main>

                {/* Task Details Drawer */}
                {selectedTask && (
                    <div className="absolute inset-0 z-50 flex justify-end">
                        <div 
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setSelectedTask(null)}
                        />
                        <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300">
                            
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${PRIORITY_COLORS[selectedTask.priority]}`}>
                                        {selectedTask.priority} Priority
                                    </span>
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                        {selectedTask.project}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setSelectedTask(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
                                    {selectedTask.taskName}
                                </h2>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                        <select 
                                            value={selectedTask.status}
                                            onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                                            className="w-full bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                                        >
                                            {COLUMNS.map(col => (
                                                <option key={col.id} value={col.id}>{col.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assignee</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold">
                                                {selectedTask.assigneeInitial}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{selectedTask.assignee}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date</p>
                                        <span className="text-sm font-bold text-slate-700">{selectedTask.startDate}</span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                                        <span className="text-sm font-bold text-rose-600">{selectedTask.endDate}</span>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-slate-400" />
                                        Description
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {selectedTask.description}
                                    </p>
                                </div>

                                {selectedTask.attachments.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                                            <Paperclip className="w-4 h-4 mr-2 text-slate-400" />
                                            Attachments ({selectedTask.attachments.length})
                                        </h3>
                                        <div className="flex flex-col gap-2">
                                            {selectedTask.attachments.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{file.name}</p>
                                                            <p className="text-xs text-slate-400">{file.size}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <button className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors">
                                    Delete Task
                                </button>
                                <button onClick={() => setSelectedTask(null)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                                    Close
                                </button>
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

            {/* Create Task Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <div className="text-blue-600 relative flex items-center justify-center">
                                    <Plus className="w-5 h-5" />
                                </div>
                                Create New Task
                            </h2>
                            <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-5 text-sm overflow-y-auto flex-1 custom-scrollbar">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">Task Title <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newTask.taskName}
                                        onChange={(e) => setNewTask({...newTask, taskName: e.target.value})}
                                        placeholder="e.g. Design UI Mockups" 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300" 
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">Description</label>
                                    <textarea 
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                        placeholder="Detailed task description..." 
                                        rows="3" 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none"
                                    ></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Project <span className="text-red-500">*</span></label>
                                        <select 
                                            required
                                            value={newTask.project}
                                            onChange={(e) => setNewTask({...newTask, project: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium"
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{p.projectName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Assignee</label>
                                        <select 
                                            value={newTask.assignedTo}
                                            onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium"
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(u => (
                                                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Priority</label>
                                        <select 
                                            value={newTask.priority}
                                            onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Due Date</label>
                                        <input 
                                            type="date" 
                                            value={newTask.endDate}
                                            onChange={(e) => setNewTask({...newTask, endDate: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-700" 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 flex items-center gap-3 bg-slate-50 shrink-0">
                                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 justify-center px-5 py-2.5 text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition shadow-sm">
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 justify-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {isCreating ? "Creating..." : "Create Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanbanDashboard;
