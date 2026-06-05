import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Calendar, MoreVertical, Paperclip, Clock, X,
    CheckCircle2, PlayCircle, ShieldCheck, FileText,
    AlertTriangle, MessageSquare, ArrowRight, History,
    Lock, Trash2, Upload, Link2, Plus, Image,
    File, Archive, ExternalLink, Download, Eye,
    Video, Globe, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { taskService, projectService } from '../api/services';
import usePermission from '../hooks/usePermission';
import { useAuth } from '../context/AuthContext';

const getUserLabel = (m) => {
    if (!m) return "";
    const designation = m.designation || (
        m.role === 'TL' || m.role === 'tl' ? 'Team Lead' :
        m.role === 'qa' || m.role === 'QA' ? 'QA' :
        m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1).toLowerCase() :
        'Employee'
    );
    return `${m.name} (${designation})`;
};

const getUserDesignationLabel = (m) => {
    if (!m) return "";
    const designation = m.designation || "";
    const role = m.role || "";
    
    const titleCase = (str) => {
        if (!str) return "";
        return str.split(" ")
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
    };

    if (designation && designation.trim() !== "" && designation.toLowerCase() !== role.toLowerCase()) {
        return titleCase(designation.trim());
    }

    const resolvedRole = role.toLowerCase();
    if (resolvedRole === "admin") return "Admin";
    if (resolvedRole === "tl" || resolvedRole === "teamlead" || resolvedRole === "team_lead") return "Technical Team Lead";
    if (resolvedRole === "qa") return "Senior QA";
    if (resolvedRole === "hr") return "HR Executive";
    if (resolvedRole === "developer") return "Developer";
    if (resolvedRole === "employee") return "Employee";
    
    if (designation) return titleCase(designation);
    return titleCase(role);
};

const isUserQA = (m) => {
    if (!m) return false;
    const roleLower = (m.role || "").toLowerCase();
    const designationLower = (m.designation || "").toLowerCase();
    return roleLower === "qa" || designationLower.includes("qa");
};

const isUserTL = (m) => {
    if (!m) return false;
    const roleLower = (m.role || "").toLowerCase();
    const designationLower = (m.designation || "").toLowerCase();
    return roleLower === "tl" || roleLower === "teamlead" || roleLower === "team_lead" || designationLower.includes("lead");
};

const isUserAdmin = (m) => {
    if (!m) return false;
    const roleLower = (m.role || "").toLowerCase();
    const designationLower = (m.designation || "").toLowerCase();
    return roleLower === "admin" || designationLower.includes("admin");
};

const COLUMNS = [
    { id: 'New',        title: 'New',        color: 'bg-slate-100',   dot: 'bg-slate-400',   dragOver: 'ring-slate-400',   icon: Clock        },
    { id: 'In Progress',title: 'In Progress', color: 'bg-blue-50',    dot: 'bg-blue-500',    dragOver: 'ring-blue-400',    icon: PlayCircle   },
    { id: 'QA Review',  title: 'QA Review',  color: 'bg-indigo-50',  dot: 'bg-indigo-500',  dragOver: 'ring-indigo-400',  icon: ShieldCheck  },
    { id: 'Completed',  title: 'Completed',  color: 'bg-emerald-50', dot: 'bg-emerald-500', dragOver: 'ring-emerald-400', icon: CheckCircle2 },
    { id: 'Done',       title: 'Done',       color: 'bg-slate-100',  dot: 'bg-slate-800',   dragOver: 'ring-slate-600',   icon: CheckCircle2 },
];

const PRIORITY_COLORS = {
    'Low':      'bg-slate-100 text-slate-600',
    'Medium':   'bg-blue-100 text-blue-700',
    'High':     'bg-orange-100 text-orange-700',
    'Critical': 'bg-rose-100 text-rose-700',
};

const getCardStyle = (status, overdue) => {
    if (overdue) {
        return {
            bgBorder: 'bg-rose-50 border-rose-300 border-l-4 border-l-rose-500 shadow-sm shadow-rose-100/40 hover:bg-rose-100/60 hover:border-rose-400 hover:border-l-rose-600 hover:shadow-md',
            badge: 'bg-rose-100 text-rose-700 border-rose-250',
            dot: 'bg-rose-500'
        };
    }
    switch (status) {
        case 'New':
            return {
                bgBorder: 'bg-slate-50/40 border-slate-200 border-l-4 border-l-slate-400 hover:bg-slate-50/80 hover:border-slate-300 hover:border-l-slate-500 hover:shadow-md',
                badge: 'bg-slate-100 text-slate-600 border-slate-200',
                dot: 'bg-slate-400'
            };
        case 'In Progress':
            return {
                bgBorder: 'bg-blue-50/20 border-blue-200 border-l-4 border-l-blue-400 hover:bg-blue-50/45 hover:border-blue-300 hover:border-l-blue-500 hover:shadow-md',
                badge: 'bg-blue-100 text-blue-700 border-blue-200',
                dot: 'bg-blue-500'
            };
        case 'QA Review':
            return {
                bgBorder: 'bg-indigo-50/25 border-indigo-200 border-l-4 border-l-indigo-400 hover:bg-indigo-50/50 hover:border-indigo-300 hover:border-l-indigo-500 hover:shadow-md',
                badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                dot: 'bg-indigo-500'
            };
        case 'Completed':
        case 'Done':
            return {
                bgBorder: 'bg-emerald-50/20 border-emerald-200 border-l-4 border-l-emerald-400 hover:bg-emerald-50/45 hover:border-emerald-300 hover:border-l-emerald-500 hover:shadow-md',
                badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                dot: 'bg-emerald-500'
            };
        default:
            return {
                bgBorder: 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md',
                badge: 'bg-slate-100 text-slate-600 border-slate-200',
                dot: 'bg-slate-400'
            };
    }
};

// ─── File type helpers ────────────────────────────────────────────────────────
const getFileIcon = (fileType = '', filename = '') => {
    const t = (fileType + filename).toLowerCase();
    if (t.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)/) || t.startsWith('image/')) return { icon: Image,   color: 'text-emerald-500', bg: 'bg-emerald-50',  badge: 'IMG'  };
    if (t.match(/\.pdf/) || t.includes('pdf'))                                     return { icon: FileText,color: 'text-rose-500',    bg: 'bg-rose-50',     badge: 'PDF'  };
    if (t.match(/\.(zip|rar|7z|tar|gz)/) || t.includes('zip'))                   return { icon: Archive, color: 'text-amber-500',   bg: 'bg-amber-50',    badge: 'ZIP'  };
    if (t.match(/\.(mp4|mov|avi|webm)/) || t.startsWith('video/'))               return { icon: Video,   color: 'text-purple-500',  bg: 'bg-purple-50',   badge: 'VID'  };
    return { icon: File, color: 'text-blue-500', bg: 'bg-blue-50', badge: 'FILE' };
};

const isImageFile = (fileType = '', url = '') => {
    const t = (fileType + url).toLowerCase();
    return t.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)/) || t.startsWith('image/');
};

const getLinkMeta = (url = '') => {
    const lower = url.toLowerCase();
    if (lower.includes('loom.com'))         return { label: 'Loom',         color: 'bg-violet-100 text-violet-700', icon: Video  };
    if (lower.includes('drive.google.com')) return { label: 'Google Drive',  color: 'bg-blue-100 text-blue-700',    icon: Globe  };
    if (lower.includes('figma.com'))        return { label: 'Figma',         color: 'bg-pink-100 text-pink-700',    icon: Globe  };
    if (lower.includes('github.com'))       return { label: 'GitHub',        color: 'bg-slate-100 text-slate-700',  icon: Globe  };
    if (lower.includes('notion.so'))        return { label: 'Notion',        color: 'bg-slate-100 text-slate-800',  icon: Globe  };
    return { label: 'Link', color: 'bg-indigo-100 text-indigo-700', icon: Link2 };
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

// ─── Small reusable sub-components ───────────────────────────────────────────

const AttachmentCard = ({ file }) => {
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
        </div>
    );
};

const ScreenshotLinkCard = ({ url }) => {
    const meta = getLinkMeta(url);
    const Icon = meta.icon;
    const short = url.length > 50 ? url.substring(0, 50) + '…' : url;
    return (
        <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow-sm transition-all"
        >
            <div className={`w-8 h-8 rounded-lg ${meta.color.split(' ')[0]} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${meta.color.split(' ')[1]}`} />
            </div>
            <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${meta.color}`}>{meta.label}</span>
                <p className="text-xs text-slate-500 truncate mt-0.5">{short}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
        </a>
    );
};

const RestrictedCard = () => (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl p-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-400 italic">Content restricted by visibility policy</p>
    </div>
);

// ─── Upload Zone ──────────────────────────────────────────────────────────────
const UploadZone = ({ uploadedFiles, onUpload, onRemove, isUploading }) => {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFiles = useCallback(async (files) => {
        for (const file of Array.from(files)) {
            await onUpload(file);
        }
    }, [onUpload]);

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div className="space-y-3">
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    dragOver
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40'
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.mp4,.mov"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
                {isUploading ? (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                ) : (
                    <Upload className={`w-6 h-6 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
                )}
                <div className="text-center">
                    <p className={`text-sm font-semibold ${dragOver ? 'text-blue-600' : 'text-slate-600'}`}>
                        {isUploading ? 'Uploading…' : 'Drop files here or click to browse'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Images, PDFs, ZIPs, Videos — Max 10MB</p>
                </div>
            </div>

            {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                    {uploadedFiles.map((f, i) => {
                        const meta = getFileIcon(f.fileType, f.filename);
                        const Icon = meta.icon;
                        return (
                            <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                                <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-4 h-4 ${meta.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{f.filename}</p>
                                    <p className="text-[10px] text-slate-400">{f.fileType}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemove(i)}
                                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Screenshot Link Manager ──────────────────────────────────────────────────
const ScreenshotLinkManager = ({ links, onAdd, onRemove }) => {
    const [inputVal, setInputVal] = useState('');

    const handleAdd = () => {
        const v = inputVal.trim();
        if (!v) return;
        onAdd(v);
        setInputVal('');
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="url"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="https://loom.com/share/… or Drive link"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!inputVal.trim()}
                    className="shrink-0 px-3 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    Add
                </button>
            </div>

            {links.length > 0 && (
                <div className="space-y-2">
                    {links.map((url, i) => {
                        const meta = getLinkMeta(url);
                        const Icon = meta.icon;
                        return (
                            <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                                <div className={`w-6 h-6 rounded-md ${meta.color.split(' ')[0]} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-3.5 h-3.5 ${meta.color.split(' ')[1]}`} />
                                </div>
                                <span className="flex-1 text-xs text-slate-600 truncate">{url}</span>
                                <button
                                    type="button"
                                    onClick={() => onRemove(i)}
                                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Timeline Entry ───────────────────────────────────────────────────────────
const TimelineEntry = ({ entry, idx }) => {
    const [expanded, setExpanded] = useState(true);
    const isRestricted = entry.notes === '[Restricted Visibility]';
    const hasAttachments = Array.isArray(entry.attachments) && entry.attachments.length > 0;
    const hasLinks = Array.isArray(entry.screenshotLinks) && entry.screenshotLinks.length > 0;
    const hasLegacyAttachment = entry.attachment && entry.attachment !== '[Restricted Visibility]' && entry.attachment.startsWith('http');
    const hasContent = entry.notes || hasAttachments || hasLinks || hasLegacyAttachment;

    return (
        <div className={`relative rounded-2xl border transition-all ${
            isRestricted
                ? 'bg-slate-50 border-slate-200 border-dashed'
                : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'
        }`}>
            {/* Header */}
            <div className="flex items-start justify-between p-4 gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isRestricted ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                    }`}>
                        {isRestricted ? <Lock className="w-3.5 h-3.5" /> : (entry.changedBy?.name ? entry.changedBy.name.substring(0, 2).toUpperCase() : '??')}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Status badge row */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {entry.fromStatus && (
                                <span className="text-[10px] font-bold text-slate-400">{entry.fromStatus}</span>
                            )}
                            {entry.fromStatus && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                {entry.status}
                            </span>
                        </div>

                        {/* Who & when */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs font-semibold text-slate-700">
                                {isRestricted ? 'Restricted' : (entry.changedBy?.name || 'Unknown')}
                            </span>
                            {(entry.changedBy?.role || entry.changedBy?.designation) && !isRestricted && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                    {getUserDesignationLabel(entry.changedBy)}
                                </span>
                            )}
                            {entry.changedAt && (
                                <span className="text-[10px] text-slate-400">{formatDateTime(entry.changedAt)}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expand / collapse if has content */}
                {hasContent && !isRestricted && (
                    <button
                        onClick={() => setExpanded(p => !p)}
                        className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Restricted placeholder */}
            {isRestricted && (
                <div className="px-4 pb-4">
                    <RestrictedCard />
                </div>
            )}

            {/* Expandable content */}
            {!isRestricted && hasContent && expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
                    {/* Notes */}
                    {entry.notes && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" /> Notes
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                                {entry.notes}
                            </p>
                        </div>
                    )}

                    {/* Rich Attachments */}
                    {hasAttachments && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5" /> Attachments ({entry.attachments.length})
                            </p>
                            <div className="space-y-2">
                                {entry.attachments.map((f, fi) => (
                                    <AttachmentCard key={fi} file={f} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Legacy single attachment URL */}
                    {hasLegacyAttachment && !hasAttachments && (
                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5" /> Attachment
                            </p>
                            <ScreenshotLinkCard url={entry.attachment} />
                        </div>
                    )}

                    {/* Screenshot Links */}
                    {hasLinks && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5" /> Screenshot / Reference Links ({entry.screenshotLinks.length})
                            </p>
                            <div className="space-y-2">
                                {entry.screenshotLinks.map((url, li) => (
                                    <ScreenshotLinkCard key={li} url={url} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Indicator badges in header when collapsed */}
            {!isRestricted && hasContent && !expanded && (
                <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                    {entry.notes && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Note
                        </span>
                    )}
                    {hasAttachments && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> {entry.attachments.length} file{entry.attachments.length > 1 ? 's' : ''}
                        </span>
                    )}
                    {hasLinks && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> {entry.screenshotLinks.length} link{entry.screenshotLinks.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};


// ─── Main KanbanBoard ─────────────────────────────────────────────────────────
const KanbanBoard = ({ tasks, setTasks, searchQuery, loading, role }) => {
    const { can } = usePermission();
    const { user } = useAuth();

    // Drag state
    const dragTaskId   = useRef(null);
    const dragFromCol  = useRef(null);
    const [dragOverCol, setDragOverCol] = useState(null);

    // Search params for deep linking
    const [searchParams, setSearchParams] = useSearchParams();
    const initialProject = searchParams.get('project') || 'All';
    
    // Derived: true whenever the URL has a ?project= param (reactive to navigation)
    const isProjectSpecific = !!searchParams.get('project');

    const [isProjDropdownOpen, setIsProjDropdownOpen] = useState(false);

    // Status change modal
    const [pendingChange,    setPendingChange]    = useState(null);
    const [changeNotes,      setChangeNotes]      = useState('');
    const [uploadedFiles,    setUploadedFiles]    = useState([]);
    const [screenshotLinks,  setScreenshotLinks]  = useState([]);
    const [isUploading,      setIsUploading]      = useState(false);
    const [isSaving,         setIsSaving]         = useState(false);

    // Task detail sidebar
    const [selectedTask, setSelectedTask] = useState(null);
    const [closedTaskId, setClosedTaskId] = useState(null);

    const handleCloseDetails = () => {
        if (selectedTask) {
            setClosedTaskId(String(selectedTask._id || selectedTask.id));
        }
        setSelectedTask(null);
        if (searchParams.has('taskId')) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('taskId');
            setSearchParams(nextParams, { replace: true });
        }
    };

    // Edit Task State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTask,     setEditingTask]     = useState(null);
    const [isSavingEdit,    setIsSavingEdit]    = useState(false);
    const [projectMembers,  setProjectMembers]  = useState([]);
    const [editTaskData,    setEditTaskData]    = useState({
        taskName: '', description: '', priority: 'Medium', endDate: '', assignedTo: '', assignedQA: ''
    });

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete,      setTaskToDelete]      = useState(null);
    const [isDeleting,        setIsDeleting]        = useState(false);

    // ─── File Upload Handler ───────────────────────────────────────────────────
    const handleFileUpload = useCallback(async (file) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await taskService.uploadAttachment(formData);
            if (res.data.success) {
                setUploadedFiles(prev => [...prev, res.data.file]);
            } else {
                toast.error('Upload failed');
            }
        } catch (err) {
            toast.error('Failed to upload file');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    }, []);

    const removeUploadedFile = (idx) => setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
    const addScreenshotLink  = (url) => setScreenshotLinks(prev => [...prev, url]);
    const removeScreenshotLink = (idx) => setScreenshotLinks(prev => prev.filter((_, i) => i !== idx));

    // ─── Drag Handlers ────────────────────────────────────────────────────────
    const onDragStart = (e, taskId, colId) => {
        if (!can('tasks.update')) {
            e.preventDefault();
            toast.error('You do not have permission to update tasks');
            return;
        }
        if ((role === 'developer' || role === 'employee') && ['QA Review', 'Completed', 'Done'].includes(colId)) {
            e.preventDefault();
            toast.error(`Tasks in ${colId} are locked for Employees`);
            return;
        }
        if (role === 'qa' && colId !== 'QA Review') {
            e.preventDefault();
            toast.error('QAs can only move tasks from QA Review');
            return;
        }
        dragTaskId.current  = taskId;
        dragFromCol.current = colId;
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver  = (e, colId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(colId); };
    const onDragLeave = ()          => setDragOverCol(null);

    const onDrop = (e, targetColId) => {
        e.preventDefault();
        setDragOverCol(null);
        if (!dragTaskId.current || dragFromCol.current === targetColId) return;
        if (!can('tasks.update')) { toast.error('You do not have permission to update tasks'); return; }
        if ((role === 'developer' || role === 'employee') && !['In Progress', 'QA Review'].includes(targetColId)) {
            toast.error('Employees can only move tasks to In Progress or QA Review'); return;
        }
        if (role === 'qa' && !['Completed', 'In Progress'].includes(targetColId)) {
            toast.error('QAs can only move tasks to Completed or In Progress (Reject)'); return;
        }
        setPendingChange({ taskId: dragTaskId.current, fromStatus: dragFromCol.current, toStatus: targetColId });
        setChangeNotes('');
        setUploadedFiles([]);
        setScreenshotLinks([]);
        dragTaskId.current  = null;
        dragFromCol.current = null;
    };

    // ─── Confirm Status Change ────────────────────────────────────────────────
    const confirmStatusChange = async () => {
        if (!pendingChange) return;
        setIsSaving(true);
        try {
            await taskService.updateTaskStatus(
                pendingChange.taskId,
                pendingChange.toStatus,
                changeNotes,
                uploadedFiles,
                screenshotLinks
            );

            const newHistoryEntry = {
                fromStatus:     pendingChange.fromStatus,
                status:         pendingChange.toStatus,
                notes:          changeNotes,
                attachments:    uploadedFiles,
                screenshotLinks,
                changedAt:      new Date().toISOString()
            };

            const patchTask = (t) => {
                const id = t._id || t.id;
                if (id !== pendingChange.taskId) return t;
                return {
                    ...t,
                    status:      pendingChange.toStatus,
                    statusHistory: [...(t.statusHistory || []), newHistoryEntry],
                    attachments:   [...(t.attachments || []), ...uploadedFiles],
                    screenshotLinks: [...(t.screenshotLinks || []), ...screenshotLinks]
                };
            };

            setTasks(prev => prev.map(patchTask));
            if (selectedTask && (selectedTask._id || selectedTask.id) === pendingChange.taskId) {
                setSelectedTask(prev => patchTask(prev));
            }
            toast.success(`Task moved to "${pendingChange.toStatus}"`);
        } catch (err) {
            toast.error('Failed to update task status');
        } finally {
            setIsSaving(false);
            setPendingChange(null);
            setChangeNotes('');
            setUploadedFiles([]);
            setScreenshotLinks([]);
        }
    };

    const cancelStatusChange = () => {
        setPendingChange(null);
        setChangeNotes('');
        setUploadedFiles([]);
        setScreenshotLinks([]);
    };

    // ─── Edit Task ────────────────────────────────────────────────────────────
    const handleEditTask = async (task, e) => {
        if (e) e.stopPropagation();
        setEditingTask(task);
        const assignedToId = task.assignedTo ? (typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo) : '';
        const assignedQAId = task.assignedQA ? (typeof task.assignedQA === 'object' ? task.assignedQA._id : task.assignedQA) : '';
        setEditTaskData({
            taskName:    getTaskName(task),
            description: task.description || '',
            priority:    task.priority || 'Medium',
            endDate:     task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
            startDate:   task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            assignedTo:  assignedToId,
            assignedQA:  assignedQAId,
            attachments: task.attachments || []
        });
        setIsEditModalOpen(true);
        setProjectMembers([]);
        const projectId = task.project ? (typeof task.project === 'object' ? task.project._id : task.project) : null;
        if (projectId) {
            try {
                const res = await projectService.getProjectById(projectId);
                if (res.data.success && res.data.project) setProjectMembers(res.data.project.teamMembers || []);
            } catch (err) { console.error('Failed to load project members', err); }
        }
    };

    const handleUpdateTask = async (e) => {
        e.preventDefault();
        if (!editingTask) return;
        setIsSavingEdit(true);
        try {
            const res = await taskService.updateTask(getTaskId(editingTask), editTaskData);
            setTasks(prev => prev.map(t => (t._id || t.id) === (editingTask._id || editingTask.id) ? res.data.task : t));
            toast.success('Task updated successfully');
            setIsEditModalOpen(false);
            setEditingTask(null);
        } catch (err) {
            toast.error('Failed to update task');
        } finally {
            setIsSavingEdit(false);
        }
    };

    // ─── Delete Task ──────────────────────────────────────────────────────────
    const handleDeleteTask = (taskId, e) => { if (e) e.stopPropagation(); setTaskToDelete(taskId); setIsDeleteModalOpen(true); };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        setIsDeleting(true);
        try {
            await taskService.deleteTask(taskToDelete);
            setTasks(prev => prev.filter(t => (t._id || t.id) !== taskToDelete));
            toast.success('Task moved to trash');
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
        } catch (err) {
            toast.error('Failed to delete task');
        } finally {
            setIsDeleting(false);
        }
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const getTaskName  = t => String(t.taskName || t.title || '');
    const getTaskId    = t => String(t._id || t.id || '');
    const getProject   = t => {
        if (!t.project) return 'Unassigned';
        if (typeof t.project === 'string') return t.project;
        return String(t.project.projectName || t.project.name || 'Unassigned');
    };
    const getAssignee  = t => {
        if (!t.assignedTo) return String(t.assignee || 'Unassigned');
        if (typeof t.assignedTo === 'string') return t.assignedTo;
        return String(t.assignedTo.name || 'Unassigned');
    };
    const getAssigneeInitial = t => getAssignee(t).substring(0, 2).toUpperCase();
    const getAssigneePic     = t => (!t.assignedTo || typeof t.assignedTo === 'string') ? null : t.assignedTo.profilePic;
    const getStartDate = t => {
        if (!t.startDate) return 'N/A';
        try { return new Date(t.startDate).toLocaleDateString(); } catch { return 'N/A'; }
    };
    const getEndDate   = t => {
        if (!t.endDate) return 'N/A';
        try { return new Date(t.endDate).toLocaleDateString(); } catch { return 'N/A'; }
    };
    const isOverdue    = t => {
        if (!t.endDate || ['Completed', 'Done'].includes(t.status)) return false;
        try {
            const end = new Date(t.endDate);
            end.setHours(23, 59, 59, 999);
            return end < new Date();
        } catch {
            return false;
        }
    };
    const getHistory   = t => Array.isArray(t.statusHistory) ? t.statusHistory : [];

    // Count meaningful history entries (with notes, attachments, or links)
    const countRichHistory = t => getHistory(t).filter(h =>
        h.notes || (Array.isArray(h.attachments) && h.attachments.length > 0) ||
        (Array.isArray(h.screenshotLinks) && h.screenshotLinks.length > 0) ||
        h.attachment
    ).length;

    // Filter tasks based on hierarchy and access control
    const accessibleTasks = React.useMemo(() => {
        if (!user) return [];
        
        // Admin has access to everything
        if (user.role === 'admin') {
            return tasks || [];
        }
        
        // Team Lead has access to projects they lead or are member of
        if (user.role === 'TL') {
            return (tasks || []).filter(t => {
                if (!t.project || typeof t.project !== 'object') return false;
                const leadId = t.project.teamLead?._id || t.project.teamLead;
                const isLead = leadId === user._id;
                const isMember = t.project.teamMembers?.some(m => (m._id || m) === user._id);
                return isLead || isMember;
            });
        }
        
        // Employee/developer has access only to their assigned tasks
        if (user.role === 'employee' || user.role === 'developer') {
            return (tasks || []).filter(t => {
                const assigneeId = t.assignedTo?._id || t.assignedTo;
                return assigneeId === user._id;
            });
        }
        
        // QA has access only to assigned QA tasks or tasks in QA Review status
        if (user.role === 'qa') {
            return (tasks || []).filter(t => {
                const qaId = t.assignedQA?._id || t.assignedQA;
                const assigneeId = t.assignedTo?._id || t.assignedTo;
                const isQA = qaId === user._id || assigneeId === user._id;
                const isQAReviewStatus = t.status === 'QA Review';
                return isQA || isQAReviewStatus;
            });
        }
        
        return [];
    }, [tasks, user]);

    // Project filter options based on accessible tasks
    const projectOptions = React.useMemo(() => {
        const seen = new Set(); const opts = [];
        (accessibleTasks || []).forEach(t => {
            const name = getProject(t);
            if (name && name !== 'Unassigned' && !seen.has(name)) { seen.add(name); opts.push(name); }
        });
        return opts.sort();
    }, [accessibleTasks]);

    const [projectFilter, setProjectFilter] = useState(initialProject);

    useEffect(() => {
        const urlProject = searchParams.get('project') || 'All';
        if (urlProject !== projectFilter) {
            const nextParams = new URLSearchParams(searchParams);
            if (projectFilter === 'All') nextParams.delete('project');
            else nextParams.set('project', projectFilter);
            setSearchParams(nextParams, { replace: true });
        }
    }, [projectFilter, searchParams]);

    useEffect(() => {
        const urlProject = searchParams.get('project') || 'All';
        if (urlProject !== projectFilter) setProjectFilter(urlProject);
    }, [searchParams]);

    useEffect(() => {
        const taskIdParam = searchParams.get('taskId');
        if (taskIdParam && accessibleTasks && accessibleTasks.length > 0) {
            if (taskIdParam === closedTaskId) {
                return;
            }
            const taskToSelect = accessibleTasks.find(t => String(t._id || t.id) === taskIdParam);
            if (taskToSelect) {
                const taskProj = String(taskToSelect.project?.projectName || taskToSelect.project?.name || taskToSelect.project || '');
                if (taskProj && taskProj !== 'All' && projectFilter !== taskProj) {
                    setProjectFilter(taskProj);
                }
                setSelectedTask(taskToSelect);
            }
        } else if (!taskIdParam) {
            setClosedTaskId(null);
        }
    }, [searchParams, accessibleTasks, projectFilter, closedTaskId]);

    const filteredTasks = (accessibleTasks || []).filter(t => {
        const matchesSearch  = !searchQuery || (
            getTaskName(t).toLowerCase().includes(searchQuery.toLowerCase()) ||
            getProject(t).toLowerCase().includes(searchQuery.toLowerCase())
        );
        const matchesProject = projectFilter === 'All' || getProject(t) === projectFilter;
        return matchesSearch && matchesProject;
    });

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* Project Filter Header / Dropdown Selector */}
            {!loading && (
                <div className="mb-4 shrink-0">
                    {isProjectSpecific ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md">Project Board</span>
                            <span className="text-slate-300 font-light select-none">/</span>
                            <span className="text-xs font-semibold text-slate-700 bg-indigo-50/70 border border-indigo-100/50 px-2.5 py-0.5 rounded-lg shadow-sm">
                                {projectFilter}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400 mr-0.5">Project</span>
                            <div className="relative">
                                <button
                                    onClick={() => setIsProjDropdownOpen(!isProjDropdownOpen)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <span>{projectFilter === 'All' ? 'All Projects' : projectFilter}</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                                {isProjDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsProjDropdownOpen(false)} />
                                        <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3.5 py-1.5 border-b border-slate-50">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Switch Project</p>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                <button
                                                    onClick={() => { setProjectFilter('All'); setIsProjDropdownOpen(false); }}
                                                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-slate-50 flex items-center justify-between ${projectFilter === 'All' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}
                                                >
                                                    All Projects
                                                    {projectFilter === 'All' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                                                </button>
                                                {projectOptions.map(proj => (
                                                    <button
                                                        key={proj}
                                                        onClick={() => { setProjectFilter(proj); setIsProjDropdownOpen(false); }}
                                                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-slate-50 flex items-center justify-between ${projectFilter === proj ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}
                                                    >
                                                        {proj}
                                                        {projectFilter === proj && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Kanban Board */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="w-full overflow-x-auto overflow-y-hidden pb-4 kanban-scrollbar">
                    <div className="flex gap-4 min-h-[550px] min-w-max px-2 items-stretch">
                        {COLUMNS.map(col => {
                            const colTasks = filteredTasks.filter(t => t.status === col.id);
                            const isOver   = dragOverCol === col.id;
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
                                    </div>

                                    {/* Drop zone hint */}
                                    {isOver && (
                                        <div className="mx-3 mb-2 h-16 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center text-xs font-bold text-blue-500 bg-blue-50/50">
                                            Drop here → {col.title}
                                        </div>
                                    )}

                                    {/* Tasks List */}
                                    <div className="flex-1 px-3 pb-3 space-y-3">
                                        {colTasks.map(task => {
                                            const overdue  = isOverdue(task);
                                            const hist     = getHistory(task);
                                            const richCount = countRichHistory(task);
                                            const isLocked = (role === 'developer' || role === 'employee') && ['QA Review', 'Completed', 'Done'].includes(col.id);
                                            const cardStyle = getCardStyle(task.status, overdue);
                                            return (
                                                <div
                                                    key={getTaskId(task)}
                                                    draggable={!isLocked}
                                                    onDragStart={e => onDragStart(e, getTaskId(task), col.id)}
                                                    onClick={() => setSelectedTask(task)}
                                                    className={`p-4 rounded-xl shadow-sm border transition-all group select-none ${cardStyle.bgBorder} ${isLocked ? 'cursor-default opacity-90' : 'cursor-grab active:cursor-grabbing'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-2.5">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setProjectFilter(getProject(task)); }}
                                                            className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 truncate max-w-[45%] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer"
                                                        >{getProject(task)}</button>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {overdue ? (
                                                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 flex items-center gap-1 border border-rose-200 shrink-0 animate-pulse" title="Overdue">
                                                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                                                    Overdue
                                                                </span>
                                                            ) : (
                                                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border whitespace-nowrap flex items-center gap-1.5 ${cardStyle.badge}`}>
                                                                    <div className={`w-1 h-1 rounded-full ${cardStyle.dot}`} />
                                                                    {task.status}
                                                                </span>
                                                            )}
                                                            {isLocked && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 flex items-center border border-slate-200">
                                                                    <Lock className="w-3 h-3" />
                                                                </span>
                                                            )}
                                                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${
                                                                task.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                task.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                task.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                'bg-slate-50 text-slate-500 border-slate-200'
                                                            }`}>
                                                                {task.priority || 'Medium'}
                                                            </span>
                                                            {can('tasks.update') && (
                                                                <button onClick={(e) => handleEditTask(task, e)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Edit Task">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                                </button>
                                                            )}
                                                            {can('tasks.delete') && (
                                                                <button onClick={(e) => handleDeleteTask(getTaskId(task), e)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" title="Delete Task">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors leading-snug text-sm">
                                                        {getTaskName(task)}
                                                    </h4>

                                                    <div className="flex flex-col gap-1 my-2.5 bg-slate-50/40 p-2 rounded-lg border border-slate-100/30 text-[10px] font-medium text-slate-500">
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-1 text-[9px] text-slate-400">
                                                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                                                Start:
                                                            </span>
                                                            <span className="text-slate-700 font-semibold">{getStartDate(task)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-1 text-[9px] text-slate-400">
                                                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                                                Due:
                                                            </span>
                                                            <span className={`font-semibold ${overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{getEndDate(task)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex -space-x-2">
                                                                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-white overflow-hidden" title={`Developer: ${getAssignee(task)}`}>
                                                                    {getAssigneePic(task) ? <img src={getAssigneePic(task)} alt={getAssignee(task)} className="w-full h-full object-cover" /> : getAssigneeInitial(task)}
                                                                </div>
                                                                {task.assignedQA && (
                                                                    <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-white overflow-hidden" title={`QA: ${task.assignedQA.name || 'Unassigned'}`}>
                                                                        {task.assignedQA.profilePic ? <img src={task.assignedQA.profilePic} alt={task.assignedQA.name} className="w-full h-full object-cover" /> : (task.assignedQA.name || 'QA').substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[11px] font-bold text-slate-700 truncate max-w-[100px]">{getAssignee(task)}</span>
                                                                {task.assignedQA && <span className="text-[9px] font-medium text-slate-400 truncate">QA: {task.assignedQA.name || 'Assigned'}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            {richCount > 0 && (
                                                                <div className="flex items-center text-[10px] font-bold gap-1 text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md" title="Has notes / attachments">
                                                                    <MessageSquare className="w-3 h-3" />
                                                                    <span>{richCount}</span>
                                                                </div>
                                                            )}
                                                            {/* Show attachment indicator */}
                                                            {(Array.isArray(task.attachments) && task.attachments.length > 0) && (
                                                                <div className="flex items-center text-[10px] font-bold gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md" title="Has file attachments">
                                                                    <Paperclip className="w-3 h-3" />
                                                                    <span>{task.attachments.length}</span>
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

            {/* ─── Status Change Modal ───────────────────────────────────────── */}
            {pendingChange && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.15s_ease-out] flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
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
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-slate-400" />
                                    Notes / Comments <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={changeNotes}
                                    onChange={e => setChangeNotes(e.target.value)}
                                    placeholder="Describe what changed, blockers resolved, or testing steps…"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none placeholder-slate-400"
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-slate-400" />
                                    Attach Files <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <UploadZone
                                    uploadedFiles={uploadedFiles}
                                    onUpload={handleFileUpload}
                                    onRemove={removeUploadedFile}
                                    isUploading={isUploading}
                                />
                            </div>

                            {/* Screenshot Links */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-slate-400" />
                                    Screenshot / Reference Links <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <ScreenshotLinkManager
                                    links={screenshotLinks}
                                    onAdd={addScreenshotLink}
                                    onRemove={removeScreenshotLink}
                                />
                            </div>
                        </div>

                        {/* Summary badges */}
                        {(uploadedFiles.length > 0 || screenshotLinks.length > 0) && (
                            <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-3 flex-wrap text-xs font-bold">
                                <span className="text-slate-400">Attaching:</span>
                                {uploadedFiles.length > 0 && (
                                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                        <Paperclip className="w-3 h-3" /> {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}
                                    </span>
                                )}
                                {screenshotLinks.length > 0 && (
                                    <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                        <Link2 className="w-3 h-3" /> {screenshotLinks.length} link{screenshotLinks.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3 shrink-0">
                            <button onClick={cancelStatusChange} className="flex-1 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={confirmStatusChange}
                                disabled={isSaving || isUploading}
                                className="flex-1 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save & Move'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ─── Task Detail Sidebar ───────────────────────────────────────── */}
            {selectedTask && (
                <div className="absolute inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={handleCloseDetails} />
                    <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
                        {/* Drawer Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${PRIORITY_COLORS[selectedTask.priority] || PRIORITY_COLORS['Medium']}`}>
                                    {selectedTask.priority || 'Medium'} Priority
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                    {getProject(selectedTask)}
                                </span>
                            </div>
                            <button onClick={handleCloseDetails} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">{getTaskName(selectedTask)}</h2>

                            {/* Meta grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Status',      value: selectedTask.status,                  cls: 'text-indigo-650 font-extrabold' },
                                    { label: 'Priority',    value: selectedTask.priority || 'Medium',    cls: selectedTask.priority === 'Critical' ? 'text-rose-600 font-extrabold' : 'text-slate-700 font-bold' },
                                    { label: 'Start Date',  value: getStartDate(selectedTask),           cls: 'text-slate-700 font-semibold' },
                                    { label: 'Due Date',    value: getEndDate(selectedTask),             cls: isOverdue(selectedTask) ? 'text-rose-600 font-extrabold' : 'text-slate-700 font-semibold' },
                                ].map(item => (
                                    <div key={item.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 mb-1">{item.label}</p>
                                        <p className={`text-sm ${item.cls}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Assigned Employees & Roles */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned Employees</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-blue-200">
                                            {getAssigneePic(selectedTask) ? <img src={getAssigneePic(selectedTask)} alt="" className="w-full h-full object-cover" /> : getAssigneeInitial(selectedTask)}
                                        </div>
                                        <div className="min-w-0 leading-tight">
                                            <p className="text-xs font-bold text-slate-700 truncate">{getAssignee(selectedTask)}</p>
                                            <p className="text-[10px] font-semibold text-slate-400">Developer</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-indigo-200">
                                            {selectedTask.assignedQA?.profilePic ? <img src={selectedTask.assignedQA.profilePic} alt="" className="w-full h-full object-cover" /> : (selectedTask.assignedQA?.name ? selectedTask.assignedQA.name.substring(0, 2).toUpperCase() : 'QA')}
                                        </div>
                                        <div className="min-w-0 leading-tight">
                                            <p className="text-xs font-bold text-slate-700 truncate">{selectedTask.assignedQA?.name || 'Unassigned'}</p>
                                            <p className="text-[10px] font-semibold text-slate-400">QA Engineer</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {selectedTask.description && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" /> Description
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {selectedTask.description}
                                    </p>
                                </div>
                            )}

                            {/* Top-Level Attachments & Links */}
                            {(Array.isArray(selectedTask.attachments) && selectedTask.attachments.length > 0) && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <Paperclip className="w-4 h-4 text-emerald-500" /> All Task Attachments
                                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">{selectedTask.attachments.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedTask.attachments.map((f, i) => <AttachmentCard key={i} file={f} />)}
                                    </div>
                                </div>
                            )}

                            {(Array.isArray(selectedTask.screenshotLinks) && selectedTask.screenshotLinks.length > 0) && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <Link2 className="w-4 h-4 text-indigo-500" /> Reference Links
                                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{selectedTask.screenshotLinks.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedTask.screenshotLinks.map((url, i) => <ScreenshotLinkCard key={i} url={url} />)}
                                    </div>
                                </div>
                            )}

                            {/* Activity Feed Timeline */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <History className="w-4 h-4 text-indigo-500" />
                                    Activity Timeline
                                    {getHistory(selectedTask).length > 0 && (
                                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                                            {getHistory(selectedTask).length}
                                        </span>
                                    )}
                                </h3>

                                {getHistory(selectedTask).length === 0 ? (
                                    <div className="text-center py-8">
                                        <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm text-slate-400">No activity yet.</p>
                                        <p className="text-xs text-slate-400 mt-1">Drag a task to a new column to log an update.</p>
                                    </div>
                                ) : (
                                    <div className="relative space-y-3">
                                        {/* Vertical line */}
                                        <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-200" aria-hidden />
                                        <div className="space-y-3 pl-0">
                                            {getHistory(selectedTask).slice().reverse().map((entry, idx) => (
                                                <TimelineEntry key={idx} entry={entry} idx={idx} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                            <button
                                onClick={handleCloseDetails}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                            >Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Edit Task Modal ───────────────────────────────────────────── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <div className="text-blue-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </div>
                                Edit Task
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateTask}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Task Name</label>
                                    <input type="text" required value={editTaskData.taskName} onChange={e => setEditTaskData({...editTaskData, taskName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                                    <textarea rows={3} value={editTaskData.description} onChange={e => setEditTaskData({...editTaskData, description: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Assignee</label>
                                        <select value={editTaskData.assignedTo} onChange={e => setEditTaskData({...editTaskData, assignedTo: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 transition-all outline-none cursor-pointer">
                                            <option value="">Unassigned</option>
                                            {projectMembers.filter(m => m.status !== "inactive" && !isUserTL(m) && !isUserQA(m) && !isUserAdmin(m)).map(u => <option key={u._id} value={u._id}>{getUserLabel(u)}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Assigned QA</label>
                                        <select value={editTaskData.assignedQA} onChange={e => setEditTaskData({...editTaskData, assignedQA: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 transition-all outline-none cursor-pointer">
                                            <option value="">Unassigned</option>
                                            {projectMembers.filter(m => m.status !== "inactive" && isUserQA(m)).map(u => <option key={u._id} value={u._id}>{getUserLabel(u)}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority</label>
                                        <select value={editTaskData.priority} onChange={e => setEditTaskData({...editTaskData, priority: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-blue-500 transition-all outline-none cursor-pointer">
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Date</label>
                                        <input type="date" value={editTaskData.startDate} onChange={e => setEditTaskData({...editTaskData, startDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-blue-500 transition-all outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Due Date</label>
                                        <input type="date" value={editTaskData.endDate} onChange={e => setEditTaskData({...editTaskData, endDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-blue-500 transition-all outline-none" />
                                    </div>
                                </div>

                                {/* Attachments uploads */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                                        <Paperclip className="w-4 h-4 text-slate-400" />
                                        Attachments <span className="text-slate-400 font-normal text-xs">(optional)</span>
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        id="edit-task-attachments-input"
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files);
                                            if (files.length === 0) return;
                                            toast.loading("Uploading attachment...");
                                            try {
                                                const uploadedList = [...(editTaskData.attachments || [])];
                                                for (let file of files) {
                                                    const formData = new FormData();
                                                    formData.append("file", file);
                                                    const res = await taskService.uploadAttachment(formData);
                                                    if (res.data.success) {
                                                        uploadedList.push(res.data.file);
                                                    }
                                                }
                                                setEditTaskData(prev => ({ ...prev, attachments: uploadedList }));
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
                                        onClick={() => document.getElementById("edit-task-attachments-input")?.click()}
                                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 border-dashed rounded-xl text-xs font-bold text-slate-600 transition flex items-center justify-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Files
                                    </button>

                                    {/* Uploaded previews */}
                                    {Array.isArray(editTaskData.attachments) && editTaskData.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {editTaskData.attachments.map((f, fIdx) => (
                                                <div key={fIdx} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-700 font-bold animate-in zoom-in-95 duration-100">
                                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="max-w-[120px] truncate">{f.filename}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditTaskData(prev => ({
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
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSavingEdit} className="flex-1 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSavingEdit ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation Modal ─────────────────────────────────── */}
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
                                This task will be moved to the <span className="font-bold text-slate-700">Trash</span>. You can restore it within <span className="text-blue-600 font-bold">30 days</span> before it is permanently deleted.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={confirmDeleteTask} disabled={isDeleting} className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Moving…</> : 'Move to Trash'}
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
