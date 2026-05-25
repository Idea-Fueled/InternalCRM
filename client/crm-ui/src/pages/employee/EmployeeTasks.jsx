import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { 
  Search, Filter, Calendar, Clock, AlertTriangle, 
  ChevronRight, X, PlayCircle, ShieldCheck, FileText,
  MessageSquare, Star, ArrowRightCircle, Activity,
  Paperclip, ExternalLink
} from 'lucide-react';

import { taskService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const STATUS_COLORS = {
  'New': 'bg-slate-100 text-slate-700 border-slate-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'QA Review': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Done': 'bg-emerald-500 text-white border-emerald-600',
};

const PRIORITY_COLORS = {
  'Low': 'bg-slate-100 text-slate-600',
  'Medium': 'bg-amber-100 text-amber-700',
  'High': 'bg-orange-100 text-orange-700',
  'Critical': 'bg-rose-100 text-rose-700'
};

const EmployeeTasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [selectedTask, setSelectedTask] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const fetchTasks = async () => {
        if (!user?._id) return;
        try {
            setLoading(true);
            const res = await taskService.getTasksByUser(user._id);
            const formattedTasks = (res.data.tasks || []).map(t => ({
                id: t._id,
                taskName: t.taskName,
                project: t.project?.projectName || "Unassigned",
                status: t.status || "New",
                startDate: (t.startDate || t.createdAt) ? new Date(t.startDate || t.createdAt).toLocaleDateString() : "N/A",
                endDate: t.endDate ? new Date(t.endDate).toLocaleDateString() : "N/A",
                priority: t.priority || "Medium",
                description: t.description || "",
                qaNotes: t.qaNotes || "",
                assignedTo: t.assignedTo,
                assignedQA: t.assignedQA,
                updates: (t.statusHistory || []).map(h => ({
                    id: h._id,
                    type: h.status === 'QA Review' ? 'qa' : 'status',
                    status: h.status,
                    notes: h.notes,
                    time: new Date(h.changedAt).toLocaleString(),
                    changedBy: h.changedBy,
                    attachments: h.attachments || [],
                    screenshotLinks: h.screenshotLinks || [],
                    attachment: h.attachment || ""
                })).reverse()
            }));
            setTasks(formattedTasks);
        } catch (err) {
            console.error("Failed to load tasks", err);
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [user]);

    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedTask(null), 300); // Wait for transition
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!selectedTask) return;
        
        // Prevent moving past QA Review
        if (newStatus === 'Completed') return;

        try {
            await taskService.updateTaskStatus(selectedTask.id, newStatus);
            const updatedTasks = tasks.map(t => 
                t.id === selectedTask.id ? { ...t, status: newStatus } : t
            );
            setTasks(updatedTasks);
            setSelectedTask({ ...selectedTask, status: newStatus });
            toast.success(`Task moved to ${newStatus}`);
        } catch (err) {
            console.error("Failed to update status", err);
            toast.error("Failed to update status");
        }
    };

    const isOverdue = (endDate) => new Date(endDate) < new Date();

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              task.project?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
    });

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="employee" />

            <div className="flex-1 flex flex-col h-screen relative overflow-hidden">
                <Topbar DashboardTile="My Tasks" role="employee" />
                
                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <div>
                        <h1 className="dashboard-heading">Assigned Tasks</h1>
                        <p className="dashboard-subheading">Manage and track the progress of all your active assignments.</p>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text" 
                                placeholder="Search tasks or projects..." 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="relative">
                                <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <select 
                                    className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="New">New</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="QA Review">QA Review</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            <div className="relative">
                                <Star className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <select 
                                    className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                >
                                    <option value="All">All Priorities</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-3">
                        {filteredTasks.length > 0 ? filteredTasks.map(task => {
                            const taskOverdue = isOverdue(task.endDate);
                            
                            return (
                                <div 
                                    key={task.id} 
                                    onClick={() => handleTaskClick(task)}
                                    className={`bg-white p-5 rounded-xl border ${taskOverdue ? 'border-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.1)]' : 'border-slate-200 shadow-sm hover:shadow-md'} transition-all cursor-pointer group hover:-translate-y-0.5 flex flex-col md:flex-row md:items-center justify-between gap-4`}
                                >
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                                                {task.project}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${STATUS_COLORS[task.status]}`}>
                                                {task.status}
                                            </span>
                                            {taskOverdue && (
                                                <span className="flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                                                    <AlertTriangle className="w-3 h-3 mr-1" /> OVERDUE
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {task.taskName}
                                        </h3>
                                    </div>
                                    
                                    <div className="flex items-center gap-6 md:w-1/3 justify-between md:justify-end">
                                        <div className="flex flex-col items-start md:items-end">
                                            <div className="flex items-center text-xs text-slate-500 font-medium">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                                Due: <span className={taskOverdue ? 'text-rose-600 font-bold ml-1' : 'ml-1 text-slate-700'}>{task.endDate}</span>
                                            </div>
                                            <span className={`mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${PRIORITY_COLORS[task.priority]}`}>
                                                {task.priority} Priority
                                            </span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                                <FileText className="w-12 h-12 text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">No tasks found</h3>
                                <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters.</p>
                            </div>
                        )}
                    </div>
                </main>
                
                {/* Overlay for Drawer */}
                {isDrawerOpen && (
                    <div 
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" 
                        onClick={handleCloseDrawer}
                    ></div>
                )}

                {/* Task Detail Drawer */}
                <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    {selectedTask && (
                        <>
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
                                    <FileText className="w-4 h-4 mr-2" /> Task Details
                                </h2>
                                <button 
                                    onClick={handleCloseDrawer}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                            {selectedTask.project}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded border ${PRIORITY_COLORS[selectedTask.priority]}`}>
                                            {selectedTask.priority} Priority
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-4">{selectedTask.taskName}</h3>
                                    
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</span>
                                            <div className={`flex items-center ${isOverdue(selectedTask.endDate) ? 'text-rose-600 font-bold' : 'text-slate-700'} text-base`}>
                                                <Calendar className="w-4 h-4 mr-2" />
                                                <span>{selectedTask.endDate}</span>
                                            </div>
                                        </div>
                                        {isOverdue(selectedTask.endDate) && (
                                            <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded uppercase">Overdue</span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Employee</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                                                    {selectedTask.assignedTo?.profilePic ? (
                                                        <img src={selectedTask.assignedTo.profilePic} alt={selectedTask.assignedTo.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        selectedTask.assignedTo?.name?.charAt(0) || "U"
                                                    )}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 truncate">{selectedTask.assignedTo?.name || "Unassigned"}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">QA Reviewer</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                                                    {selectedTask.assignedQA?.profilePic ? (
                                                        <img src={selectedTask.assignedQA.profilePic} alt={selectedTask.assignedQA.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        selectedTask.assignedQA?.name?.charAt(0) || "Q"
                                                    )}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 truncate">{selectedTask.assignedQA?.name || "Not Assigned"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            {selectedTask.description}
                                        </p>
                                    </div>

                                    {selectedTask.qaNotes && (
                                        <div>
                                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center">
                                                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> QA Notes
                                            </h4>
                                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800 leading-relaxed">
                                                {selectedTask.qaNotes}
                                            </div>
                                        </div>
                                    )}

                                    {/* Task Updates Section */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Task Updates</h4>
                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {selectedTask.updates?.map(update => (
                                                <div key={update.id} className="flex gap-3">
                                                    <div className="mt-1 shrink-0">
                                                        {update.status === 'QA Review' ? (
                                                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                                        ) : (
                                                            <Activity className="w-4 h-4 text-blue-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-bold text-slate-700">{update.status}</p>
                                                            {!update.notes && <p className="text-sm text-slate-400 font-medium">— No notes</p>}
                                                            <span className="text-[10px] font-bold text-blue-500 ml-auto bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">by {update.changedBy?.name || 'System'}</span>
                                                        </div>
                                                        {update.notes && (
                                                            <div className={`mt-1.5 p-3 rounded-xl text-sm leading-relaxed ${
                                                                update.status === 'In Progress' 
                                                                ? 'bg-blue-50 border border-blue-100 text-blue-700 shadow-sm shadow-blue-50/50' 
                                                                : 'bg-slate-50 border border-slate-100 text-slate-600'
                                                            }`}>
                                                                {update.notes}
                                                            </div>
                                                        )}
                                                        {((update.attachments && update.attachments.length > 0) || (update.screenshotLinks && update.screenshotLinks.length > 0)) && (
                                                            <div className="mt-2.5 space-y-2 border-t border-slate-100/50 pt-2.5">
                                                                {update.attachments && update.attachments.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {update.attachments.map((file, idx) => (
                                                                            <a
                                                                                key={idx}
                                                                                href={file.url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-sm"
                                                                                title="View / Download"
                                                                            >
                                                                                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                                                                <span className="truncate max-w-[150px]">{file.filename}</span>
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {update.screenshotLinks && update.screenshotLinks.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {update.screenshotLinks.map((url, idx) => {
                                                                            const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
                                                                            return (
                                                                                <a
                                                                                    key={idx}
                                                                                    href={cleanUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/30 rounded-lg text-xs font-semibold text-indigo-700 transition-colors shadow-sm"
                                                                                    title="Open External Link"
                                                                                >
                                                                                    <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                                                                                    <span className="truncate max-w-[180px]">{url}</span>
                                                                                </a>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">{update.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!selectedTask.updates || selectedTask.updates.length === 0) && (
                                                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">No updates recorded yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Drawer Footer - Status Controls */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50/80">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Update Status</h4>
                                
                                {['QA Review', 'Completed', 'Done'].includes(selectedTask.status) ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                        <div className="flex items-center justify-center text-amber-600 mb-1">
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            <span className="text-xs font-bold uppercase tracking-wide">Status Locked</span>
                                        </div>
                                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                            This task is currently in <span className="font-bold underline">{selectedTask.status}</span>. 
                                            Only Admins or Team Leads can move it back to In Progress.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between p-1 bg-slate-200/50 rounded-xl">
                                            <button 
                                                onClick={() => handleStatusUpdate('New')}
                                                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedTask.status === 'New' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                New
                                            </button>
                                            <button 
                                                onClick={() => handleStatusUpdate('In Progress')}
                                                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedTask.status === 'In Progress' ? 'bg-blue-500 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                In Progress
                                            </button>
                                            <button 
                                                onClick={() => handleStatusUpdate('QA Review')}
                                                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedTask.status === 'QA Review' ? 'bg-indigo-500 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                QA Review
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-center text-slate-400 mt-3 font-medium uppercase tracking-tight">
                                            Tasks cannot be moved beyond QA Review by Employees.
                                        </p>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />
        </div>
    );
};

export default EmployeeTasks;
