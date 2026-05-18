import React from 'react';
import { X, User, Briefcase, CheckSquare, Clock, AlertTriangle } from 'lucide-react';

const StatDetailModal = ({ isOpen, onClose, title, data, type }) => {
    if (!isOpen) return null;

    const renderIcon = () => {
        if (title.toLowerCase().includes('employee')) return <User className="w-5 h-5 text-blue-600" />;
        if (title.toLowerCase().includes('project')) return <Briefcase className="w-5 h-5 text-indigo-600" />;
        if (title.toLowerCase().includes('overdue')) return <AlertTriangle className="w-5 h-5 text-rose-600" />;
        if (title.toLowerCase().includes('qa')) return <Clock className="w-5 h-5 text-amber-600" />;
        return <CheckSquare className="w-5 h-5 text-emerald-600" />;
    };

    const renderItem = (item, index) => {
        if (type === 'employee') {
            return (
                <div key={item._id || index} className="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 uppercase text-xs overflow-hidden">
                            {item.profilePic ? <img src={item.profilePic} alt={item.name} className="w-full h-full object-cover" /> : item.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.email}</p>
                        </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-md capitalize">{item.role}</span>
                </div>
            );
        }

        if (type === 'project') {
            return (
                <div key={item._id || index} className="flex flex-col gap-1 p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-800">{item.projectName}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.status || 'Active'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        {item.description || 'No description'}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs font-semibold text-slate-600">Ends: {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
            );
        }

        if (type === 'task') {
            const priorityColor = item.priority === 'High' || item.priority === 'Critical' ? 'text-rose-600 bg-rose-50' : 'text-slate-600 bg-slate-100';
            const statusColor = item.status === 'Completed' || item.status === 'Done' ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50';
            return (
                <div key={item._id || index} className="flex flex-col gap-1 p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-bold text-slate-800">{item.taskName}</p>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">{item.project?.projectName || 'Unassigned Project'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${statusColor}`}>{item.status || 'New'}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${priorityColor}`}>{item.priority || 'Normal'}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs">
                        <p className="font-semibold text-slate-600">Assigned: {item.assignedTo?.name || 'Unassigned'}</p>
                        <p className="font-semibold text-slate-600">Due: {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
            );
        }
        
        return null;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                            {renderIcon()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{data?.length || 0} Records Found</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {data && data.length > 0 ? (
                        <div className="flex flex-col">
                            {data.map((item, index) => renderItem(item, index))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <p className="text-sm font-semibold">No data available.</p>
                        </div>
                    )}
                </div>
                
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex justify-end shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatDetailModal;
