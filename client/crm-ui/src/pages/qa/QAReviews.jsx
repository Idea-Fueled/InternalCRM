import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import { taskService } from '../../api/services';
import { 
  Search, Filter, Calendar, Paperclip, MessageSquare, 
  X, ShieldCheck, FileText, CheckCircle2, XCircle, AlertTriangle, Clock
} from 'lucide-react';

const PRIORITY_COLORS = {
    'Low': 'bg-slate-100 text-slate-600',
    'Medium': 'bg-blue-100 text-blue-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-rose-100 text-rose-700',
};

const QAReviews = () => {
    const [tasks, setTasks] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTask, setSelectedTask] = useState(null);
    const [rejectionError, setRejectionError] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await taskService.getAllTasks();
            if (response.data.success) {
                setTasks(response.data.tasks.filter(t => t.status === "QA Review"));
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

    const handleApprove = async (taskId, e) => {
        if (e) e.stopPropagation();
        try {
            await taskService.updateTaskStatus(taskId, 'Completed');
            setTasks(prev => prev.filter(t => t._id !== taskId));
            if (selectedTask?._id === taskId) setSelectedTask(null);
        } catch (error) {
            console.error("Failed to approve", error);
        }
    };

    const handleRejectClick = (task, e) => {
        if (e) e.stopPropagation();
        setSelectedTask(task);
        // We do not reject immediately if they click from the list, we open drawer to enforce notes
    };

    const submitRejection = async () => {
        if (!selectedTask.qaNotes?.trim()) {
            setRejectionError(true);
            return;
        }
        
        try {
            // Might need to update task with notes as well, but for now just status
            await taskService.updateTaskStatus(selectedTask._id, 'In Progress');
            setTasks(prev => prev.filter(t => t._id !== selectedTask._id));
            setSelectedTask(null);
            setRejectionError(false);
        } catch (error) {
            console.error("Failed to reject", error);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="qa" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="QA Reviews" role="qa" />
                
                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QA Reviews</h1>
                            <p className="text-sm text-slate-500 mt-1">Pending tasks awaiting quality assurance review and approval.</p>
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

                    {/* Tasks List */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {loading ? (
                                    <div className="col-span-full text-center text-slate-500 py-12">Loading...</div>
                                ) : filteredTasks.map(task => {
                                    const taskOverdue = isOverdue(task.endDate);

                                    return (
                                        <div 
                                            key={task._id}
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setRejectionError(false);
                                            }}
                                            className={`bg-white p-6 rounded-2xl shadow-sm border ${taskOverdue ? 'border-rose-200' : 'border-slate-200'} hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col h-full`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                                    {task.project?.name || "No Project"}
                                                </span>
                                                <div className="flex gap-1.5 items-center">
                                                    {taskOverdue && (
                                                        <span className="text-[10px] font-bold px-1.5 py-1 rounded-md bg-rose-100 text-rose-600 flex items-center" title="Overdue">
                                                            <AlertTriangle className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium']}`}>
                                                        {task.priority || "Medium"}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-3 leading-snug">
                                                {task.taskName}
                                            </h3>
                                            
                                            <div className="flex flex-col gap-2 mt-auto">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-500 font-medium">Developer:</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold uppercase">
                                                            {task.assignedTo?.name?.substring(0,2) || "U"}
                                                        </div>
                                                        <span className="font-semibold text-slate-700">{task.assignedTo?.name || "Unassigned"}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-500 font-medium">Due Date:</span>
                                                    <span className={`font-semibold ${taskOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                                        {task.endDate ? new Date(task.endDate).toLocaleDateString() : "N/A"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100">
                                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 flex items-center border border-amber-100">
                                                    <Clock className="w-3.5 h-3.5 mr-1.5" /> QA Review
                                                </span>
                                                
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={(e) => handleRejectClick(task, e)}
                                                        className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors border border-rose-100"
                                                        title="Reject Task"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleApprove(task._id, e)}
                                                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors border border-emerald-100"
                                                        title="Approve Task"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        
                        {!loading && filteredTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 border-dashed">
                                <ShieldCheck className="w-12 h-12 text-slate-300 mb-3" />
                                <h3 className="text-lg font-bold text-slate-700">No Pending Reviews</h3>
                                <p className="text-slate-500 text-sm mt-1">There are no tasks awaiting your review right now.</p>
                            </div>
                        )}
                    </div>
                </main>

                {/* Task Details Drawer */}
                {selectedTask && (
                    <div className="absolute inset-0 z-50 flex justify-end">
                        <div 
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                            onClick={() => {
                                setSelectedTask(null);
                                setRejectionError(false);
                            }}
                        />
                        <div className="w-full max-w-lg bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
                            
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-amber-100 text-amber-700 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" /> Pending Review
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
                                <div className="flex gap-2 mb-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${PRIORITY_COLORS[selectedTask.priority]}`}>
                                        {selectedTask.priority} Priority
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                        {selectedTask.project?.name || "No Project"}
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
                                    {selectedTask.title}
                                </h2>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Developer</p>
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
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className={`text-sm font-bold flex items-center ${rejectionError ? 'text-rose-600' : 'text-indigo-600'}`}>
                                            <ShieldCheck className="w-4 h-4 mr-2" />
                                            QA Notes {rejectionError && <span className="text-rose-500 ml-1">(Required for rejection)</span>}
                                        </h3>
                                    </div>
                                    <textarea 
                                        placeholder="Add your findings, approval reasoning, or rejection issues here..."
                                        className={`w-full p-4 bg-white border rounded-xl text-sm focus:outline-none transition-all min-h-[120px] resize-none ${
                                            rejectionError 
                                                ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                                                : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                                        }`}
                                        value={selectedTask.qaNotes}
                                        onChange={(e) => {
                                            const newNotes = e.target.value;
                                            setTasks(prev => prev.map(t => t._id === selectedTask._id ? { ...t, qaNotes: newNotes } : t));
                                            setSelectedTask(prev => ({ ...prev, qaNotes: newNotes }));
                                            if (rejectionError && newNotes.trim()) setRejectionError(false);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
                                <button 
                                    onClick={submitRejection}
                                    className="flex-1 flex items-center justify-center px-5 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-bold rounded-xl transition-colors shadow-sm"
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Task
                                </button>
                                <button 
                                    onClick={() => handleApprove(selectedTask._id)}
                                    className="flex-1 flex items-center justify-center px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-emerald-200"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Approve Task
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

export default QAReviews;
