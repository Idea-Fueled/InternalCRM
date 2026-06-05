import React, { useState, useRef, useEffect } from 'react';
import { FileText, Paperclip, ExternalLink, Download, X, Eye, ShieldAlert, Loader2 } from 'lucide-react';

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

export const getFileIcon = (fileType = '', filename = '') => {
    const t = (fileType + filename).toLowerCase();
    if (t.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)/) || t.startsWith('image/')) {
        return { icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50', badge: 'IMG' };
    }
    if (t.match(/\.pdf/) || t.includes('pdf')) {
        return { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50', badge: 'PDF' };
    }
    if (t.match(/\.(zip|rar|7z|tar|gz)/) || t.includes('zip')) {
        return { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50', badge: 'ZIP' };
    }
    if (t.match(/\.(doc|docx)/)) {
        return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', badge: 'DOC' };
    }
    return { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-50', badge: 'FILE' };
};

export const isImageFile = (fileType = '', url = '') => {
    const t = (fileType + url).toLowerCase();
    return t.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)/) || t.startsWith('image/');
};

export const isPdfFile = (fileType = '', url = '') => {
    const t = (fileType + url).toLowerCase();
    return t.match(/\.pdf/) || t.includes('application/pdf');
};

export const isPreviewSupported = (fileType = '', url = '') => {
    return isImageFile(fileType, url) || isPdfFile(fileType, url);
};

export const formatAttachmentDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return 'N/A';
    }
};

// ─── FILE PREVIEW MODAL ──────────────────────────────────────────────────────

export const FilePreviewModal = ({ isOpen, onClose, file }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
        }
    }, [isOpen, file]);

    if (!isOpen || !file) return null;

    const isImg = isImageFile(file.fileType, file.url || file.path);
    const isPdf = isPdfFile(file.fileType, file.url || file.path);
    const fileUrl = file.url || file.path;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-slate-800 truncate" title={file.filename}>
                                {file.filename}
                            </h3>
                            {file.fileSize && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                    Size: {file.fileSize} • Type: {file.fileType || 'Unknown'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={fileUrl}
                            download={file.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 transition shadow-xs flex items-center gap-1 text-xs font-bold uppercase tracking-wider cursor-pointer border-none mr-2"
                        >
                            <Download className="w-4 h-4" /> Download
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-none"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 bg-slate-950 flex items-center justify-center p-6 min-h-[300px] overflow-auto relative">
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white z-10">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                            <p className="text-xs font-medium text-slate-400">Loading preview...</p>
                        </div>
                    )}

                    {isImg && (
                        <img
                            src={fileUrl}
                            alt={file.filename}
                            className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                            onLoad={() => setLoading(false)}
                            onError={() => setLoading(false)}
                        />
                    )}

                    {isPdf && (
                        <iframe
                            src={`${fileUrl}#toolbar=0`}
                            title={file.filename}
                            className="w-full h-[65vh] border-0 rounded-lg shadow-lg bg-white"
                            onLoad={() => setLoading(false)}
                        />
                    )}

                    {!isImg && !isPdf && (
                        <div className="text-center text-white p-8">
                            <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                            <p className="text-sm font-bold">Preview not supported for this file type.</p>
                            <p className="text-xs text-slate-400 mt-1 mb-4">Please download the file to view it.</p>
                            <a
                                href={fileUrl}
                                download={file.filename}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Download className="w-4 h-4" /> Download File
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── HOVER POPOVER / TOOLTIP COMPONENT ───────────────────────────────────────

export const FileAttachmentBadge = ({ attachments = [], legacyUrl = null, onPreview }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState({});
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const timeoutRef = useRef(null);

    // Normalize attachments
    let fileList = [];
    if (attachments && attachments.length > 0) {
        fileList = attachments;
    } else if (legacyUrl) {
        fileList = [{
            url: legacyUrl,
            filename: legacyUrl.split('/').pop() || 'attachment',
            fileType: legacyUrl.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i) ? 'image/png' : 'application/octet-stream',
            createdAt: new Date()
        }];
    }

    const showPopover = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        // Calculate popover positioning to prevent off-screen overflow
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceRight = window.innerWidth - rect.right;
            const spaceBottom = window.innerHeight - rect.bottom;
            
            let top = rect.bottom + window.scrollY + 6;
            let left = rect.left + window.scrollX;
            let width = 290; // Popover min-width

            // Align to right if space on right is small
            if (spaceRight < width) {
                left = window.innerWidth - width - 16;
            }
            // Flip to top if space on bottom is small
            let placement = 'bottom';
            if (spaceBottom < 180) {
                top = rect.top + window.scrollY - 10;
                placement = 'top';
            }

            setTooltipStyle({
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                zIndex: 999,
                transform: placement === 'top' ? 'translateY(-100%)' : 'none'
            });
        }
        setIsOpen(true);
    };

    const hidePopover = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 150);
    };

    const handleFileClick = (file, e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(false);
        
        if (isPreviewSupported(file.fileType, file.url || file.path)) {
            onPreview(file);
        } else {
            // Trigger direct download / open
            window.open(file.url || file.path, '_blank', 'noopener,noreferrer');
        }
    };

    if (fileList.length === 0) {
        return <span className="text-slate-350 font-bold">-</span>;
    }

    const firstFile = fileList[0];
    const isMulti = fileList.length > 1;

    return (
        <div className="relative inline-block" onMouseLeave={hidePopover}>
            <span
                ref={triggerRef}
                onMouseEnter={showPopover}
                onClick={(e) => handleFileClick(firstFile, e)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold text-xs rounded-lg cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors whitespace-nowrap overflow-hidden max-w-full"
            >
                <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate max-w-[90px]">
                    {isMulti ? `${fileList.length} Files` : firstFile.filename}
                </span>
            </span>

            {/* Portal / Hover Popover */}
            {isOpen && (
                <div
                    ref={popoverRef}
                    onMouseEnter={showPopover}
                    onMouseLeave={hidePopover}
                    style={tooltipStyle}
                    className="w-[290px] bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3 shadow-2xl border border-white/10 select-none animate-in fade-in slide-in-from-top-2 duration-100"
                >
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 border-b border-white/10 pb-1.5">
                        {isMulti ? `File Attachments (${fileList.length})` : 'File Attachment Details'}
                    </p>
                    
                    <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                        {fileList.map((file, idx) => {
                            const iconMeta = getFileIcon(file.fileType, file.filename);
                            const Icon = iconMeta.icon;
                            const uploaderName = file.uploadedBy?.name || 'System';
                            const formattedDate = formatAttachmentDate(file.createdAt);
                            const isPrev = isPreviewSupported(file.fileType, file.url || file.path);

                            return (
                                <div
                                    key={idx}
                                    onClick={(e) => handleFileClick(file, e)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/15 cursor-pointer border border-white/5 transition-all text-left flex items-start gap-2.5 group/item"
                                >
                                    <div className={`p-1.5 rounded bg-white/10 ${iconMeta.color} shrink-0`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0 leading-tight">
                                        <p className="text-xs font-bold text-white group-hover/item:text-blue-400 truncate pr-4 relative">
                                            {file.filename}
                                            {isPrev ? (
                                                <Eye className="w-3.5 h-3.5 absolute right-0 top-0.5 text-white/40 group-hover/item:text-blue-400" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5 absolute right-0 top-0.5 text-white/40 group-hover/item:text-blue-400" />
                                            )}
                                        </p>
                                        <p className="text-[9px] text-white/40 font-semibold mt-1">
                                            Uploaded by: <span className="text-white/70">{uploaderName}</span>
                                        </p>
                                        <p className="text-[9px] text-white/40 font-semibold mt-0.5">
                                            Uploaded on: <span className="text-white/70">{formattedDate}</span>
                                        </p>
                                        {file.fileSize && (
                                            <p className="text-[9px] text-white/30 font-medium mt-0.5">
                                                Size: {file.fileSize}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
