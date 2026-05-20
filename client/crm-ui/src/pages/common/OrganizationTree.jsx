import { useState, useEffect, useRef, useMemo } from "react";
import {
    Loader2, Building2, UserMinus, Plus, Minus, Pin,
    User, Landmark, MoreVertical, 
    Eye, UserCheck, Users
} from "lucide-react";
import { userService, projectService, taskService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/Topbar";
import ProfileModal from "../../components/ProfileModal";

// Pure helper to get string ID
const getIdString = (id) => {
    if (!id) return "";
    if (typeof id === 'object') return id._id ? String(id._id) : String(id);
    return String(id);
};

// Pure helper to get department badge color theme
const getDeptColor = (dept) => {
    if (!dept) return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' };
    const d = String(dept).toLowerCase().trim();
    if (d.includes('eng') || d.includes('dev') || d.includes('tech') || d.includes('soft')) {
        return { bg: 'bg-blue-50/80', text: 'text-blue-600', border: 'border-blue-100/50' };
    }
    if (d.includes('mark') || d.includes('sale') || d.includes('pr')) {
        return { bg: 'bg-rose-50/80', text: 'text-rose-600', border: 'border-rose-100/50' };
    }
    if (d.includes('design') || d.includes('ui') || d.includes('ux')) {
        return { bg: 'bg-amber-50/80', text: 'text-amber-600', border: 'border-amber-100/50' };
    }
    if (d.includes('hr') || d.includes('talent') || d.includes('peop')) {
        return { bg: 'bg-emerald-50/80', text: 'text-emerald-600', border: 'border-emerald-100/50' };
    }
    if (d.includes('finance') || d.includes('acc') || d.includes('pay') || d.includes('fin')) {
        return { bg: 'bg-indigo-50/80', text: 'text-indigo-600', border: 'border-indigo-100/50' };
    }
    return { bg: 'bg-purple-50/80', text: 'text-purple-600', border: 'border-purple-100/50' };
};

const OrganizationTree = () => {
    const { user } = useAuth();

    // Core States
    const [allUsers, setAllUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI Interaction States
    const [activeTab, setActiveTab] = useState("Top"); // "Top" | "Team"
    const [zoomScale, setZoomScale] = useState(1.0);
    const [expandedNodes, setExpandedNodes] = useState({});
    const [activeMenuId, setActiveMenuId] = useState(null);

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
                    userService.getAllUsers({ status: 'active', orgTree: true }),
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

    // Find complete user details in fetched allUsers list
    const currentUserObj = useMemo(() => {
        if (!user?._id || allUsers.length === 0) return null;
        return allUsers.find(u => getIdString(u._id) === getIdString(user._id));
    }, [allUsers, user]);

    // Calculate all user IDs related to the logged-in user (leads, teammates, reports)
    const meRelatedNodeIds = useMemo(() => {
        if (!currentUserObj || allUsers.length === 0) return new Set();
        const set = new Set();
        const myId = getIdString(currentUserObj._id);
        
        // Add myself
        set.add(myId);

        // Add my team leads
        const leads = (currentUserObj.teamLeads || []).map(l => getIdString(l));
        leads.forEach(id => set.add(id));

        // Add my teammates (peers sharing at least one team lead)
        if (leads.length > 0) {
            allUsers.forEach(u => {
                const uLeads = (u.teamLeads || []).map(l => getIdString(l));
                if (uLeads.some(lId => leads.includes(lId))) {
                    set.add(getIdString(u._id));
                }
            });
        }

        // Add my subordinates (people who report directly to me)
        allUsers.forEach(u => {
            const uLeads = (u.teamLeads || []).map(l => getIdString(l));
            if (uLeads.includes(myId)) {
                set.add(getIdString(u._id));
            }
        });

        return set;
    }, [currentUserObj, allUsers]);

    // (departments filter removed for clean department-grouped hierarchy matrix)

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
    const handleGoToTop = () => {
        const admins = allUsers.filter(u => u.role === 'admin');
        if (admins.length > 0) {
            centerOnNode(getIdString(admins[0]._id));
        }
    };

    const handleGoToMyTeam = () => {
        const roleLower = String(user?.role || 'admin').toLowerCase();
        if (roleLower === 'admin') {
            handleGoToTop();
        } else if (roleLower === 'tl') {
            if (user?._id) {
                centerOnNode(getIdString(user._id));
            }
        } else {
            const myLeadIds = (currentUserObj?.teamLeads || []).map(l => getIdString(typeof l === 'object' ? l._id : l));
            if (myLeadIds.length > 0) {
                centerOnNode(myLeadIds[0]);
            } else if (user?._id) {
                centerOnNode(getIdString(user._id));
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

    // --- Dynamic Tree Hierarchy Builder ---
    const rootNodes = useMemo(() => {
        if (allUsers.length === 0) return [];

        const activeUsers = allUsers.filter(u => u.isActive !== false);

        // Helper: Check if a user ID reports to a given lead ID
        const reportsTo = (emp, leadId) => {
            if (!emp) return false;
            return (emp.teamLeads || []).some(lead => {
                if (!lead) return false;
                const id = typeof lead === 'object' && lead._id ? lead._id : lead;
                return getIdString(id) === getIdString(leadId);
            });
        };

        // Recursive tree builder for full/general structures
        const buildTreeFromRoots = (roots, tlsList, staffList, isTopView) => {
            return roots.map(root => {
                let children = [];
                if (root.role === 'admin') {
                    if (isTopView) {
                        // Gather TLs reporting to this admin
                        let directTLs = tlsList.filter(tl => reportsTo(tl, root._id));
                        // Gather staff reporting to this admin
                        let directStaff = staffList.filter(s => reportsTo(s, root._id));

                        // Fallback for first Admin: collect orphaned TLs and orphaned staff
                        const allAdminsInScope = roots.filter(u => u.role === 'admin');
                        if (allAdminsInScope[0] && getIdString(root._id) === getIdString(allAdminsInScope[0]._id)) {
                            // Orphaned TLs
                            const orphanedTLs = tlsList.filter(tl => {
                                const hasValidAdminLead = (tl.teamLeads || []).some(leadId => 
                                    allAdminsInScope.some(adm => getIdString(adm._id) === getIdString(leadId))
                                );
                                return !hasValidAdminLead;
                            });
                            directTLs = [...directTLs, ...orphanedTLs];

                            // Orphaned staff (no active TL in the database)
                            const orphanedStaff = staffList.filter(s => {
                                const hasActiveTL = (s.teamLeads || []).some(leadId =>
                                    tlsList.some(tl => getIdString(tl._id) === getIdString(leadId))
                                );
                                const reportsToAdmin = (s.teamLeads || []).some(leadId =>
                                    allAdminsInScope.some(adm => getIdString(adm._id) === getIdString(leadId))
                                );
                                return !hasActiveTL && !reportsToAdmin;
                            });
                            directStaff = [...directStaff, ...orphanedStaff];
                        }

                        // Group these TLs and staff by department
                        const deptsMap = {};
                        const addToDept = (node) => {
                            const deptName = node.department || "Engineering";
                            if (!deptsMap[deptName]) {
                                deptsMap[deptName] = [];
                            }
                            deptsMap[deptName].push(node);
                        };

                        directTLs.forEach(addToDept);
                        directStaff.forEach(addToDept);

                        // Create virtual department nodes under this Admin
                        children = Object.keys(deptsMap).map(deptName => {
                            return {
                                _id: `dept_${getIdString(root._id)}_${deptName}`,
                                name: deptName,
                                role: 'department',
                                isVirtual: true,
                                department: deptName,
                                children: deptsMap[deptName]
                            };
                        });
                    } else {
                        // In My Team tab: Flat tree structure managed under logged-in Admin
                        let directTLs = tlsList.filter(tl => reportsTo(tl, root._id));
                        const allAdminsInScope = roots.filter(u => u.role === 'admin');
                        if (allAdminsInScope[0] && getIdString(root._id) === getIdString(allAdminsInScope[0]._id)) {
                            const orphanedTLs = tlsList.filter(tl => {
                                const hasValidAdminLead = (tl.teamLeads || []).some(leadId => 
                                    allAdminsInScope.some(adm => getIdString(adm._id) === getIdString(leadId))
                                );
                                return !hasValidAdminLead;
                            });
                            directTLs = [...directTLs, ...orphanedTLs];
                        }
                        children = directTLs;
                    }
                } else if (root.role === 'TL') {
                    // Find developers & QAs reporting to this TL
                    children = staffList.filter(m => reportsTo(m, root._id));
                } else if (root.role === 'department') {
                    // Virtual department node: children are already mapped
                    children = root.children;
                }

                return {
                    ...root,
                    children: children.length > 0 ? buildTreeFromRoots(children, tlsList, staffList, isTopView) : []
                };
            });
        };

        // If in "My Team" tab, filter hierarchy dynamically by role
        if (activeTab === "Team") {
            const roleLower = String(user?.role || 'admin').toLowerCase();
            
            if (roleLower === 'admin') {
                const admins = activeUsers.filter(u => u.role === 'admin' && getIdString(u._id) === getIdString(user?._id));
                const tls = activeUsers.filter(u => u.role === 'TL');
                const staff = activeUsers.filter(u => u.role === 'developer' || u.role === 'qa');
                if (admins.length > 0) {
                    return buildTreeFromRoots(admins, tls, staff, false);
                } else {
                    const allAdmins = activeUsers.filter(u => u.role === 'admin');
                    return buildTreeFromRoots(allAdmins, tls, staff, false);
                }
            } else if (roleLower === 'tl') {
                const currentTlObj = activeUsers.find(u => getIdString(u._id) === getIdString(user._id));
                if (currentTlObj) {
                    const staff = activeUsers.filter(u => (u.role === 'developer' || u.role === 'qa') && reportsTo(u, currentTlObj._id));
                    return [{
                        ...currentTlObj,
                        children: staff.map(s => ({ ...s, children: [] }))
                    }];
                }
                return [];
            } else {
                // Developer & QA: show their TL + teammates under same TL
                const currentEmpObj = activeUsers.find(u => getIdString(u._id) === getIdString(user._id));
                const myLeadIds = (currentEmpObj?.teamLeads || []).map(l => getIdString(typeof l === 'object' ? l._id : l));
                const myLeads = activeUsers.filter(u => u.role === 'TL' && myLeadIds.includes(getIdString(u._id)));
                
                if (myLeads.length > 0) {
                    return myLeads.map(lead => {
                        const staff = activeUsers.filter(u => (u.role === 'developer' || u.role === 'qa') && reportsTo(u, lead._id));
                        return {
                            ...lead,
                            children: staff.map(s => ({ ...s, children: [] }))
                        };
                    });
                } else {
                    if (currentEmpObj) {
                        return [{ ...currentEmpObj, children: [] }];
                    }
                    return [];
                }
            }
        }

        // Top of the Organization tab: Show full hierarchy with department-wise visual separation
        const admins = activeUsers.filter(u => u.role === 'admin');
        const tls = activeUsers.filter(u => u.role === 'TL');
        const staff = activeUsers.filter(u => u.role === 'developer' || u.role === 'qa');

        if (admins.length > 0) {
            return buildTreeFromRoots(admins, tls, staff, true);
        } else {
            // Treat departments as root nodes if no Admins exist
            const deptsMap = {};
            const addToDept = (node) => {
                const deptName = node.department || "Engineering";
                if (!deptsMap[deptName]) {
                    deptsMap[deptName] = [];
                }
                deptsMap[deptName].push(node);
            };

            tls.forEach(addToDept);

            const orphanedStaff = staff.filter(s => {
                return !(s.teamLeads || []).some(leadId =>
                    tls.some(tl => getIdString(tl._id) === getIdString(leadId))
                );
            });
            orphanedStaff.forEach(addToDept);

            const deptRoots = Object.keys(deptsMap).map(deptName => {
                return {
                    _id: `dept_root_${deptName}`,
                    name: deptName,
                    role: 'department',
                    isVirtual: true,
                    department: deptName,
                    children: deptsMap[deptName]
                };
            });

            return buildTreeFromRoots(deptRoots, tls, staff, true);
        }
    }, [allUsers, activeTab, user]);


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

        const isMe = nodeStrId === loggedInUserId;

        if (node.isVirtual) {
            const deptColor = getDeptColor(node.department);

            return (
                <div className="flex flex-col items-center transition-all duration-300">
                    {/* Beautiful Premium Department Card */}
                    <div
                        id={`node-card-${node._id}`}
                        className="bg-white/95 backdrop-blur-md border rounded-[22px] p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex items-center gap-4 w-[280px] text-left relative z-10 border-slate-200/80 hover:border-purple-300 ring-1 ring-slate-100 hover:ring-purple-100"
                    >
                        <div className={`w-12 h-12 rounded-2xl ${deptColor.bg} ${deptColor.text} ${deptColor.border} border flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0`}>
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-bold">Department</span>
                            <h6 className="text-sm font-black text-slate-800 truncate leading-tight mt-0.5">{node.department || "General"}</h6>
                            <p className="text-[11px] text-slate-500 font-semibold truncate leading-normal mt-0.5">
                                {node.children?.length || 0} Member{(node.children?.length !== 1) ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Collapse/Expand Node Toggles */}
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(node._id);
                            }}
                            className="w-6 h-6 rounded-full flex items-center justify-center -mb-3 mt-3 shadow-md transition-all z-20 cursor-pointer text-sm font-black border border-white focus:outline-none bg-slate-200 hover:bg-slate-300 text-slate-600"
                        >
                            {isExpanded ? "−" : "+"}
                        </button>
                    )}

                    {/* Vertical guiding connector to child row */}
                    {hasChildren && isExpanded && (
                        <div className="w-0.5 h-8 mt-3 bg-slate-200/80" />
                    )}

                    {/* Children row container */}
                    {hasChildren && isExpanded && (
                        <div className="flex gap-10 relative pt-6 justify-center">
                            {node.children.map((child, idx) => {
                                const childrenArr = node.children;
                                const isFirst = idx === 0;
                                const isLast = idx === childrenArr.length - 1;
                                const isSingle = childrenArr.length === 1;

                                return (
                                    <div key={child._id || idx} className="flex flex-col items-center relative">
                                        {/* Horizontal Guidelines connected span */}
                                        {!isSingle && (
                                            <div className="absolute -top-6 left-0 right-0 flex h-0.5">
                                                <div className={`flex-1 ${isFirst ? 'bg-transparent' : 'bg-slate-200/80'}`} />
                                                <div className={`flex-1 ${isLast ? 'bg-transparent' : 'bg-slate-200/80'}`} />
                                            </div>
                                        )}
                                        {/* Vertical Guideline connector to child card */}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-200/80" />

                                        <TreeNode node={child} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center transition-all duration-300">
                {/* Node Card Container */}
                <div
                    id={`node-card-${node._id}`}
                    onClick={() => handleOpenProfile(node)}
                    className={`bg-white/95 backdrop-blur-md border rounded-[22px] p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col w-[300px] text-left relative z-10 cursor-pointer ${isMe ? 'ring-2 ring-amber-500 border-amber-300 shadow-amber-50 shadow-lg scale-[1.02]' : 'border-slate-200/80 hover:border-slate-300'}`}
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider mt-1.5 border ${getDeptColor(node.department).bg} ${getDeptColor(node.department).text} ${getDeptColor(node.department).border}`}>
                                {node.department || "Engineering"}
                            </span>
                        </div>
                    </div>

                    {/* Action Dropdown Menu */}
                    {activeMenuId === nodeStrId && (
                        <div className="absolute top-12 right-6 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 w-36 z-50 animate-in fade-in slide-in-from-top-2 duration-150" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => { handleOpenProfile(node); setActiveMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Eye className="w-3.5 h-3.5" /> View Profile
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
                                <span />
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
                        className="w-6 h-6 rounded-full flex items-center justify-center -mb-3 mt-3 shadow-md transition-all z-20 cursor-pointer text-sm font-black border border-white focus:outline-none bg-slate-200 hover:bg-slate-300 text-slate-600"
                    >
                        {isExpanded ? "−" : "+"}
                    </button>
                )}

                {/* Vertical guiding connector to child row */}
                {hasChildren && isExpanded && (
                    <div className="w-0.5 h-8 mt-3 bg-slate-200/80" />
                )}

                {/* Children row container */}
                {hasChildren && isExpanded && (
                    <div className="flex gap-10 relative pt-6 justify-center">
                        {node.children.map((child, idx) => {
                            const childrenArr = node.children;
                            const isFirst = idx === 0;
                            const isLast = idx === childrenArr.length - 1;
                            const isSingle = childrenArr.length === 1;

                            return (
                                <div key={child._id || idx} className="flex flex-col items-center relative">
                                    {/* Horizontal Guidelines connected span */}
                                    {!isSingle && (
                                        <div className="absolute -top-6 left-0 right-0 flex h-0.5">
                                            <div className={`flex-1 ${isFirst ? 'bg-transparent' : 'bg-slate-200/80'}`} />
                                            <div className={`flex-1 ${isLast ? 'bg-transparent' : 'bg-slate-200/80'}`} />
                                        </div>
                                    )}
                                    {/* Vertical Guideline connector to child card */}
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-200/80" />

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

                        {/* Navigation Actions Panel */}
                        <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100/80 flex justify-center items-center gap-4 w-full select-none">

                            {/* View Selector Tabs */}
                            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
                                <button
                                    onClick={() => {
                                        setActiveTab("Top");
                                        setTimeout(handleGoToTop, 100);
                                    }}
                                    className={`px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 text-xs font-bold focus:outline-none ${activeTab === 'Top' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <Landmark className="w-3.5 h-3.5" /> Top of the Organization
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab("Team");
                                        setTimeout(handleGoToMyTeam, 100);
                                    }}
                                    className={`px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 text-xs font-bold focus:outline-none ${activeTab === 'Team' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <Users className="w-3.5 h-3.5" /> My Team
                                </button>
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
                                            <div className="flex flex-row gap-16 justify-center items-start">
                                                {rootNodes.map((rootNode, idx) => (
                                                    <TreeNode key={rootNode._id || idx} node={rootNode} />
                                                ))}
                                            </div>
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
