import { useState, useEffect, useRef, useMemo } from "react";
import {
    Search, Loader2, Building2, UserMinus, Plus, Minus, Pin,
    User, Landmark, Users, Briefcase, ListTodo, MoreVertical, 
    Eye, Share2, Anchor, UserCheck, ShieldCheck
} from "lucide-react";
import { userService, projectService, taskService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import ProfileModal from "../../components/ProfileModal";

const OrganizationTree = () => {
    const { user } = useAuth();

    // Core States
    const [allUsers, setAllUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI Interaction States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDept, setSelectedDept] = useState("All");
    const [viewMode, setViewMode] = useState("Full"); // "Full" | "MyTeam" | "ReportingChain"
    const [zoomScale, setZoomScale] = useState(1.0);
    const [expandedNodes, setExpandedNodes] = useState({});
    const [selectedChainUser, setSelectedChainUser] = useState("");
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [groupByDept, setGroupByDept] = useState(false);

    // Helper functions
    const formatRole = (r) => {
        if (!r) return "Employee";
        const roleLower = String(r).toLowerCase();
        if (roleLower === 'tl') return 'Technical Team Lead';
        if (roleLower === 'qa') return 'QA Engineer';
        if (roleLower === 'developer') return 'Software Developer';
        if (roleLower === 'admin') return 'Administrator';
        return r.charAt(0).toUpperCase() + r.slice(1);
    };

    const toggleExpand = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: prev[nodeId] === false ? true : false
        }));
    };

    // Profile Modal States
    const [selectedProfileUser, setSelectedProfileUser] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Viewport references for panning
    const canvasViewportRef = useRef(null);
    const canvasContentRef = useRef(null);

    // Drag-to-pan states
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const currentRole = user?.role === 'TL' ? 'teamLead' : user?.role || 'admin';

    // Load data from APIs
    useEffect(() => {
        const loadOrgData = async () => {
            try {
                setLoading(true);
                // Parallel fetching for high performance
                const [usersRes, projectsRes, tasksRes] = await Promise.all([
                    userService.getAllUsers({ status: 'active' }),
                    projectService.getAllProjects(),
                    taskService.getAllTasks()
                ]);

                if (usersRes.data?.success && Array.isArray(usersRes.data.data)) {
                    setAllUsers(usersRes.data.data);
                }
                if (Array.isArray(projectsRes.data)) {
                    setProjects(projectsRes.data);
                } else if (projectsRes.data?.data) {
                    setProjects(projectsRes.data.data);
                }
                if (Array.isArray(tasksRes.data)) {
                    setTasks(tasksRes.data);
                } else if (tasksRes.data?.data) {
                    setTasks(tasksRes.data.data);
                }
            } catch (err) {
                console.error("Failed to load organizational hierarchy matrix:", err);
            } finally {
                setLoading(false);
            }
        };
        loadOrgData();
    }, []);

    // Close menus on outside click
    useEffect(() => {
        const closeMenus = () => setActiveMenuId(null);
        window.addEventListener('click', closeMenus);
        return () => window.removeEventListener('click', closeMenus);
    }, []);

    // Expand all branches by default once loaded
    useEffect(() => {
        if (allUsers.length > 0) {
            const initialExpanded = {};
            allUsers.forEach(u => {
                initialExpanded[u._id] = true;
            });
            setExpandedNodes(initialExpanded);
        }
    }, [allUsers]);

    // Set fallback selected user for reporting chain
    useEffect(() => {
        if (allUsers.length > 0 && !selectedChainUser) {
            setSelectedChainUser(user?._id || allUsers[0]?._id);
        }
    }, [allUsers, user, selectedChainUser]);

    // Unique list of departments for filtering
    const departments = useMemo(() => {
        const depts = new Set();
        allUsers.forEach(u => {
            if (u.department) depts.add(u.department);
        });
        return ["All", ...Array.from(depts)];
    }, [allUsers]);

    // Mini analytics statistics
    const metrics = useMemo(() => {
        const totalEmployees = allUsers.filter(u => u.isActive !== false).length;
        const totalProjects = projects.length;
        const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
        const activeDepts = departments.filter(d => d !== "All").length || 4;

        return [
            { label: "Total Members", value: totalEmployees, icon: <Users className="w-5 h-5" />, color: "from-blue-500 to-indigo-500", bg: "bg-blue-50/50" },
            { label: "Active Projects", value: totalProjects, icon: <Briefcase className="w-5 h-5" />, color: "from-purple-500 to-violet-500", bg: "bg-purple-50/50" },
            { label: "Pending Tasks", value: pendingTasks, icon: <ListTodo className="w-5 h-5" />, color: "from-rose-500 to-pink-500", bg: "bg-rose-50/50" },
            { label: "Core Divisions", value: activeDepts, icon: <Building2 className="w-5 h-5" />, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50/50" }
        ];
    }, [allUsers, projects, tasks, departments]);

    // Helper to get string ID
    const getIdString = (id) => {
        if (!id) return "";
        if (typeof id === 'object') return id._id ? String(id._id) : String(id);
        return String(id);
    };

    // Calculate dynamic manager name
    const getManagerName = (node) => {
        const leadId = node.teamLeads && node.teamLeads.length > 0 ? getIdString(node.teamLeads[0]) : null;
        if (!leadId) return null;
        const manager = allUsers.find(u => getIdString(u._id) === leadId);
        return manager ? manager.name : null;
    };

    // Calculate direct reporting size
    const getReporteesCount = (nodeId) => {
        return allUsers.filter(u => (u.teamLeads || []).map(t => getIdString(t)).includes(getIdString(nodeId))).length;
    };

    // Helper to snap/center viewport on a specific node card
    const centerOnNode = (nodeId) => {
        const element = document.getElementById(`node-card-${nodeId}`);
        const viewport = canvasViewportRef.current;
        if (element && viewport) {
            const elementRect = element.getBoundingClientRect();
            const viewportRect = viewport.getBoundingClientRect();

            const targetScrollLeft = viewport.scrollLeft + (elementRect.left - viewportRect.left) - (viewportRect.width / 2) + (elementRect.width / 2);
            const targetScrollTop = viewport.scrollTop + (elementRect.top - viewportRect.top) - (viewportRect.height / 2) + (elementRect.height / 2);

            viewport.scrollTo({
                left: targetScrollLeft,
                top: targetScrollTop,
                behavior: "smooth"
            });
        }
    };

    // --- Shortcuts Navigation ---
    const handleGoToMe = () => {
        if (user?._id) {
            centerOnNode(getIdString(user._id));
        }
    };

    const handleGoToTop = () => {
        const admins = allUsers.filter(u => u.role === 'admin');
        if (admins.length > 0) {
            centerOnNode(getIdString(admins[0]._id));
        }
    };

    const handleGoToMyDepartment = () => {
        if (user?.department) {
            const sameDept = allUsers.find(u => u.department === user.department);
            if (sameDept) {
                centerOnNode(getIdString(sameDept._id));
            }
        }
    };

    // --- Kinetic Panning ---
    const handleMouseDown = (e) => {
        if (e.button !== 0 || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
        setIsDragging(true);
        setStartX(e.pageX - canvasViewportRef.current.offsetLeft);
        setStartY(e.pageY - canvasViewportRef.current.offsetTop);
        setScrollLeft(canvasViewportRef.current.scrollLeft);
        setScrollTop(canvasViewportRef.current.scrollTop);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - canvasViewportRef.current.offsetLeft;
        const y = e.pageY - canvasViewportRef.current.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        canvasViewportRef.current.scrollLeft = scrollLeft - walkX;
        canvasViewportRef.current.scrollTop = scrollTop - walkY;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    // --- Zoom Scales ---
    const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.1, 1.5));
    const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.1, 0.5));
    const handleResetZoom = () => {
        setZoomScale(1.0);
        handleGoToTop();
    };

    // --- Reporting Chain Highlight Calculations ---
    const highlightedNodeIds = useMemo(() => {
        if (viewMode !== 'ReportingChain' || !selectedChainUser) return new Set();
        const path = new Set();
        path.add(selectedChainUser);

        // Move Upwards to Admins
        let currentId = selectedChainUser;
        let safety = 0;
        while (currentId && safety < 10) {
            const currentObj = allUsers.find(u => getIdString(u._id) === currentId);
            if (currentObj && currentObj.teamLeads && currentObj.teamLeads.length > 0) {
                const parentId = getIdString(currentObj.teamLeads[0]);
                path.add(parentId);
                currentId = parentId;
            } else {
                break;
            }
            safety++;
        }

        // Move Downwards to developers/QAs
        const addChildren = (id) => {
            allUsers.forEach(u => {
                const parents = (u.teamLeads || []).map(tl => getIdString(tl));
                if (parents.includes(id) && !path.has(getIdString(u._id))) {
                    path.add(getIdString(u._id));
                    addChildren(getIdString(u._id));
                }
            });
        };
        addChildren(selectedChainUser);

        return path;
    }, [viewMode, selectedChainUser, allUsers]);

    // --- Dynamic Tree Hierarchy Builder ---
    const rootNodes = useMemo(() => {
        if (allUsers.length === 0) return [];

        const admins = allUsers.filter(u => u.role === 'admin');
        const tls = allUsers.filter(u => u.role === 'TL');
        const members = allUsers.filter(u => u.role === 'developer' || u.role === 'qa');

        const loggedInUserId = getIdString(user?._id);
        const loggedInUserRole = user?.role || 'admin';
        const myTeamLeads = (user?.teamLeads || []).map(tl => getIdString(tl));

        const buildTree = (roots) => {
            return roots.map(root => {
                let children = [];
                if (root.role === 'admin') {
                    const adminTLs = tls.filter(tl => (tl.teamLeads || []).map(t => getIdString(t)).includes(getIdString(root._id)));
                    children = adminTLs.length > 0 ? adminTLs : tls;
                } else if (root.role === 'TL') {
                    children = members.filter(m => (m.teamLeads || []).map(t => getIdString(t)).includes(getIdString(root._id)));
                }

                return {
                    ...root,
                    children: children.length > 0 ? buildTree(children) : []
                };
            });
        };

        if (viewMode === 'MyTeam') {
            if (loggedInUserRole === 'admin') {
                return buildTree(admins);
            } else if (loggedInUserRole === 'TL') {
                const selfTL = allUsers.find(u => getIdString(u._id) === loggedInUserId);
                return selfTL ? buildTree([selfTL]) : [];
            } else {
                const reportingTLs = allUsers.filter(u => u.role === 'TL' && myTeamLeads.includes(getIdString(u._id)));
                return reportingTLs.length > 0 ? buildTree(reportingTLs) : buildTree(admins);
            }
        }

        // Default or ReportingChain View Mode
        return buildTree(admins);
    }, [allUsers, user, viewMode]);

    // Live search highlighting snaps
    useEffect(() => {
        if (searchQuery.trim() && allUsers.length > 0) {
            const query = searchQuery.toLowerCase();
            const matched = allUsers.find(u =>
                u.name.toLowerCase().includes(query) ||
                formatRole(u.role).toLowerCase().includes(query)
            );
            if (matched) {
                centerOnNode(getIdString(matched._id));
            }
        }
    }, [searchQuery, allUsers]);

    // Direct Profile modal trigger
    const handleOpenProfile = (employee) => {
        setSelectedProfileUser(employee);
        setIsProfileModalOpen(true);
    };

    // Helper for initials
    const getInitials = (name) => {
        if (!name) return "?";
        const parts = name.split(" ");
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };


    // Recursive Tree Node Renderer
    const TreeNode = ({ node }) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node._id] !== false;

        const nodeStrId = getIdString(node._id);
        const loggedInUserId = getIdString(user?._id);
        const managerName = getManagerName(node);
        const reporteesCount = getReporteesCount(node._id);

        const isHighlightedPath = viewMode === 'ReportingChain' && highlightedNodeIds.has(nodeStrId);
        const isDimmed = viewMode === 'ReportingChain' && !highlightedNodeIds.has(nodeStrId);

        const isMe = nodeStrId === loggedInUserId;
        const isSearchMatch = searchQuery.trim() && (
            node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            formatRole(node.role).toLowerCase().includes(searchQuery.toLowerCase())
        );

        const isDeptHighlight = selectedDept !== "All" && node.department === selectedDept;
        const isDeptDimmed = selectedDept !== "All" && node.department !== selectedDept;

        return (
            <div className={`flex flex-col items-center transition-all duration-300 ${isDimmed || isDeptDimmed ? 'opacity-40 filter grayscale-[20%]' : ''
                }`}>
                {/* Node Card Container */}
                <div
                    id={`node-card-${node._id}`}
                    onClick={() => handleOpenProfile(node)}
                    className={`bg-white/95 backdrop-blur-md border rounded-[22px] p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col w-[300px] text-left relative z-10 cursor-pointer ${isMe ? 'ring-2 ring-amber-500 border-amber-300 shadow-amber-50 shadow-lg scale-[1.02]' :
                        isSearchMatch ? 'ring-2 ring-blue-500 border-blue-300 shadow-blue-50 shadow-lg scale-[1.02]' :
                            isHighlightedPath ? 'ring-2 ring-purple-600 border-purple-300 shadow-purple-50 shadow-lg scale-[1.02]' :
                                isDeptHighlight ? 'ring-2 ring-emerald-500 border-emerald-300 shadow-emerald-50 shadow-lg scale-[1.02]' :
                                    'border-slate-200/80 hover:border-slate-300'
                        }`}
                >
                    {/* Top details block */}
                    <div className="flex items-center gap-4">
                        {/* Profile initials / Image */}
                        <div className="relative flex-shrink-0">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${node.role === 'admin' ? 'from-blue-500 to-indigo-600' :
                                node.role === 'TL' ? 'from-purple-500 to-violet-600' :
                                    node.role === 'developer' ? 'from-indigo-500 to-blue-500' :
                                        'from-pink-500 to-rose-600'
                                } text-white flex items-center justify-center font-black text-lg shadow-sm overflow-hidden`}>
                                {node.profilePic ? (
                                    <img src={node.profilePic} alt={node.name} className="w-full h-full object-cover" />
                                ) : getInitials(node.name)}
                            </div>
                            {/* Status Indicator */}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center shadow" title="Active">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            </div>
                        </div>

                        {/* Node texts */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <h6 className="text-sm font-bold text-slate-800 truncate pr-2">{node.name}</h6>

                                {/* Quick Menu */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === nodeStrId ? null : nodeStrId);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold truncate leading-normal">{formatRole(node.role)}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{node.department || "SOFTWARE DEVELOPMENT"}</p>
                        </div>
                    </div>

                    {/* Action Dropdown Menu */}
                    {activeMenuId === nodeStrId && (
                        <div className="absolute top-12 right-6 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 w-44 z-50 animate-in fade-in slide-in-from-top-2 duration-150" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => { handleOpenProfile(node); setActiveMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Eye className="w-3.5 h-3.5" /> View Profile
                            </button>
                            <button
                                onClick={() => { centerOnNode(nodeStrId); setActiveMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Anchor className="w-3.5 h-3.5" /> Focus Card
                            </button>
                            <button
                                onClick={() => { setSelectedChainUser(nodeStrId); setViewMode("ReportingChain"); setActiveMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-xs font-semibold text-purple-600 hover:bg-purple-50 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Trace Structure
                            </button>
                        </div>
                    )}

                    {/* Inner Relational Details Footer */}
                    {(managerName || reporteesCount > 0) && (
                        <div className="border-t border-slate-100/80 mt-4 pt-3 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                            {managerName ? (
                                <span className="flex items-center gap-1 text-slate-400">
                                    <UserCheck className="w-3.5 h-3.5 text-slate-300" />
                                    Reports to: <strong className="text-slate-500 truncate max-w-[100px]">{managerName.split(" ")[0]}</strong>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-blue-500 font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Executive Board
                                </span>
                            )}

                            {reporteesCount > 0 && (
                                <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                    {reporteesCount} Reports
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Collapse/Expand Node Toggles */}
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(node._id);
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center -mb-3 mt-3 shadow-md transition-all z-20 cursor-pointer text-sm font-black border border-white focus:outline-none ${isHighlightedPath ? 'bg-purple-700 hover:bg-purple-800 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                            }`}
                    >
                        {isExpanded ? "−" : "+"}
                    </button>
                )}

                {/* Vertical guiding connector to child row */}
                {hasChildren && isExpanded && (
                    <div className={`w-0.5 h-8 mt-3 ${isHighlightedPath ? 'bg-purple-600' : 'bg-slate-200/80'
                        }`} />
                )}

                {/* Children row container */}
                {hasChildren && isExpanded && (
                    <div className="flex gap-10 relative pt-6 justify-center">
                        {node.children.map((child, idx) => {
                            const childrenArr = node.children;
                            const isFirst = idx === 0;
                            const isLast = idx === childrenArr.length - 1;
                            const isSingle = childrenArr.length === 1;

                            // Highlight connecting lines path
                            const isChildHighlighted = isHighlightedPath && highlightedNodeIds.has(getIdString(child._id));

                            return (
                                <div key={child._id || idx} className="flex flex-col items-center relative">
                                    {/* Horizontal Guidelines connected span */}
                                    {!isSingle && (
                                        <div className="absolute -top-6 left-0 right-0 flex h-0.5">
                                            <div className={`flex-1 ${isFirst ? 'bg-transparent' :
                                                isChildHighlighted ? 'bg-purple-600' : 'bg-slate-200/80'
                                                }`} />
                                            <div className={`flex-1 ${isLast ? 'bg-transparent' :
                                                isChildHighlighted ? 'bg-purple-600' : 'bg-slate-200/80'
                                                }`} />
                                        </div>
                                    )}
                                    {/* Vertical Guideline connector to child card */}
                                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 ${isChildHighlighted ? 'bg-purple-600' : 'bg-slate-200/80'
                                        }`} />

                                    <TreeNode node={child} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 select-none">
            <AdminSidebar role={currentRole} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Topbar DashboardTile="Organization Matrix" role={currentRole} />

                {/* Custom Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Dynamic Mini Analytics Header Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {metrics.map((card, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-[22px] border border-slate-100 flex items-center justify-between shadow-sm hover:shadow transition-shadow duration-200">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                                        <h4 className="text-2xl font-black text-slate-800">{card.value}</h4>
                                    </div>
                                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-md shadow-slate-100`}>
                                        {card.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Navigation Actions Panel */}
                        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                            {/* Search input box */}
                            <div className="relative w-full lg:w-80">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search employee by name or role..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all outline-none"
                                />
                            </div>

                            {/* View Selector Filters */}
                            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-xs font-semibold select-none">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Go to</span>
                                    <button
                                        onClick={handleGoToMyDepartment}
                                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none"
                                    >
                                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> My Department
                                    </button>
                                    <button
                                        onClick={handleGoToTop}
                                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none"
                                    >
                                        <Landmark className="w-3.5 h-3.5 text-slate-400" /> Top of the Org
                                    </button>
                                    <button
                                        onClick={handleGoToMe}
                                        className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-bold focus:outline-none"
                                    >
                                        <User className="w-3.5 h-3.5" /> Me
                                    </button>
                                </div>

                                <div className="h-6 w-px bg-slate-200 hidden md:block" />

                                {/* Smart Modes Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Mode</span>
                                    <select
                                        value={viewMode}
                                        onChange={e => setViewMode(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer focus:border-purple-600"
                                    >
                                        <option value="Full">Full Organization</option>
                                        <option value="MyTeam">My Team Scope</option>
                                        <option value="ReportingChain">Reporting Chain</option>
                                    </select>
                                </div>

                                {/* Chain User selection (Only visible during Chain View mode) */}
                                {viewMode === 'ReportingChain' && (
                                    <div className="relative animate-in fade-in duration-200">
                                        <select
                                            value={selectedChainUser}
                                            onChange={e => setSelectedChainUser(e.target.value)}
                                            className="px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold outline-none cursor-pointer"
                                        >
                                            {allUsers.map(u => (
                                                <option key={u._id} value={u._id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Department selection filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Department</span>
                                    <select
                                        value={selectedDept}
                                        onChange={e => setSelectedDept(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer focus:border-purple-600"
                                    >
                                        <option value="All">All Departments</option>
                                        {departments.filter(d => d !== "All").map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="h-6 w-px bg-slate-200 hidden md:block" />

                                {/* Group by department switch */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setGroupByDept(prev => !prev)}
                                        className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none ${groupByDept ? 'bg-purple-700' : 'bg-slate-200'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${groupByDept ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                    <span>Division Highlight</span>
                                </div>
                            </div>
                        </div>

                        {/* Draggable Viewport Canvas Frame */}
                        <div
                            ref={canvasViewportRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                            className={`bg-white rounded-[28px] border border-slate-100 shadow-sm relative min-h-[550px] overflow-auto p-16 scrollbar-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
                                }`}
                        >
                            <div
                                ref={canvasContentRef}
                                style={{
                                    transform: `scale(${zoomScale})`,
                                    transformOrigin: 'top center',
                                    transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                                }}
                                className="w-max mx-auto flex justify-center pb-24"
                            >
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-44">
                                        <Loader2 className="w-9 h-9 text-purple-600 animate-spin" />
                                        <p className="text-sm text-slate-400 font-semibold">Generating organizational nodes...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        {rootNodes.length > 0 ? (
                                            rootNodes.map((rootNode, idx) => (
                                                <div key={rootNode._id || idx} className="flex flex-col items-center">
                                                    <TreeNode node={rootNode} />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-24 gap-3">
                                                <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                                                    <UserMinus className="w-8 h-8" />
                                                </div>
                                                <div className="text-center">
                                                    <h5 className="font-bold text-slate-700">No hierarchy results resolved</h5>
                                                    <p className="text-xs text-slate-400 font-semibold mt-1">Please verify employee parameters inside directory listing</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Floating zoom widgets */}
                <div className="absolute right-8 bottom-8 flex flex-col gap-2 z-40 select-none">
                    <button
                        onClick={handleZoomIn}
                        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-lg hover:scale-105 transition-all text-slate-500 hover:text-slate-700 cursor-pointer focus:outline-none"
                        title="Zoom In"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-lg hover:scale-105 transition-all text-slate-500 hover:text-slate-700 cursor-pointer focus:outline-none"
                        title="Zoom Out"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleResetZoom}
                        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-lg hover:scale-105 transition-all text-slate-500 hover:text-slate-700 cursor-pointer focus:outline-none"
                        title="Center & Reset Zoom"
                    >
                        <Pin className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Direct Integration with Premium Hierarchy-Aware Profile Modal */}
            {isProfileModalOpen && selectedProfileUser && (
                <ProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => {
                        setIsProfileModalOpen(false);
                        setSelectedProfileUser(null);
                    }}
                    user={selectedProfileUser}
                    role={selectedProfileUser.role}
                    displayName={selectedProfileUser.name}
                    displayRole={
                        selectedProfileUser.role === 'TL' ? 'Team Lead' :
                            selectedProfileUser.role === 'admin' ? 'Administrator' :
                                selectedProfileUser.role === 'developer' ? 'Developer' : 'QA'
                    }
                    initial={getInitials(selectedProfileUser.name)}
                />
            )}
        </div>
    );
};

export default OrganizationTree;
