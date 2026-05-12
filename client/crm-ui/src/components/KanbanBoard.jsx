import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Calendar, MoreVertical, Paperclip, Clock, X,
    CheckCircle2, PlayCircle, ShieldCheck, FileText,
    AlertTriangle, MessageSquare, ArrowRight, History, Lock
} from 'lucide-react';
import { taskService } from '../api/services';

const COLUMNS = [
    { id: 'New', title: 'New', color: 'bg-slate-100', dot: 'bg-slate-400', dragOver: 'ring-slate-400', icon: Clock },
    { id: 'In Progress', title: 'In Progress', color: 'bg-blue-50', dot: 'bg-blue-500', dragOver: 'ring-blue-400', icon: PlayCircle },
    { id: 'QA Review', title: 'QA Review', color: 'bg-indigo-50', dot: 'bg-indigo-500', dragOver: 'ring-indigo-400', icon: ShieldCheck },
    { id: 'Completed', title: 'Completed', color: 'bg-emerald-50', dot: 'bg-emerald-500', dragOver: 'ring-emerald-400', icon: CheckCircle2 },
    { id: 'Done', title: 'Done', color: 'bg-slate-100', dot: 'bg-slate-800', dragOver: 'ring-slate-600', icon: CheckCircle2 },
];

const PRIORITY_COLORS = {
    'Low': 'bg-slate-100 text-slate-600',
    'Medium': 'bg-blue-100 text-blue-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-rose-100 text-rose-700',
};

/** Reusable Kanban board with drag-drop + status change modal + task detail sidebar */
const KanbanBoard = ({ tasks, setTasks, searchQuery, loading, role }) => {
    // Drag state
    const dragTaskId = useRef(null);
    const dragFromCol = useRef(null);
    const [dragOverCol, setDragOverCol] = useState(null);

    // Search params for deep linking
    const [searchParams, setSearchParams] = useSearchParams();
    const initialProject = searchParams.get('project') || 'All';

    // Status change modal
    const [pendingChange, setPendingChange] = useState(null); // { taskId, fromStatus, toStatus }
    const [changeNotes, setChangeNotes] = useState('');
    const [changeAttachment, setChangeAttachment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Task detail sidebar
    const [selectedTask, setSelectedTask] = useState(null);

    // ─── Drag Handlers ────────────────────────────────────────────────────────
    const onDragStart = (e, taskId, colId) => {
        // Developer restrictions
        if (role === 'developer' && ['QA Review', 'Completed', 'Done'].includes(colId)) {
            e.preventDefault();
            toast.error(`Tasks in ${colId} are locked for Developers`);
            return;
        }

        dragTaskId.current = taskId;
        dragFromCol.current = colId;
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e, colId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colId);
    };

    const onDragLeave = () => setDragOverCol(null);

    const onDrop = (e, targetColId) => {
        e.preventDefault();
        setDragOverCol(null);
        if (!dragTaskId.current || dragFromCol.current === targetColId) return;

        // Developer restrictions
        if (role === 'developer' && ['Completed', 'Done'].includes(targetColId)) {
            toast.error('Developers cannot move tasks to Completed or Done');
            dragTaskId.current = null;
            dragFromCol.current = null;
            return;
        }
        // Open confirmation modal instead of immediately updating
        setPendingChange({
            taskId: dragTaskId.current,
            fromStatus: dragFromCol.current,
            toStatus: targetColId
        });
        setChangeNotes('');
        setChangeAttachment('');
        dragTaskId.current = null;
        dragFromCol.current = null;
    };

    // ─── Status Change Modal ──────────────────────────────────────────────────
    const confirmStatusChange = async () => {
        if (!pendingChange) return;
        setIsSaving(true);
        try {
            await taskService.updateTaskStatus(
                pendingChange.taskId,
                pendingChange.toStatus,
                changeNotes,
                changeAttachment
            );
            setTasks(prev => prev.map(t => {
                const id = t._id || t.id;
                if (id === pendingChange.taskId) {
                    const history = t.statusHistory || [];
                    return {
                        ...t,
                        status: pendingChange.toStatus,
                        statusHistory: [...history, {
                            status: pendingChange.toStatus,
                            notes: changeNotes,
                            attachment: changeAttachment,
                            changedAt: new Date().toISOString()
                        }]
                    };
                }
                return t;
            }));
            // If sidebar open for this task, update it too
            if (selectedTask) {
                const sid = selectedTask._id || selectedTask.id;
                if (sid === pendingChange.taskId) {
                    const history = selectedTask.statusHistory || [];
                    setSelectedTask({
                        ...selectedTask,
                        status: pendingChange.toStatus,
                        statusHistory: [...history, {
                            status: pendingChange.toStatus,
                            notes: changeNotes,
                            attachment: changeAttachment,
                            changedAt: new Date().toISOString()
                        }]
                    });
                }
            }
            toast.success(`Task moved to "${pendingChange.toStatus}"`);
        } catch (err) {
            toast.error('Failed to update task status');
        } finally {
            setIsSaving(false);
            setPendingChange(null);
        }
    };

    const cancelStatusChange = () => {
        setPendingChange(null);
        setChangeNotes('');
        setChangeAttachment('');
    };

    // ─── Helpers ───────────────────────────────────────────────────────────────
    // Always return a STRING — never let an object fall through into JSX
    const getTaskName  = t => String(t.taskName || t.title || '');
    const getTaskId    = t => String(t._id || t.id || '');
    const getProject   = t => {
        // project may be a populated object {_id, name, projectName, status}
        // or a plain string ID, or undefined
        if (!t.project) return 'Unassigned';
        if (typeof t.project === 'string') return t.project;
        return String(t.project.projectName || t.project.name || 'Unassigned');
    };
    const getAssignee  = t => {
        if (!t.assignedTo) return String(t.assignee || 'Unassigned');
        if (typeof t.assignedTo === 'string') return t.assignedTo;
        return String(t.assignedTo.name || 'Unassigned');
    };
    const getAssigneeInitial = t => {
        const name = getAssignee(t);
        return name.substring(0, 2).toUpperCase();
    };
    const getEndDate = t => {
        if (!t.endDate) return 'N/A';
        try { return new Date(t.endDate).toLocaleDateString(); }
        catch { return 'N/A'; }
    };
    const isOverdue    = t => t.endDate && new Date(t.endDate) < new Date() && !['Completed', 'Done'].includes(t.status);
    const getHistory   = t => Array.isArray(t.statusHistory) ? t.statusHistory : [];

    // Derive unique project list from current task data
    const projectOptions = React.useMemo(() => {
        const seen = new Set();
        const opts = [];
        (tasks || []).forEach(t => {
            const name = getProject(t);
            if (name && name !== 'Unassigned' && !seen.has(name)) {
                seen.add(name);
                opts.push(name);
            }
        });
        return opts.sort();
    }, [tasks]);

    const [projectFilter, setProjectFilter] = useState(initialProject);

    // Update URL when filter changes
    useEffect(() => {
        if (projectFilter === 'All') {
            searchParams.delete('project');
        } else {
            searchParams.set('project', projectFilter);
        }
        setSearchParams(searchParams, { replace: true });
    }, [projectFilter, searchParams, setSearchParams]);

    // Handle external URL changes (e.g. browser back button)
    useEffect(() => {
        const urlProject = searchParams.get('project') || 'All';
        if (urlProject !== projectFilter) {
            setProjectFilter(urlProject);
        }
    }, [searchParams]);

    const filteredTasks = (tasks || []).filter(t => {
        const matchesSearch = !searchQuery || (
            getTaskName(t).toLowerCase().includes(searchQuery.toLowerCase()) ||
            getProject(t).toLowerCase().includes(searchQuery.toLowerCase())
        );
        const matchesProject = projectFilter === 'All' || getProject(t) === projectFilter;
        return matchesSearch && matchesProject;
    });

    return (
        <>
            {/* ─── Project Filter Bar ───────────────────────────────────────── */}
            {!loading && projectOptions.length > 0 && (
                <div className="flex items-center gap-2 mb-4 flex-wrap shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Project:</span>
                    <button
                        onClick={() => setProjectFilter('All')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            projectFilter === 'All'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                    >
                        All Projects
                    </button>
                    {projectOptions.map(proj => (
                        <button
                            key={proj}
                            onClick={() => setProjectFilter(proj === projectFilter ? 'All' : proj)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                projectFilter === proj
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                            }`}
                        >
                            {proj}
                        </button>
                    ))}
                </div>
            )}

            {/* ─── Kanban Board ─────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 kanban-scrollbar">
                    <div className="flex gap-4 h-full min-w-max px-2">
                        {COLUMNS.map(col => {
                            const colTasks = filteredTasks.filter(t => t.status === col.id);
                            const isOver = dragOverCol === col.id;
                            return (
                                <div
                                    key={col.id}
                                    onDragOver={e => onDragOver(e, col.id)}
                                    onDragLeave={onDragLeave}
                                    onDrop={e => onDrop(e, col.id)}
                                    className={`w-[290px] flex flex-col h-full rounded-2xl transition-all duration-200 ${col.color} border ${isOver ? `border-2 ${col.dragOver} ring-2 ${col.dragOver}` : 'border-slate-200/60'}`}
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

                                    {/* Drop zone hint */}
                                    {isOver && (
                                        <div className="mx-3 mb-2 h-16 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center text-xs font-bold text-blue-500 bg-blue-50/50">
                                            Drop here → {col.title}
                                        </div>
                                    )}

                                    {/* Tasks List */}
                                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 custom-scrollbar">
                                        {colTasks.map(task => {
                                            const overdue = isOverdue(task);
                                            const hist = getHistory(task);
                                            const isLocked = role === 'developer' && ['QA Review', 'Completed', 'Done'].includes(col.id);
                                            return (
                                                <div
                                                    key={getTaskId(task)}
                                                    draggable={!isLocked}
                                                    onDragStart={e => onDragStart(e, getTaskId(task), col.id)}
                                                    onClick={() => setSelectedTask(task)}
                                                    className={`bg-white p-4 rounded-xl shadow-sm border ${overdue ? 'border-rose-200' : 'border-slate-200'} ${isLocked ? 'cursor-default opacity-90' : 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300'} transition-all group select-none`}
                                                >
                                                    <div className="flex justify-between items-start mb-2.5">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setProjectFilter(getProject(task));
                                                            }}
                                                            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 truncate max-w-[60%] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer"
                                                        >
                                                            {getProject(task)}
                                                        </button>
                                                        <div className="flex gap-1.5 shrink-0">
                                                            {overdue && (
                                                                <span className="text-[10px] font-bold px-1.5 py-1 rounded-md bg-rose-100 text-rose-600 flex items-center" title="Overdue">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                </span>
                                                            )}
                                                            {isLocked && (
                                                                <span className="text-[10px] font-bold px-1.5 py-1 rounded-md bg-slate-100 text-slate-500 flex items-center border border-slate-200" title="Locked: QA Review / Completed / Done">
                                                                    <Lock className="w-3 h-3" />
                                                                </span>
                                                            )}
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium']}`}>
                                                                {task.priority || 'Medium'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors leading-snug text-sm">
                                                        {getTaskName(task)}
                                                    </h4>

                                                    <div className="flex items-center text-xs text-slate-500 mb-3 mt-2 font-medium">
                                                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                        <span className={overdue ? 'text-rose-600 font-bold' : ''}>{getEndDate(task)}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold shadow-sm shrink-0" title={getAssignee(task)}>
                                                                {getAssigneeInitial(task)}
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-600 truncate max-w-[90px]">
                                                                {getAssignee(task)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-400">
                                                            {hist.filter(h => h.notes || h.attachment).length > 0 && (
                                                                <div className="flex items-center text-xs font-medium gap-1 text-indigo-500" title="Has status notes">
                                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                                    <span>{hist.filter(h => h.notes || h.attachment).length}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {colTasks.length === 0 && !isOver && (
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

            {/* ─── Status Change Modal ──────────────────────────────────────── */}
            {pendingChange && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Confirm Status Change</h2>
                                <div className="flex items-center gap-2 mt-1.5 text-sm">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{pendingChange.fromStatus}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{pendingChange.toStatus}</span>
                                </div>
                            </div>
                            <button onClick={cancelStatusChange} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Notes <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={changeNotes}
                                    onChange={e => setChangeNotes(e.target.value)}
                                    placeholder="e.g. Fixed the login bug, moved to QA for testing..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none placeholder-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Attachment URL / Reference <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <div className="relative">
                                    <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={changeAttachment}
                                        onChange={e => setChangeAttachment(e.target.value)}
                                        placeholder="e.g. https://drive.google.com/... or PR#123"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button
                                onClick={cancelStatusChange}
                                className="flex-1 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmStatusChange}
                                disabled={isSaving}
                                className="flex-1 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                ) : 'Save & Move'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Task Detail Sidebar ──────────────────────────────────────── */}
            {selectedTask && (
                <div className="absolute inset-0 z-50 flex justify-end">
                    <div
                        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                        onClick={() => setSelectedTask(null)}
                    />
                    <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
                        {/* Drawer Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${PRIORITY_COLORS[selectedTask.priority] || PRIORITY_COLORS['Medium']}`}>
                                    {selectedTask.priority || 'Medium'} Priority
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                    {getProject(selectedTask)}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                {getTaskName(selectedTask)}
                            </h2>

                            {/* Meta grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Status', value: selectedTask.status, cls: 'text-blue-700 font-bold' },
                                    { label: 'Assignee', value: getAssignee(selectedTask), cls: 'text-slate-700 font-bold' },
                                    { label: 'Due Date', value: getEndDate(selectedTask), cls: isOverdue(selectedTask) ? 'text-rose-600 font-bold' : 'text-slate-700 font-bold' },
                                ].map(item => (
                                    <div key={item.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                                        <p className={`text-sm ${item.cls}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Description */}
                            {(selectedTask.description) && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" /> Description
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {selectedTask.description}
                                    </p>
                                </div>
                            )}

                            {/* Status History */}
                            {(() => {
                                const hist = getHistory(selectedTask).filter(h => h.notes || h.attachment);
                                if (hist.length === 0) return null;
                                return (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <History className="w-4 h-4 text-indigo-500" />
                                            Status Change History
                                        </h3>
                                        <div className="space-y-3">
                                            {hist.slice().reverse().map((entry, idx) => (
                                                <div key={idx} className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-bold text-indigo-700 px-2 py-0.5 bg-indigo-100 rounded-full">
                                                            → {entry.status}
                                                        </span>
                                                        {entry.changedAt && (
                                                            <span className="text-xs text-slate-400">
                                                                {new Date(entry.changedAt).toLocaleDateString()} {new Date(entry.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {entry.notes && (
                                                        <p className="text-sm text-slate-700 leading-relaxed mb-2">
                                                            <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide block mb-1">Notes</span>
                                                            {entry.notes}
                                                        </p>
                                                    )}
                                                    {entry.attachment && (
                                                        <div className="flex items-center gap-2 text-sm mt-1">
                                                            <Paperclip className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                            <a
                                                                href={entry.attachment.startsWith('http') ? entry.attachment : '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-600 hover:underline truncate font-medium"
                                                            >
                                                                {entry.attachment}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Empty history message */}
                            {getHistory(selectedTask).filter(h => h.notes || h.attachment).length === 0 && (
                                <div className="text-center py-4">
                                    <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No notes added during status changes yet.</p>
                                    <p className="text-xs text-slate-400 mt-1">Drag a task to a new column to add notes.</p>
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export { COLUMNS, PRIORITY_COLORS };
export default KanbanBoard;
