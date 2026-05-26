import React, { useState, useEffect } from 'react';
import { taskService, userService, projectService } from '../../api/services';
import { toast } from 'sonner';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import KanbanBoard from '../../components/KanbanBoard';
import { Plus, Search, Filter, X, Calendar, Paperclip, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import usePermission from '../../hooks/usePermission';

const KanbanDashboard = () => {
    const { user } = useAuth();
    const { can } = usePermission();
    const role = user?.role || 'admin';
    const currentRole = role === 'TL' ? 'teamLead' : role;

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [newTask, setNewTask] = useState({ taskName: '', description: '', project: '', assignedTo: '', assignedQA: '', priority: 'Medium', startDate: new Date().toISOString().split('T')[0], endDate: '', attachments: [] });
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [projectMembers, setProjectMembers] = useState([]);

    const fetchInitialData = async () => {
        try {
            const [projRes, userRes] = await Promise.all([
                projectService.getAllProjects(),
                userService.getAllUsers()
            ]);
            setProjects(projRes.data.projects || []);
            setUsers(userRes.data.data || []);
        } catch (err) {
            console.error('Failed to load helper data', err);
        }
    };

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await taskService.getAllTasks();
            setTasks(res.data.tasks || []);
        } catch (error) {
            console.error('Failed to load tasks', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchInitialData();
        const interval = setInterval(fetchTasks, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!newTask.project) {
            setProjectMembers([]);
            return;
        }
        const selectedProj = projects.find(p => p._id === newTask.project);
        if (selectedProj && selectedProj.teamMembers) {
            setProjectMembers(selectedProj.teamMembers);
        } else {
            setProjectMembers([]);
        }
    }, [newTask.project, projects]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setSubmitted(true);

        if (!newTask.taskName || !newTask.project) {
            return;
        }

        try {
            setIsCreating(true);
            await taskService.createTask(newTask);
            toast.success('Task created successfully');
            setIsTaskModalOpen(false);
            setSubmitted(false);
            setNewTask({ taskName: '', description: '', project: '', assignedTo: '', assignedQA: '', priority: 'Medium', startDate: new Date().toISOString().split('T')[0], endDate: '', attachments: [] });
            fetchTasks();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create task');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role={currentRole} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="Kanban Board" role={currentRole} />

                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 shrink-0">
                        <div>
                            <h1 className="dashboard-heading">Workflow Management</h1>
                            <p className="dashboard-subheading">Drag tasks between columns to update status.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64 shadow-sm" />
                            </div>

                            {can('tasks.create') && (
                                <button onClick={() => setIsTaskModalOpen(true)}
                                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-200">
                                    <Plus className="w-4 h-4 mr-1.5" /> Add Task
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Kanban Board (shared component handles drag, modal, sidebar) */}
                    <KanbanBoard tasks={tasks} setTasks={setTasks} searchQuery={searchQuery} loading={loading} role={currentRole} />
                </main>

                <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar{width:4px;height:4px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8}` }} />
            </div>

            {/* Create Task Modal */}
            {can('tasks.create') && isTaskModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" />Create New Task</h2>
                            <button onClick={() => { setIsTaskModalOpen(false); setSubmitted(false); }} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateTask} noValidate className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-5 text-sm overflow-y-auto flex-1 custom-scrollbar">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">Task Title <span className="text-red-500">*</span></label>
                                    <input type="text" required value={newTask.taskName} onChange={e => setNewTask({ ...newTask, taskName: e.target.value })} placeholder="e.g. Design UI Mockups"
                                        className={`w-full px-4 py-2.5 bg-white border ${submitted && !newTask.taskName ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300`} />
                                    {submitted && !newTask.taskName && (
                                        <p className="text-red-500 text-[11px] font-semibold mt-1 animate-in fade-in slide-in-from-top-1">Task Title is required!</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">Description</label>
                                    <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Detailed task description..." rows="3"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Project <span className="text-red-500">*</span></label>
                                        <select required value={newTask.project} onChange={e => setNewTask({ ...newTask, project: e.target.value })}
                                            className={`w-full px-4 py-2.5 bg-white border ${submitted && !newTask.project ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium`}>
                                            <option value="">Select Project</option>
                                            {projects.map(p => <option key={p._id} value={p._id}>{p.projectName}</option>)}
                                        </select>
                                        {submitted && !newTask.project && (
                                            <p className="text-red-500 text-[11px] font-semibold mt-1 animate-in fade-in slide-in-from-top-1">Project is required!</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Assignee</label>
                                        <select value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium">
                                            <option value="">Unassigned</option>
                                            {projectMembers.filter(m => m.role === 'developer').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">Assigned QA</label>
                                        <select value={newTask.assignedQA} onChange={e => setNewTask({ ...newTask, assignedQA: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium">
                                            <option value="">Unassigned</option>
                                            {projectMembers.filter(m => m.role === 'qa').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                 <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5 text-xs">Priority</label>
                                        <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer text-slate-700 font-medium text-xs">
                                            {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5 text-xs">Start Date</label>
                                        <input type="date" value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-700 text-xs" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5 text-xs">Due Date</label>
                                        <input type="date" value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-700 text-xs" />
                                    </div>
                                </div>

                                {/* Attachments field */}
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                                        <Paperclip className="w-4 h-4 text-slate-400" />
                                        Attachments <span className="text-slate-400 font-normal text-xs">(optional)</span>
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        id="create-task-attachments-input"
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files);
                                            if (files.length === 0) return;
                                            toast.loading("Uploading attachment...");
                                            try {
                                                const uploadedList = [...(newTask.attachments || [])];
                                                for (let file of files) {
                                                    const formData = new FormData();
                                                    formData.append("file", file);
                                                    const res = await taskService.uploadAttachment(formData);
                                                    if (res.data.success) {
                                                        uploadedList.push(res.data.file);
                                                    }
                                                }
                                                setNewTask(prev => ({ ...prev, attachments: uploadedList }));
                                                toast.dismiss();
                                                toast.success("Attachment uploaded!");
                                            } catch (err) {
                                                toast.dismiss();
                                                toast.error("Failed to upload attachment");
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById("create-task-attachments-input")?.click()}
                                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 border-dashed rounded-xl text-xs font-bold text-slate-600 transition flex items-center justify-center gap-1.5 animate-in zoom-in-95 duration-100"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Files
                                    </button>

                                    {/* Uploaded previews */}
                                    {Array.isArray(newTask.attachments) && newTask.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {newTask.attachments.map((f, fIdx) => (
                                                <div key={fIdx} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-700 font-bold animate-in zoom-in-95 duration-100">
                                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="max-w-[120px] truncate">{f.filename}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewTask(prev => ({
                                                            ...prev,
                                                            attachments: prev.attachments.filter((_, i) => i !== fIdx)
                                                        }))}
                                                        className="p-0.5 hover:bg-emerald-100 rounded-full text-emerald-500 transition ml-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 flex items-center gap-3 bg-slate-50 shrink-0">
                                <button type="button" onClick={() => { setIsTaskModalOpen(false); setSubmitted(false); }}
                                    className="flex-1 justify-center px-5 py-2.5 text-slate-700 font-bold bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition shadow-sm">Cancel</button>
                                <button type="submit" disabled={isCreating}
                                    className="flex-1 justify-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50">
                                    {isCreating ? 'Creating...' : 'Create Task'}
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
