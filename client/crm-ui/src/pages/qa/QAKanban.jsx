import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { taskService } from '../../api/services';
import { 
  Search, Filter, Calendar, MoreVertical, Paperclip, MessageSquare, 
  Clock, X, CheckCircle2, PlayCircle, ShieldCheck, FileText, Send, AlertTriangle, Plus, XCircle
} from 'lucide-react';

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

const QAKanban = () => {
    const [tasks, setTasks] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await taskService.getAllTasks();
            if (response.data.success) {
                setTasks(response.data.tasks);
            }
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const filteredTasks = tasks.filter(task => 
        task.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        task.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isOverdue = (endDate) => endDate ? new Date(endDate) < new Date() : false;

    // Quick Actions
    const handleApprove = async (taskId) => {
        try {
            await taskService.updateTaskStatus(taskId, "Completed");
            setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'Completed' } : t));
            if (selectedTask?._id === taskId) {
                setSelectedTask({ ...selectedTask, status: 'Completed' });
            }
        } catch (error) {
            console.error("Failed to approve", error);
        }
    };

    const handleReject = async (taskId) => {
        try {
            await taskService.updateTaskStatus(taskId, "In Progress");
            setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'In Progress' } : t));
            if (selectedTask?._id === taskId) {
                setSelectedTask({ ...selectedTask, status: 'In Progress' });
            }
        } catch (error) {
            console.error("Failed to reject", error);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="qa" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="QA Kanban" role="qa" />
                
                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Validation Board</h1>
                            <p className="text-sm text-slate-500 mt-1">Manage task flow and validate features across all stages.</p>
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
                        </div>
                    </div>

                    {/* Kanban Board Area */}
                    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                        <div className="flex gap-6 h-full min-w-max px-1">
                            {COLUMNS.map(col => {
                                const colTasks = filteredTasks.filter(t => t.status === col.id);

                                return (
                                    <div 
                                        key={col.id} 
                                        className={`w-80 flex flex-col h-full rounded-2xl transition-all duration-200 ${col.color} border border-slate-200/60`}
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
                                        </div>

                                        {/* Tasks List */}
                                        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 custom-scrollbar">
                                            {loading ? (
                                                <div className="text-center text-sm text-slate-400 mt-4">Loading...</div>
                                            ) : colTasks.map(task => {
                                                const taskOverdue = isOverdue(task.endDate);
                                                
                                                return (
                                                    <div 
                                                        key={task._id}
                                                        onClick={() => setSelectedTask(task)}
                                                        className={`bg-white p-4 rounded-xl shadow-sm border ${taskOverdue ? 'border-rose-200' : 'border-slate-200'} cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2.5">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                {task.project?.name || "No Project"}
                                                            </span>
                                                            <div className="flex gap-1.5">
                                                                {taskOverdue && (
                                                                    <span className="text-[10px] font-bold px-1.5 py-1 rounded-md bg-rose-100 text-rose-600 flex items-center" title="Overdue">
                                                                        <AlertTriangle className="w-3 h-3" />
                                                                    </span>
                                                                )}
                                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium']}`}>
                                                                    {task.priority || "Medium"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors leading-snug">
                                                            {task.taskName}
                                                        </h4>
                                                        
                                                        <div className="flex items-center text-xs text-slate-500 mb-4 mt-2 font-medium">
                                                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                            <span className={taskOverdue ? 'text-rose-600 font-bold' : ''}>{task.endDate ? new Date(task.endDate).toLocaleDateString() : "N/A"}</span>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold uppercase shadow-sm" title={task.assignedTo?.name || "Unassigned"}>
                                                                    {task.assignedTo?.name?.substring(0,2) || "U"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {!loading && colTasks.length === 0 && (
                                                <div className="h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-sm font-medium transition-colors border-slate-200/50 text-slate-400">
                                                    No tasks
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>

                {/* Task Details Drawer */}
                {selectedTask && (
                    <div className="absolute inset-0 z-50 flex justify-end">
                        <div 
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setSelectedTask(null)}
                        />
                        <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
                            
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${PRIORITY_COLORS[selectedTask.priority]}`}>
                                        {selectedTask.priority} Priority
                                    </span>
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                        {selectedTask.project?.name || "No Project"}
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
                                    {selectedTask.title}
                                </h2>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                        <select 
                                            value={selectedTask.status}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value;
                                                try {
                                                    await taskService.updateTaskStatus(selectedTask._id, newStatus);
                                                    setTasks(prev => prev.map(t => t._id === selectedTask._id ? { ...t, status: newStatus } : t));
                                                    setSelectedTask({ ...selectedTask, status: newStatus });
                                                } catch (error) {
                                                    console.error("Failed to update status", error);
                                                }
                                            }}
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
                                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold uppercase">
                                                {selectedTask.assignedTo?.name?.substring(0,2) || "U"}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{selectedTask.assignedTo?.name || "Unassigned"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                                        <span className={`text-sm font-bold ${isOverdue(selectedTask.endDate) ? 'text-rose-600' : 'text-slate-700'}`}>{selectedTask.endDate ? new Date(selectedTask.endDate).toLocaleDateString() : "N/A"}</span>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-slate-400" />
                                        Task Description
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        {selectedTask.description}
                                    </p>
                                </div>

                                {selectedTask.developerNotes && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center">
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Developer Notes
                                        </h3>
                                        <p className="text-sm text-blue-800 leading-relaxed p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                            {selectedTask.developerNotes}
                                        </p>
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                                        <Paperclip className="w-4 h-4 mr-2 text-slate-400" />
                                        Attachments ({selectedTask.attachments.length})
                                    </h3>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm text-slate-400 italic">Attachments handling from backend pending.</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-indigo-600 mb-3 flex items-center">
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        QA Notes
                                    </h3>
                                    <textarea 
                                        placeholder="Add your findings, approval reasoning, or rejection issues here..."
                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[120px] resize-none"
                                        defaultValue={selectedTask.qaNotes}
                                        onChange={(e) => {
                                            const newNotes = e.target.value;
                                            setTasks(prev => prev.map(t => t._id === selectedTask._id ? { ...t, qaNotes: newNotes } : t));
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
                                <button 
                                    onClick={() => handleReject(selectedTask._id)}
                                    className="flex-1 flex items-center justify-center px-5 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-bold rounded-xl transition-colors shadow-sm"
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject to In Progress
                                </button>
                                <button 
                                    onClick={() => handleApprove(selectedTask._id)}
                                    className="flex-1 flex items-center justify-center px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-emerald-200"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Approve to Completed
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
        </div>
    );
};

export default QAKanban;
