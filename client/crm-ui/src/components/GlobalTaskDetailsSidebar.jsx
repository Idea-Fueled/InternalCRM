import React, { useState, useEffect } from 'react';
import { 
    X, Calendar, Paperclip, FileText, MessageSquare, 
    ArrowRight, History, Lock, ExternalLink, Download, 
    ChevronUp, ChevronDown, AlertTriangle, Trash2
} from 'lucide-react';
import { taskService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import DeleteConfirmModal from './DeleteConfirmModal';

const PRIORITY_COLORS = {
    'Low':      'bg-slate-100 text-slate-600 border border-slate-200/50',
    'Medium':   'bg-blue-100 text-blue-700 border border-blue-200/50',
    'High':     'bg-orange-100 text-orange-700 border border-orange-200/50',
    'Critical': 'bg-rose-100 text-rose-700 border border-rose-200/50 animate-pulse',
};

const STATUS_COLORS = {
    'New':         'bg-slate-100 text-slate-600 border border-slate-200',
    'In Progress': 'bg-blue-100 text-blue-700 border border-blue-200',
    'QA Review':   'bg-indigo-100 text-indigo-700 border border-indigo-200',
    'Completed':   'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'Done':        'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

// ─── File type helpers ────────────────────────────────────────────────────────
const getFileIcon = (fileType = '', filename = '') => {
    const t = (fileType + filename).toLowerCase();
    if (t.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)/) || t.startsWith('image/')) return { icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50',  badge: 'IMG'  };
    if (t.match(/\.pdf/) || t.includes('pdf'))                                     return { icon: FileText, color: 'text-rose-500',    bg: 'bg-rose-50',     badge: 'PDF'  };
    if (t.match(/\.(zip|rar|7z|tar|gz)/) || t.includes('zip'))                   return { icon: FileText, color: 'text-amber-500',   bg: 'bg-amber-50',    badge: 'ZIP'  };
    return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', badge: 'FILE' };
};

const isImageFile = (fileType = '', url = '') => {
    const t = (fileType + url).toLowerCase();
    return t.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)/) || t.startsWith('image/');
};

const getLinkMeta = (url = '') => {
    const lower = url.toLowerCase();
    if (lower.includes('loom.com'))         return { label: 'Loom',         color: 'bg-violet-100 text-violet-700', icon: ExternalLink };
    if (lower.includes('drive.google.com')) return { label: 'Google Drive',  color: 'bg-blue-100 text-blue-700',    icon: ExternalLink };
    return { label: 'Link', color: 'bg-indigo-100 text-indigo-700', icon: ExternalLink };
};

const formatDateTime = (dt) => {
    if (!dt) return '';
    try {
        const d = new Date(dt);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            + ' · '
            + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
};

const AttachmentCard = ({ file, onDelete = null }) => {
    const img = isImageFile(file.fileType, file.url);
    const meta = getFileIcon(file.fileType, file.filename);
    const Icon = meta.icon;
    const name = file.filename || 'Attachment';

    return (
        <div className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition-all">
            {img ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                    <img src={file.url} alt={name} className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{name}</p>
                {file.fileType && <p className="text-[10px] text-slate-400 mt-0.5">{file.fileType}</p>}
            </div>
            <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Open / Download"
            >
                <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Attachment"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};

const ScreenshotLinkCard = ({ url }) => {
    const meta = getLinkMeta(url);
    return (
        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="min-w-0 leading-tight">
                    <p className="text-xs font-semibold text-slate-700 truncate">{meta.label}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">{url}</p>
                </div>
            </div>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-slate-50 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition shadow-sm border border-slate-100"
            >
                <ExternalLink className="w-3.5 h-3.5" />
            </a>
        </div>
    );
};

const TimelineEntry = ({ entry, canDeleteNote = false, onDeleteNote = null, canDeleteAttachment = null, onDeleteAttachment = null }) => {
    const [expanded, setExpanded] = useState(true);
    const isRestricted = entry.notes === '[Restricted Visibility]';
    const hasAttachments = Array.isArray(entry.attachments) && entry.attachments.length > 0;
    const hasLinks = Array.isArray(entry.screenshotLinks) && entry.screenshotLinks.length > 0;
    const hasLegacyAttachment = entry.attachment && entry.attachment !== '[Restricted Visibility]' && entry.attachment.startsWith('http');
    const hasContent = entry.notes || hasAttachments || hasLinks || hasLegacyAttachment;

    return (
        <div className={`relative rounded-2xl border transition-all ${
            isRestricted ? 'bg-slate-50 border-slate-200 border-dashed' : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'
        }`}>
            <div className="flex items-start justify-between p-4 gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isRestricted ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                    }`}>
                        {isRestricted ? <Lock className="w-3.5 h-3.5" /> : (entry.changedBy?.name ? entry.changedBy.name.substring(0, 2).toUpperCase() : '??')}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            {entry.fromStatus && <span className="text-[10px] font-bold text-slate-400">{entry.fromStatus}</span>}
                            {entry.fromStatus && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                {entry.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs font-semibold text-slate-700">{isRestricted ? 'Restricted' : (entry.changedBy?.name || 'Unknown')}</span>
                            {entry.changedBy?.role && !isRestricted && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 capitalize">{entry.changedBy.role}</span>
                            )}
                            {entry.changedAt && <span className="text-[10px] text-slate-400">{formatDateTime(entry.changedAt)}</span>}
                        </div>
                    </div>
                </div>
                {hasContent && !isRestricted && (
                    <button onClick={() => setExpanded(p => !p)} className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                )}
            </div>
            {!isRestricted && hasContent && expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
                    {entry.notes && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5" /> Notes
                                </p>
                                {canDeleteNote && onDeleteNote && (
                                    <button
                                        type="button"
                                        onClick={onDeleteNote}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Note"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">{entry.notes}</p>
                        </div>
                    )}
                    {hasAttachments && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Attachments ({entry.attachments.length})</p>
                            <div className="space-y-2">
                                {entry.attachments.map((f, fi) => (
                                    <AttachmentCard 
                                        key={fi} 
                                        file={f} 
                                        onDelete={canDeleteAttachment && canDeleteAttachment(f) ? () => onDeleteAttachment(f) : null}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {hasLegacyAttachment && !hasAttachments && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Attachment</p>
                            <ScreenshotLinkCard url={entry.attachment} />
                        </div>
                    )}
                    {hasLinks && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Reference Links ({entry.screenshotLinks.length})</p>
                            <div className="space-y-2">
                                {entry.screenshotLinks.map((url, li) => <ScreenshotLinkCard key={li} url={url} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const GlobalTaskDetailsSidebar = ({ taskId, onClose }) => {
    const { user } = useAuth();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);

    // Deletion Modal States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'note' | 'attachment', id: string, name?: string }
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTaskDetails = async (silent = false) => {
        if (!taskId) return;
        try {
            if (!silent) setLoading(true);
            const res = await taskService.getAllTasks();
            const allTasks = res.data.tasks || [];
            const matched = allTasks.find(t => String(t._id || t.id) === String(taskId));
            setTask(matched || null);
        } catch (err) {
            console.error("Failed to load task details:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskDetails();
    }, [taskId]);

    // Permission checks
    const isProjectTL = task?.project?.teamLead?._id === user?._id || task?.project?.teamLead === user?._id;

    const canDeleteTaskNote = (entry) => {
        if (!user || !task) return false;
        if (user.role === 'admin') return true;
        
        const authorId = entry.changedBy?._id || entry.changedBy;
        if (authorId === user._id) return true;
        
        if (isProjectTL) {
            const authorRole = entry.changedBy?.role;
            if (authorRole !== 'admin' && authorRole !== 'TL') {
                return true;
            }
        }
        return false;
    };

    const canDeleteTaskAttachment = (attachment, parentEntry = null) => {
        if (!user || !task) return false;
        if (user.role === 'admin') return true;
        
        const uploaderId = attachment.uploadedBy?._id || attachment.uploadedBy || (parentEntry ? (parentEntry.changedBy?._id || parentEntry.changedBy) : null);
        if (uploaderId === user._id) return true;
        
        if (isProjectTL) {
            const uploaderRole = attachment.uploadedBy?.role || (parentEntry ? parentEntry.changedBy?.role : null);
            if (uploaderRole !== 'admin' && uploaderRole !== 'TL') {
                return true;
            }
        }
        return false;
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setIsDeleting(true);
            if (deleteTarget.type === 'note') {
                await taskService.deleteTaskHistoryNote(task._id || task.id, deleteTarget.id);
                toast.success("Task comment deleted successfully!");
            } else if (deleteTarget.type === 'attachment') {
                await taskService.deleteTaskAttachment(task._id || task.id, deleteTarget.id);
                toast.success("Task attachment deleted successfully!");
            }
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
            fetchTaskDetails(true); // reload silently
        } catch (err) {
            console.error("Failed to delete task item:", err);
            toast.error(err.response?.data?.message || "Failed to delete item");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!taskId) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            
            {/* Sidebar drawer content */}
            <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-350 border-l border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {task && (
                            <>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium']}`}>
                                    {task.priority || 'Medium'} Priority
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                    {task.project?.projectName || task.project?.name || task.project || 'Unassigned'}
                                </span>
                            </>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                    {loading ? (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-semibold">Loading task outline…</p>
                        </div>
                    ) : !task ? (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2 text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mb-1" />
                            <p className="text-sm font-bold text-slate-700">Task details not available</p>
                            <p className="text-xs">This task may have been archived, deleted, or you might not have access permissions.</p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">{task.taskName || task.title}</h2>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Status',      value: task.status,                  cls: `${STATUS_COLORS[task.status] || STATUS_COLORS['New']} text-xs font-bold px-2 py-0.5 rounded-lg border text-center inline-block` },
                                    { label: 'Priority',    value: task.priority || 'Medium',    cls: task.priority === 'Critical' ? 'text-rose-600 font-extrabold text-sm' : 'text-slate-700 font-bold text-sm' },
                                    { label: 'Start Date',  value: task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A', cls: 'text-slate-700 font-semibold text-sm' },
                                    { label: 'Due Date',    value: task.endDate ? new Date(task.endDate).toLocaleDateString() : 'N/A', cls: 'text-slate-700 font-semibold text-sm' },
                                ].map(item => (
                                    <div key={item.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 mb-1">{item.label}</p>
                                        <div className={item.cls}>{item.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Assigned Employees */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned Employees</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-blue-200">
                                            {task.assignedTo?.profilePic ? <img src={task.assignedTo.profilePic} alt="" className="w-full h-full object-cover" /> : (task.assignedTo?.name || 'Unassigned').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 leading-tight">
                                            <p className="text-xs font-bold text-slate-700 truncate">{task.assignedTo?.name || 'Unassigned'}</p>
                                            <p className="text-[10px] font-semibold text-slate-400">Developer</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-indigo-200">
                                            {task.assignedQA?.profilePic ? <img src={task.assignedQA.profilePic} alt="" className="w-full h-full object-cover" /> : (task.assignedQA?.name || 'Unassigned').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 leading-tight">
                                            <p className="text-xs font-bold text-slate-700 truncate">{task.assignedQA?.name || 'Unassigned'}</p>
                                            <p className="text-[10px] font-semibold text-slate-400">QA Engineer</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {task.description && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" /> Description
                                    </h3>
                                    <p className="text-sm text-slate-650 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {task.description}
                                    </p>
                                </div>
                            )}

                            {/* Attachments */}
                            {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <Paperclip className="w-4 h-4 text-emerald-500" /> All Task Attachments
                                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">{task.attachments.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {task.attachments.map((f, i) => (
                                            <AttachmentCard 
                                                key={i} 
                                                file={f} 
                                                onDelete={canDeleteTaskAttachment(f) ? () => {
                                                    setDeleteTarget({ type: 'attachment', id: f._id || f.id || f.url, name: f.filename });
                                                    setIsDeleteModalOpen(true);
                                                } : null}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Activity History */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <History className="w-4 h-4 text-indigo-500" />
                                    Activity Timeline
                                    {Array.isArray(task.statusHistory) && task.statusHistory.length > 0 && (
                                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                                            {task.statusHistory.length}
                                        </span>
                                    )}
                                </h3>

                                {!task.statusHistory || task.statusHistory.length === 0 ? (
                                    <div className="text-center py-8">
                                        <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm text-slate-400">No activity logged yet.</p>
                                    </div>
                                ) : (
                                    <div className="relative space-y-3">
                                        <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-250" aria-hidden />
                                        <div className="space-y-3">
                                            {task.statusHistory.slice().reverse().map((entry, idx) => (
                                                <TimelineEntry 
                                                    key={idx} 
                                                    entry={entry} 
                                                    canDeleteNote={canDeleteTaskNote(entry)}
                                                    onDeleteNote={() => {
                                                        setDeleteTarget({ type: 'note', id: entry._id || entry.id });
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    canDeleteAttachment={(f) => canDeleteTaskAttachment(f, entry)}
                                                    onDeleteAttachment={(f) => {
                                                        setDeleteTarget({ type: 'attachment', id: f._id || f.id || f.url, name: f.filename });
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
                    >Close</button>
                </div>
            </div>

            {/* Deletion Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteTarget(null);
                }}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                title={deleteTarget?.type === "note" ? "Delete Task Comment" : "Delete Task Attachment"}
                message={
                    deleteTarget?.type === "note"
                        ? "Are you sure you want to delete this task comment? This action cannot be undone and will be permanently recorded in the Audit Logs."
                        : `Are you sure you want to delete the attachment "${deleteTarget?.name}"? This action cannot be undone and will be permanently recorded in the Audit Logs.`
                }
            />
        </div>
    );
};

export default GlobalTaskDetailsSidebar;
