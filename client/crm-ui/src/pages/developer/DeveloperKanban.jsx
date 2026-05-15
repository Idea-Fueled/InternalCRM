import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Topbar from '../../components/Topbar';
import KanbanBoard from '../../components/KanbanBoard';
import { taskService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter } from 'lucide-react';

const DeveloperKanban = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            if (!user?._id) return;
            try {
                setLoading(true);
                const res = await taskService.getTasksByUser(user._id);
                setTasks(res.data.tasks || []);
            } catch (err) {
                console.error('Failed to load tasks', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, [user]);

    return (
        <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <AdminSidebar role="developer" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Topbar DashboardTile="Kanban Board" role="developer" />

                <main className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Task Board</h1>
                            <p className="text-sm text-slate-500 mt-1">Drag tasks to update their status. Click a task to view notes.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64 shadow-sm" />
                            </div>

                        </div>
                    </div>

                    <KanbanBoard tasks={tasks} setTasks={setTasks} searchQuery={searchQuery} loading={loading} role="developer" />
                </main>

                <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar{width:4px;height:4px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8}` }} />
            </div>
        </div>
    );
};

export default DeveloperKanban;
