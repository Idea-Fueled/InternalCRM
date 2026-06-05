import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Search, X, User, FolderKanban, CheckSquare, Loader2,
    ArrowUp, ArrowDown, CornerDownLeft, Hash, Clock, AlertCircle
} from "lucide-react";
import { searchService } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ProfileModal from "./ProfileModal";
import ProjectDetailsSidebar from "./ProjectDetailsSidebar";
import { getProjectStatus, getProjectStatusDetails } from "../utils/projectStatus";

const GlobalSearchModal = ({ isOpen, onClose }) => {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const getKanbanPath = (role) => {
        switch (role) {
            case "admin":
            case "hr":
                return "/admin/kanban";
            case "TL":
                return "/teamLead/kanban";
            case "qa":
                return "/qa/kanban";
            case "employee":
            default:
                return "/employee/kanban";
        }
    };
    const [query, setQuery] = useState("");
    const [results, setResults] = useState({ users: [], projects: [], tasks: [] });
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);

    // Detail view states
    const [profileUser, setProfileUser] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const inputRef = useRef(null);
    const resultsRef = useRef(null);
    const debounceRef = useRef(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setResults({ users: [], projects: [], tasks: [] });
            setActiveIndex(0);
            setHasSearched(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Global Ctrl+K / Cmd+K listener
    useEffect(() => {
        const handleGlobalKeydown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                if (isOpen) {
                    onClose();
                } else {
                    // Dispatch custom event to open
                    window.dispatchEvent(new CustomEvent("open-global-search"));
                }
            }
        };
        window.addEventListener("keydown", handleGlobalKeydown);
        return () => window.removeEventListener("keydown", handleGlobalKeydown);
    }, [isOpen, onClose]);

    // Debounced search
    const performSearch = useCallback(async (searchQuery) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setResults({ users: [], projects: [], tasks: [] });
            setHasSearched(false);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await searchService.globalSearch(searchQuery.trim());
            if (res.data?.success) {
                setResults(res.data.results);
                setHasSearched(true);
                setActiveIndex(0);
            }
        } catch (err) {
            console.error("Global search error:", err);
            setResults({ users: [], projects: [], tasks: [] });
            setHasSearched(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle query change with debounce
    const handleQueryChange = (e) => {
        const val = e.target.value;
        setQuery(val);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (val.trim().length < 2) {
            setResults({ users: [], projects: [], tasks: [] });
            setHasSearched(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(() => {
            performSearch(val);
        }, 300);
    };

    // Build flat list for keyboard navigation
    const flatList = [
        ...results.users.map((u) => ({ type: "user", data: u })),
        ...results.projects.map((p) => ({ type: "project", data: p })),
        ...results.tasks.map((t) => ({ type: "task", data: t }))
    ];

    const totalResults = flatList.length;

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            onClose();
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % Math.max(totalResults, 1));
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 + Math.max(totalResults, 1)) % Math.max(totalResults, 1));
        }
        if (e.key === "Enter" && totalResults > 0) {
            e.preventDefault();
            handleSelect(flatList[activeIndex]);
        }
    };

    // Scroll active item into view
    useEffect(() => {
        if (resultsRef.current) {
            const activeItem = resultsRef.current.querySelector(`[data-index="${activeIndex}"]`);
            if (activeItem) {
                activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    }, [activeIndex]);

    // Handle item selection
    const handleSelect = (item) => {
        if (!item) return;
        onClose();

        if (item.type === "user") {
            setTimeout(() => setProfileUser(item.data), 150);
        } else if (item.type === "project") {
            setTimeout(() => setSelectedProjectId(item.data._id), 150);
        } else if (item.type === "task") {
            const projectObj = item.data.project;
            const projectName = projectObj?.projectName || projectObj?.name || (typeof projectObj === "string" ? projectObj : "");
            
            const role = currentUser?.role || "employee";
            const kanbanPath = getKanbanPath(role);
            
            const queryParams = new URLSearchParams();
            if (projectName) {
                queryParams.set("project", projectName);
            }
            
            setTimeout(() => {
                navigate(`${kanbanPath}?${queryParams.toString()}`);
            }, 150);
        }
    };

    // Helpers
    const formatRole = (r) => {
        if (r === "TL") return "Team Lead";
        if (r === "qa") return "QA";
        if (r === "admin") return "Admin";
        if (r === "developer") return "Developer";
        return r || "Employee";
    };

    const getRoleBadgeClass = (r) => {
        switch (r) {
            case "admin": return "bg-blue-50 text-blue-600 border-blue-100";
            case "TL": return "bg-purple-50 text-purple-600 border-purple-100";
            case "developer": return "bg-indigo-50 text-indigo-600 border-indigo-100";
            case "qa": return "bg-pink-50 text-pink-600 border-pink-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case "Active": case "In Progress": return "bg-blue-50 text-blue-600 border-blue-100";
            case "Completed": case "Done": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "QA Review": return "bg-indigo-50 text-indigo-600 border-indigo-100";
            case "New": return "bg-slate-50 text-slate-600 border-slate-100";
            case "At Risk": return "bg-amber-50 text-amber-600 border-amber-100";
            case "On Track": return "bg-teal-50 text-teal-600 border-teal-100";
            case "Planning": case "Upcoming": return "bg-violet-50 text-violet-600 border-violet-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    const getPriorityBadgeClass = (priority) => {
        switch (priority) {
            case "Critical": return "bg-rose-50 text-rose-600 border-rose-100";
            case "High": return "bg-orange-50 text-orange-600 border-orange-100";
            case "Medium": return "bg-blue-50 text-blue-600 border-blue-100";
            case "Low": return "bg-slate-50 text-slate-600 border-slate-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    const getInitials = (name) => {
        if (!name) return "?";
        const parts = name.split(" ");
        return parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    // Build section index offsets
    let runningIndex = 0;
    const userStartIndex = 0;
    const projectStartIndex = results.users.length;
    const taskStartIndex = results.users.length + results.projects.length;

    if (!isOpen && !profileUser && !selectedProjectId) return null;

    return (
        <>
            {/* ─── SEARCH MODAL ─────────────────────────────────────── */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-950/50 backdrop-blur-sm pt-[10vh] px-4"
                    onClick={onClose}
                >
                    <div
                        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxHeight: "70vh" }}
                    >
                        {/* Search Input Bar */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={handleQueryChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Search users, projects, tasks..."
                                className="flex-1 text-[15px] text-slate-800 placeholder:text-slate-400 bg-transparent outline-none font-medium"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                            {query && !loading && (
                                <button
                                    onClick={() => { setQuery(""); setResults({ users: [], projects: [], tasks: [] }); setHasSearched(false); inputRef.current?.focus(); }}
                                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
                                <kbd className="hidden sm:inline-flex text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5">
                                    ESC
                                </kbd>
                            </div>
                        </div>

                        {/* Results Container */}
                        <div ref={resultsRef} className="overflow-y-auto flex-1 overscroll-contain">

                            {/* Empty state - no query */}
                            {!hasSearched && !loading && query.length < 2 && (
                                <div className="px-5 py-10 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                                        <Search className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-400">
                                        Type to search across your CRM
                                    </p>
                                    <p className="text-xs text-slate-300 mt-1">
                                        Search users, projects, and tasks
                                    </p>
                                </div>
                            )}

                            {/* No results found */}
                            {hasSearched && totalResults === 0 && !loading && (
                                <div className="px-5 py-10 text-center">
                                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-100">
                                        <AlertCircle className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500">
                                        No results for "{query}"
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Try a different search term
                                    </p>
                                </div>
                            )}

                            {/* ─── USERS SECTION ─────────────────── */}
                            {results.users.length > 0 && (
                                <div className="px-2 pt-3 pb-1">
                                    <div className="flex items-center gap-2 px-3 pb-2">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Users
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                            {results.users.length}
                                        </span>
                                    </div>
                                    {results.users.map((u, idx) => {
                                        const globalIdx = userStartIndex + idx;
                                        return (
                                            <button
                                                key={u._id}
                                                data-index={globalIdx}
                                                onClick={() => handleSelect({ type: "user", data: u })}
                                                onMouseEnter={() => setActiveIndex(globalIdx)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 group ${
                                                    activeIndex === globalIdx
                                                        ? "bg-blue-50 border border-blue-100"
                                                        : "hover:bg-slate-50 border border-transparent"
                                                }`}
                                            >
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden shadow-sm">
                                                    {u.profilePic ? (
                                                        <img src={u.profilePic} alt={u.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        getInitials(u.name)
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-700 truncate">{u.name}</p>
                                                    <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {u.department && (
                                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 hidden sm:inline">
                                                            {u.department}
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeClass(u.role)}`}>
                                                        {u.designation || formatRole(u.role)}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ─── PROJECTS SECTION ──────────────── */}
                            {results.projects.length > 0 && (
                                <div className="px-2 pt-3 pb-1">
                                    {results.users.length > 0 && <div className="border-t border-slate-100 mx-3 mb-3" />}
                                    <div className="flex items-center gap-2 px-3 pb-2">
                                        <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Projects
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                            {results.projects.length}
                                        </span>
                                    </div>
                                    {results.projects.map((p, idx) => {
                                        const globalIdx = projectStartIndex + idx;
                                        return (
                                            <button
                                                key={p._id}
                                                data-index={globalIdx}
                                                onClick={() => handleSelect({ type: "project", data: p })}
                                                onMouseEnter={() => setActiveIndex(globalIdx)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 group ${
                                                    activeIndex === globalIdx
                                                        ? "bg-blue-50 border border-blue-100"
                                                        : "hover:bg-slate-50 border border-transparent"
                                                }`}
                                            >
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                                    <FolderKanban className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-700 truncate">{p.projectName}</p>
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {p.clientName ? `Client: ${p.clientName}` : p.teamLead?.name ? `Lead: ${p.teamLead.name}` : "No description"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {p.priority && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border hidden sm:inline ${getPriorityBadgeClass(p.priority)}`}>
                                                            {p.priority}
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusDetails.badgeClass} flex items-center gap-1`}>
                                                        <span>{statusDetails.emoji}</span>
                                                        <span>{statusDetails.label}</span>
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ─── TASKS SECTION ─────────────────── */}
                            {results.tasks.length > 0 && (
                                <div className="px-2 pt-3 pb-1">
                                    {(results.users.length > 0 || results.projects.length > 0) && (
                                        <div className="border-t border-slate-100 mx-3 mb-3" />
                                    )}
                                    <div className="flex items-center gap-2 px-3 pb-2">
                                        <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Tasks
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                            {results.tasks.length}
                                        </span>
                                    </div>
                                    {results.tasks.map((t, idx) => {
                                        const globalIdx = taskStartIndex + idx;
                                        return (
                                            <button
                                                key={t._id}
                                                data-index={globalIdx}
                                                onClick={() => handleSelect({ type: "task", data: t })}
                                                onMouseEnter={() => setActiveIndex(globalIdx)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 group ${
                                                    activeIndex === globalIdx
                                                        ? "bg-blue-50 border border-blue-100"
                                                        : "hover:bg-slate-50 border border-transparent"
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                                    t.status === "Completed" || t.status === "Done"
                                                        ? "bg-gradient-to-br from-emerald-400 to-green-600 text-white"
                                                        : t.status === "QA Review"
                                                        ? "bg-gradient-to-br from-indigo-400 to-indigo-600 text-white"
                                                        : t.status === "In Progress"
                                                        ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
                                                        : "bg-gradient-to-br from-slate-400 to-slate-600 text-white"
                                                }`}>
                                                    <CheckSquare className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-700 truncate">{t.taskName}</p>
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {t.project?.projectName || "Unlinked"}{t.assignedTo?.name ? ` · ${t.assignedTo.name}` : ""}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border hidden sm:inline ${getPriorityBadgeClass(t.priority)}`}>
                                                        {t.priority}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadgeClass(t.status)}`}>
                                                        {t.status}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Bottom padding */}
                            {totalResults > 0 && <div className="h-2" />}
                        </div>

                        {/* Footer hints */}
                        {totalResults > 0 && (
                            <div className="flex items-center gap-4 px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                                    <div className="flex items-center gap-0.5">
                                        <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 shadow-sm"><ArrowUp className="w-2.5 h-2.5" /></kbd>
                                        <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 shadow-sm"><ArrowDown className="w-2.5 h-2.5" /></kbd>
                                    </div>
                                    Navigate
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                                    <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 shadow-sm"><CornerDownLeft className="w-2.5 h-2.5" /></kbd>
                                    Open
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                                    <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-sm text-[9px]">ESC</kbd>
                                    Close
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── PROFILE MODAL (for user results) ─────────────────── */}
            {profileUser && (
                <ProfileModal
                    isOpen={!!profileUser}
                    onClose={() => setProfileUser(null)}
                    user={profileUser}
                    role={profileUser.role}
                    displayName={profileUser.name}
                    displayRole={profileUser.designation || formatRole(profileUser.role)}
                    initial={getInitials(profileUser.name)}
                />
            )}

            {/* ─── PROJECT SIDEBAR (for project/task results) ────────── */}
            {selectedProjectId && (
                <ProjectDetailsSidebar
                    projectId={selectedProjectId}
                    onClose={() => setSelectedProjectId(null)}
                />
            )}
        </>
    );
};

export default GlobalSearchModal;
