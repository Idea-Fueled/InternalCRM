import React, { useState, useEffect } from "react";
import { projectService } from "../../api/services";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";

const ProjectsDashboard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Status: All");
    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await projectService.getAllProjects();
            // The backend populates teamLead
            setProjects(res.data.projects || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const filteredProjects = projects.filter(proj => {
        const matchesSearch = proj.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              proj.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "Status: All" || proj.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    return (
        <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-800">
            <AdminSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Topbar DashboardTile="Projects" />
                
                <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
                    
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Projects</h1>
                            <p className="text-sm font-medium text-slate-500 mt-1">Manage and track all ongoing project lifecycles across teams.</p>
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-200 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                            New Project
                        </button>
                    </div>

                    {/* Toolbar (Search & Filters) */}
                    <div className="flex flex-col xl:flex-row gap-4 justify-between xl:items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60">
                        {/* Search */}
                        <div className="relative w-full xl:w-96">
                            <input
                                type="text"
                                placeholder="Search projects by name or ID..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition text-sm font-medium placeholder-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-3 top-2.5 text-slate-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                            <select 
                                className="px-4 py-2 bg-slate-50 border-none text-slate-600 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer appearance-none"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option>Status: All</option>
                                <option>Active</option>
                                <option>Completed</option>
                            </select>
                            <select className="px-4 py-2 bg-slate-50 border-none text-slate-600 font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm cursor-pointer appearance-none">
                                <option>Lead: All</option>
                                <option>Marcus Chen</option>
                                <option>Anita Patel</option>
                                <option>Emily Rose</option>
                            </select>
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl transition text-sm ml-auto xl:ml-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                Date Range
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-10">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium">
                            {error}
                        </div>
                    ) : (
                    <div className="space-y-3">
                        {/* Projects List (Card-Table Hybrid) */}
                        {filteredProjects.map((project, i) => {
                            const progress = project.status === "Completed" ? 100 : 50;
                            const leadName = project.teamLead?.name || "Unassigned";
                            const leadInitial = project.teamLead?.name?.charAt(0) || "U";
                            const membersCount = project.teamMembers?.length || 0;
                            const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A";
                            const endDate = project.endDate ? new Date(project.endDate).toLocaleDateString() : "N/A";

                            return (
                            <div key={project._id || i} className="group bg-white rounded-2xl p-5 flex flex-col xl:flex-row items-center gap-6 xl:gap-8 border border-slate-200/60 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 cursor-pointer">
                                
                                {/* Left: Name & Desc */}
                                <div className="w-full xl:w-[30%]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{project._id.slice(-6).toUpperCase()}</span>
                                        <h3 className="text-base font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{project.projectName}</h3>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed pr-4">{project.description}</p>
                                </div>

                                <div className="w-full xl:w-[25%] flex flex-col gap-3 border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shadow-sm uppercase">
                                            {leadInitial}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Lead</span>
                                            <span className="text-sm font-semibold text-slate-700">{leadName}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                        <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> {startDate}</div>
                                        <span className="text-slate-300">-</span>
                                        <div className="flex items-center gap-1.5">{endDate}</div>
                                    </div>
                                </div>

                                {/* Middle 2: Stats & Progress */}
                                <div className="w-full xl:w-[25%] flex flex-col gap-3 border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-8">
                                    <div className="flex items-center justify-between">
                                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                                            project.status === 'Active' || project.status === 'On Track' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            project.status === 'At Risk' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}>
                                            {project.status}
                                        </span>
                                        
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="flex items-center gap-1.5 font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                {membersCount}
                                            </span>
                                            <span className="flex items-center gap-1 font-semibold text-slate-600">
                                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                                                Tasks
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                            <span>PROGRESS</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div 
                                                className={`h-1.5 rounded-full ${progress < 30 ? 'bg-amber-400' : progress < 70 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Action */}
                                <div className="w-full xl:w-[20%] flex items-center justify-end border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-8">
                                    <button className="w-full sm:w-auto px-5 py-2.5 bg-slate-50 text-blue-600 font-bold text-sm rounded-xl border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 shadow-sm">
                                        Open Kanban
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                                    </button>
                                </div>

                            </div>
                        )})}
                        {projects.length === 0 && <div className="text-center p-10 text-slate-500">No projects found.</div>}
                    </div>
                    )}
                    
                    {/* Informational Tip */}
                    <div className="flex items-center justify-center gap-2 mt-8 text-slate-400 text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Tip: Click anywhere on a project row to instantly open its detailed Kanban board.
                    </div>

                </main>
            </div>

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/50 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                                <div className="text-[#1d4ed8] relative flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                                    <svg className="w-2.5 h-2.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                                </div>
                                Create New Project
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4 text-sm overflow-y-auto flex-1 scrollbar-thin">
                            <div>
                                <label className="block font-bold text-slate-800 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                                <input type="text" placeholder="e.g. E-Commerce Platform" className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300 font-medium text-slate-700" />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-800 mb-1.5">Description</label>
                                <textarea placeholder="Brief project description" rows="3" className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition placeholder-slate-300 resize-none font-medium text-slate-700"></textarea>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-800 mb-1.5">Team Lead <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer appearance-none text-slate-700 font-bold">
                                        <option>Rishabh Singh</option>
                                        <option>Marcus Chen</option>
                                        <option>Anita Patel</option>
                                        <option>Emily Rose</option>
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                                    <input type="date" defaultValue="2026-05-01" className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-700 font-medium" />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1.5">End Date <span className="text-red-500">*</span></label>
                                    <input type="date" className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-slate-400 font-medium" />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-800 mb-1.5">Team Members</label>
                                <div className="w-full border border-slate-200 rounded-lg h-[140px] overflow-y-auto scrollbar-thin">
                                    {[
                                        { name: "Akriti Sharma", role: "(Developer)" },
                                        { name: "Sahil Verma", role: "(Developer)" },
                                        { name: "Rishabh Singh", role: "(Backend Dev)" },
                                        { name: "QA Engineer", role: "(QA)" }
                                    ].map((member, idx) => (
                                        <label key={idx} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition">
                                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer" />
                                            <span className="text-slate-700 font-bold text-sm">{member.name} <span className="text-slate-400 font-medium ml-1">{member.role}</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-5 flex items-center gap-4 shrink-0 border-t border-slate-100/50">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 justify-center px-6 py-2.5 text-slate-800 font-bold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm">
                                Cancel
                            </button>
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 justify-center flex items-center gap-2 px-6 py-2.5 bg-[#1d4ed8] text-white font-bold rounded-xl hover:bg-blue-800 transition shadow-sm">
                                <div className="relative flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                                    <svg className="w-2 h-2 text-[#1d4ed8] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                                </div>
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectsDashboard;
