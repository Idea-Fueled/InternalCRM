import React, { useState, useEffect } from 'react';
import { taskService } from '../../api/services';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import KanbanBoard from '../../components/KanbanBoard';
import { Search, Filter, Plus } from 'lucide-react';

const TeamLeadKanban = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await taskService.getAllTasks();
            setTasks(res.data.tasks || []);
        } catch (error) {
            console.error('Failed to load tasks', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, []);

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="teamLead" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="Kanban Board" role="teamLead" />

                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workflow Management</h1>
                            <p className="text-sm text-slate-500 mt-1">Drag tasks between columns to update their status.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64 shadow-sm" />
                            </div>
                            <button className="flex items-center justify-center px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                                <Filter className="w-4 h-4 mr-2 text-slate-400" /> Filters
                            </button>
                        </div>
                    </div>

                    <KanbanBoard tasks={tasks} setTasks={setTasks} searchQuery={searchQuery} loading={loading} />
                </main>

                <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar{width:4px;height:4px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8}` }} />
            </div>
        </div>
    );
};

export default TeamLeadKanban;
