import React from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting = false, title = "Delete Item", message = "Are you sure you want to delete this item? This action cannot be undone." }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={isDeleting ? null : onClose} 
            />

            {/* Modal Box */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col relative z-10 animate-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between bg-rose-50/30 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                            <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
                        </div>
                        <h3 className="text-sm font-black text-slate-800">{title}</h3>
                    </div>
                    {!isDeleting && (
                        <button 
                            onClick={onClose} 
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-5 text-left shrink-0">
                    <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50 flex justify-end gap-2.5 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
