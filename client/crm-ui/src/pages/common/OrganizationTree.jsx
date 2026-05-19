import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
    Search, Loader2, Building2, UserMinus, Plus, Minus, Pin, 
    Compass, User, Landmark, HelpCircle
} from "lucide-react";
import { userService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";

const OrganizationTree = () => {
    const { user } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [groupByDept, setGroupByDept] = useState(false);
    const [zoomScale, setZoomScale] = useState(1.0);
    const [expandedNodes, setExpandedNodes] = useState({});
    
    // Viewport references for panning & auto-centering
    const canvasViewportRef = useRef(null);
    const canvasContentRef = useRef(null);
    
    // Drag-to-pan states
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const currentRole = user?.role === 'TL' ? 'teamLead' : user?.role || 'admin';

    // Fetch active employees
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const res = await userService.getAllUsers({ status: 'active' });
                if (res.data?.success && Array.isArray(res.data.data)) {
                    setAllUsers(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch directory users:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    // Expand all branches by default initially
    useEffect(() => {
        if (allUsers.length > 0) {
            const initialExpanded = {};
            allUsers.forEach(u => {
                initialExpanded[u._id] = true;
            });
            setExpandedNodes(initialExpanded);
        }
    }, [allUsers]);

    // Helper to get initials
    const getInitials = (name) => {
        if (!name) return "?";
        const parts = name.split(" ");
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Format role names beautifully
    const formatRole = (r) => {
        if (r === 'TL') return 'Technical Team Lead';
        if (r === 'qa') return 'QA Engineer';
        if (r === 'developer') return 'Software Developer Engineer - 1';
        return r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Employee';
    };

    // Helper to extract string ID
    const getIdString = (id) => {
        if (!id) return "";
        if (typeof id === 'object') return id._id ? String(id._id) : String(id);
        return String(id);
    };

    const toggleExpand = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    // Pan viewport to center on a specific node card element
    const centerOnNode = (nodeId) => {
        const element = document.getElementById(`node-card-${nodeId}`);
        const viewport = canvasViewportRef.current;
        if (element && viewport) {
            // Scroll matching node directly to center of viewport
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
        // Find topmost admins
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

    // --- Kinetic Panning Handlers ---
    const handleMouseDown = (e) => {
        if (e.button !== 0 || e.target.closest('button') || e.target.closest('input')) return;
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

    // --- Zoom Controls ---
    const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.1, 1.5));
    const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.1, 0.5));
    const handleResetZoom = () => {
        setZoomScale(1.0);
        handleGoToTop();
    };

    // --- Hierarchy Data Structuring ---
    const rootNodes = useMemo(() => {
        if (allUsers.length === 0) return [];

        const admins = allUsers.filter(u => u.role === 'admin');
        const tls = allUsers.filter(u => u.role === 'TL');
        const members = allUsers.filter(u => u.role === 'developer' || u.role === 'qa');

        // Resolve structural scope by current user role permissions
        const loggedInUserId = getIdString(user?._id);
        const loggedInUserRole = user?.role || 'admin';
        const myTeamLeads = (user?.teamLeads || []).map(tl => getIdString(tl));

        // Define dynamic tree nesting function
        const buildTree = (roots) => {
            return roots.map(root => {
                // Nested children are TLs who report to this admin
                let children = [];
                if (root.role === 'admin') {
                    const adminTLs = tls.filter(tl => (tl.teamLeads || []).map(t => getIdString(t)).includes(getIdString(root._id)));
                    children = adminTLs.length > 0 ? adminTLs : tls;
                } else if (root.role === 'TL') {
                    // Children under Team Leads
                    children = members.filter(m => (m.teamLeads || []).map(t => getIdString(t)).includes(getIdString(root._id)));
                }

                return {
                    ...root,
                    children: children.length > 0 ? buildTree(children) : []
                };
            });
        };

        // Decide top management roots based on role visibility
        if (loggedInUserRole === 'admin') {
            return buildTree(admins);
        } else if (loggedInUserRole === 'TL') {
            const selfTL = allUsers.find(u => getIdString(u._id) === loggedInUserId);
            return selfTL ? buildTree([selfTL]) : [];
        } else {
            const reportingTLs = allUsers.filter(u => u.role === 'TL' && myTeamLeads.includes(getIdString(u._id)));
            return reportingTLs.length > 0 ? buildTree(reportingTLs) : buildTree(admins);
        }
    }, [allUsers, user]);

    // Live search highlighting and centering trigger
    useEffect(() => {
        if (searchQuery.trim() && allUsers.length > 0) {
            const query = searchQuery.toLowerCase();
            const matched = allUsers.find(u => u.name.toLowerCase().includes(query));
            if (matched) {
                centerOnNode(getIdString(matched._id));
            }
        }
    }, [searchQuery, allUsers]);

    // Recursive Tree Node Renderer in Horizontal Layout
    const TreeNode = ({ node }) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node._id] !== false;

        const isSearchMatch = searchQuery.trim() && (
            node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            formatRole(node.role).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (node.department && node.department.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        return (
            <div className="flex flex-col items-center select-none">
                {/* Node Card */}
                <div 
                    id={`node-card-${node._id}`}
                    className={`bg-white border border-slate-200 rounded-[14px] px-6 py-4 shadow-sm flex items-center gap-4 w-[280px] text-left transition-all duration-300 relative z-10 ${
                        isSearchMatch ? 'ring-2 ring-purple-600 shadow-purple-50 shadow-lg scale-105 border-purple-300' : 'hover:shadow-md hover:border-slate-300'
                    }`}
                >
                    {/* Round avatar image / fallback */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm overflow-hidden flex-shrink-0">
                        {node.profilePic ? (
                            <img src={node.profilePic} alt={node.name} className="w-full h-full object-cover" />
                        ) : getInitials(node.name)}
                    </div>

                    {/* Employee info */}
                    <div className="flex-1 min-w-0">
                        <h6 className="text-sm font-bold text-slate-800 truncate mb-0.5">{node.name}</h6>
                        <p className="text-xs text-slate-400 font-medium truncate">{formatRole(node.role)}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Punjab</p>
                        <p className={`text-[9px] font-black tracking-wider uppercase mt-2 w-max rounded px-1.5 py-0.5 ${
                            groupByDept ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'text-slate-400'
                        }`}>
                            {node.department || "SOFTWARE DEVELOPMENT"}
                        </p>
                    </div>
                </div>

                {/* Collapse / Expand Indicator Trigger */}
                {hasChildren && (
                    <button 
                        onClick={() => toggleExpand(node._id)}
                        className="w-5 h-5 rounded-full bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center -mb-2.5 mt-2.5 shadow-md transition-colors z-20 cursor-pointer font-bold text-xs border border-white focus:outline-none"
                    >
                        {isExpanded ? "−" : "+"}
                    </button>
                )}

                {/* Vertical guiding connector line to child block */}
                {hasChildren && isExpanded && (
                    <div className="w-0.5 h-8 bg-slate-200 mt-2.5" />
                )}

                {/* Children container block in horizontal flow */}
                {hasChildren && isExpanded && (
                    <div className="flex gap-8 relative pt-6 justify-center">
                        {node.children.map((child, idx) => {
                            const childrenArr = node.children;
                            const isFirst = idx === 0;
                            const isLast = idx === childrenArr.length - 1;
                            const isSingle = childrenArr.length === 1;

                            return (
                                <div key={child._id || idx} className="flex flex-col items-center relative">
                                    {/* Horizontal structural guideline span */}
                                    {!isSingle && (
                                        <div className="absolute -top-6 left-0 right-0 flex h-0.5">
                                            <div className={`flex-1 ${isFirst ? 'bg-transparent' : 'bg-slate-200'}`} />
                                            <div className={`flex-1 ${isLast ? 'bg-transparent' : 'bg-slate-200'}`} />
                                        </div>
                                    )}
                                    {/* Vertical guideline segment to child */}
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-200" />
                                    
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
        <div className="flex h-screen bg-slate-50">
            <AdminSidebar role={currentRole} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Topbar DashboardTile="Organization Matrix" role={currentRole} />

                {/* Fixed Control Bar matching screenshot */}
                <div className="bg-white px-8 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-30 shadow-sm">
                    {/* Search input box */}
                    <div className="relative w-full lg:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="Search employee"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all outline-none"
                        />
                    </div>

                    {/* Navigation buttons and grouping controls */}
                    <div className="flex flex-wrap items-center gap-4 text-slate-500 text-xs font-semibold select-none">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Go to</span>
                            <button 
                                onClick={handleGoToMyDepartment}
                                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                                <Building2 className="w-3.5 h-3.5" /> My Department
                            </button>
                            <button 
                                onClick={handleGoToTop}
                                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                                <Landmark className="w-3.5 h-3.5" /> Top of the Org
                            </button>
                            <button 
                                onClick={handleGoToMe}
                                className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
                            >
                                <User className="w-3.5 h-3.5" /> Me
                            </button>
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
                            <span>Group by department</span>
                        </div>
                    </div>
                </div>

                {/* Miro-Style Interactive Panning Canvas viewport */}
                <div 
                    ref={canvasViewportRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    className={`flex-1 overflow-auto bg-slate-50 p-16 select-none relative scroll-smooth scrollbar-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <div 
                        ref={canvasContentRef}
                        style={{ 
                            transform: `scale(${zoomScale})`, 
                            transformOrigin: 'top center',
                            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                        }}
                        className="w-max mx-auto flex justify-center pb-32"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-32">
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                <p className="text-sm text-slate-400 font-semibold">Generating organizational view...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-12">
                                {rootNodes.length > 0 ? (
                                    rootNodes.map((rootNode, idx) => (
                                        <div key={rootNode._id || idx} className="flex flex-col items-center">
                                            <TreeNode node={rootNode} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <div className="p-4 bg-slate-100 text-slate-400 rounded-full">
                                            <UserMinus className="w-8 h-8" />
                                        </div>
                                        <div className="text-center">
                                            <h5 className="font-bold text-slate-700">No hierarchy results resolved</h5>
                                            <p className="text-xs text-slate-400 font-semibold mt-1">Please check user profile structures in employees menu</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Canvas Zoom Controls on the Right side matching screenshot */}
                <div className="absolute right-8 bottom-28 flex flex-col gap-2 z-40 select-none">
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
        </div>
    );
};

export default OrganizationTree;
