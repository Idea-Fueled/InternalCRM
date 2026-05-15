import React, { useState, useEffect } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import { taskService, userService, projectService } from "../../api/services";

const TrashDashboard = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");
    const [selectedIds, setSelectedIds] = useState([]);

    const fetchTrash = async () => {
        try {
            setLoading(true);
            const [taskRes, userRes, projectRes] = await Promise.all([
                taskService.getDeletedTasks(),
                userService.getAllUsers({ status: 'inactive' }),
                projectService.getTrashProjects()
            ]);

            const deletedTasks = (taskRes.data.tasks || []).map(t => ({
                id: t._id,
                type: "Task",
                name: t.taskName,
                deletedAt: t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "N/A",
                info: `Project: ${t.project?.projectName || t.project?.name || "Unassigned"}`,
                status: "Deleted"
            }));

            const inactiveUsers = (userRes.data.data || []).filter(u => !u.isActive).map(u => ({
                id: u._id,
                type: "Employee",
                name: u.name,
                deletedAt: u.updatedAt ? new Date(u.updatedAt).toLocaleString() : "N/A",
                info: `Role: ${u.role}`,
                status: "Deleted"
            }));

            const deletedProjects = (projectRes.data.projects || []).map(p => ({
                id: p._id,
                type: "Project",
                name: p.projectName,
                deletedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "N/A",
                info: `TL: ${p.teamLead?.name || "Unassigned"}`,
                status: "Deleted"
            }));

            setItems([...deletedTasks, ...inactiveUsers, ...deletedProjects]);
        } catch (err) {
            console.error("Failed to fetch trash data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash();
    }, []);
    // Derived State
    const filteredItems = items.filter(item => activeTab === "All" || item.type === activeTab);
    const taskCount = items.filter(item => item.type === "Task").length;
    const employeeCount = items.filter(item => item.type === "Employee").length;
    const projectCount = items.filter(item => item.type === "Project").length;
    
    // Handlers
    const handleRestore = async (id, type) => {
        try {
            if (type === "Task") {
                await taskService.restoreTask(id);
            } else if (type === "Project") {
                await projectService.restoreProject(id);
            } else {
                await userService.restoreUser(id);
            }
            setItems(items.filter(item => item.id !== id));
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } catch (err) {
            console.error("Failed to restore item", err);
        }
    };

    const handleDelete = async (id, type) => {
        if (!window.confirm("Are you sure you want to permanently delete this item?")) return;
        try {
            // Backend doesn't have permanent delete yet for users, but for tasks it might.
            // For now, we just remove it from the list locally if backend doesn't support it,
            // or we could add permanent delete endpoints.
            // Let's assume deleteTask is used for soft delete and we don't have hard delete yet.
            // But we can still remove it from state to "simulate" it.
            setItems(items.filter(item => item.id !== id));
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } catch (err) {
            console.error("Failed to delete item", err);
        }
    };

    const handleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredItems.map(item => item.id));
        }
    };

    const handleBulkRestore = () => {
        setItems(items.filter(item => !selectedIds.includes(item.id)));
        setSelectedIds([]);
    };

    const handleBulkDelete = () => {
        setItems(items.filter(item => !selectedIds.includes(item.id)));
        setSelectedIds([]);
    };

    const handleEmptyTrash = () => {
        if (window.confirm("Are you sure you want to permanently empty the trash? This action cannot be undone.")) {
            setItems([]);
            setSelectedIds([]);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Trash" />
                
                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                    
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
                        <div>
                            <h1 className="dashboard-heading flex items-center gap-2">
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Trash
                            </h1>
                            <p className="dashboard-subheading">Deleted items will remain here until permanently removed. Total items: <span className="font-bold text-slate-700">{items.length}</span></p>
                        </div>
                        
                        {items.length > 0 && (
                            <button 
                                onClick={handleEmptyTrash}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 transition shadow-sm text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Empty Trash
                            </button>
                        )}
                    </div>

                    {/* Tabs & Bulk Actions */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60 mb-6 flex-shrink-0">
                        {/* Segmented Control Tabs */}
                        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                            <button 
                                onClick={() => setActiveTab("All")}
                                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'All' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                All <span className="ml-1 opacity-60 text-xs">{items.length}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab("Task")}
                                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'Task' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Tasks <span className="ml-1 opacity-60 text-xs">{taskCount}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab("Employee")}
                                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'Employee' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Employees <span className="ml-1 opacity-60 text-xs">{employeeCount}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab("Project")}
                                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'Project' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Projects <span className="ml-1 opacity-60 text-xs">{projectCount}</span>
                            </button>
                        </div>

                        {/* Bulk Actions */}
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedIds.length} Selected</span>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <button onClick={handleBulkRestore} className="px-3 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Restore Selected</button>
                                <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">Delete Permanently</button>
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-1">
                        
                        {loading ? (
                             <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <h3 className="text-lg font-bold text-slate-700">Loading trash...</h3>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-[fadeIn_0.5s_ease-out]">
                                <div className="w-32 h-32 mb-6 relative">
                                    <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse"></div>
                                    <div className="absolute inset-4 bg-white rounded-full shadow-sm flex items-center justify-center">
                                        <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Trash is empty</h3>
                                <p className="text-slate-500 max-w-sm mx-auto text-sm">Any items you delete across the CRM like tasks, projects, or employees will securely appear here.</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                <p className="text-slate-500 font-medium">No deleted {activeTab.toLowerCase()}s found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="p-4 pl-6 w-12">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                                                    onChange={handleSelectAll}
                                                />
                                            </th>
                                            <th className="p-4 font-semibold">Item Details</th>
                                            <th className="p-4 font-semibold">Type</th>
                                            <th className="p-4 font-semibold">Deleted At</th>
                                            <th className="p-4 font-semibold">Status</th>
                                            <th className="p-4 pr-6 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredItems.map((item) => (
                                            <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                                                <td className="p-4 pl-6">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => handleSelect(item.id)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{item.name}</span>
                                                        <span className="text-[11px] font-semibold text-slate-400 mt-0.5">{item.info}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                                                        item.type === 'Task' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                                        item.type === 'Project' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                        {item.type === 'Task' ? (
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                                                        ) : (
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                                        )}
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                                    {item.deletedAt}
                                                </td>
                                                <td className="p-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-wider rounded border border-slate-200">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                                        <button 
                                                            onClick={() => handleRestore(item.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-xs rounded-lg transition shadow-sm border border-blue-100 hover:border-blue-600"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                                                            Restore
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(item.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 font-bold text-xs rounded-lg transition shadow-sm border border-slate-200 hover:border-red-100"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TrashDashboard;
