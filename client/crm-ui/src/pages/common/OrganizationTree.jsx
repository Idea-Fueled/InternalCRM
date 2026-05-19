import React, { useState, useEffect, useMemo } from "react";
import { 
    Users, Search, ChevronDown, ChevronRight, Briefcase, 
    UserCheck, Award, Network, CheckCircle2, Shield, Loader2,
    Eye, Building2, UserMinus
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
    const [selectedDept, setSelectedDept] = useState("All");
    const [viewMode, setViewMode] = useState("Full"); // "Full" | "MyTeam" | "ReportingChain"
    const [expandedNodes, setExpandedNodes] = useState({});
    const [selectedChainUser, setSelectedChainUser] = useState("");

    const currentRole = user?.role === 'TL' ? 'teamLead' : user?.role || 'admin';

    // Fetch active users in organizational directory
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

    // Expand all nodes initially once users load
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

    // Helper to get string ID
    const getIdString = (id) => {
        if (!id) return "";
        if (typeof id === 'object') return id._id ? String(id._id) : String(id);
        return String(id);
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

    // Format role names beautifully
    const formatRole = (r) => {
        if (r === 'TL') return 'Team Lead';
        if (r === 'qa') return 'QA';
        return r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Employee';
    };

    // Role styling
    const getRoleStyles = (r) => {
        switch (r) {
            case 'admin':
                return {
                    border: 'border-l-blue-500 hover:border-blue-400',
                    bg: 'bg-blue-50 text-blue-700 border-blue-100',
                    initialsBg: 'from-blue-600 to-indigo-600',
                    badge: 'bg-blue-100 text-blue-800'
                };
            case 'TL':
                return {
                    border: 'border-l-purple-500 hover:border-purple-400',
                    bg: 'bg-purple-50 text-purple-700 border-purple-100',
                    initialsBg: 'from-purple-600 to-violet-600',
                    badge: 'bg-purple-100 text-purple-800'
                };
            case 'developer':
                return {
                    border: 'border-l-indigo-500 hover:border-indigo-400',
                    bg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                    initialsBg: 'from-indigo-600 to-blue-500',
                    badge: 'bg-indigo-100 text-indigo-800'
                };
            case 'qa':
                return {
                    border: 'border-l-pink-500 hover:border-pink-400',
                    bg: 'bg-pink-50 text-pink-700 border-pink-100',
                    initialsBg: 'from-pink-600 to-rose-600',
                    badge: 'bg-pink-100 text-pink-800'
                };
            default:
                return {
                    border: 'border-l-slate-400 hover:border-slate-300',
                    bg: 'bg-slate-50 text-slate-700 border-slate-100',
                    initialsBg: 'from-slate-500 to-slate-600',
                    badge: 'bg-slate-100 text-slate-800'
                };
        }
    };

    const toggleExpand = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    // --- Dynamic Hierarchy Builder ---
    const buildHierarchyData = () => {
        const loggedInUserId = getIdString(user?._id);
        const loggedInUserRole = user?.role || 'admin';
        const myTeamLeads = (user?.teamLeads || []).map(tl => getIdString(tl));

        // Filter active system list based on view modes & search queries
        let workingList = [...allUsers];

        // 1. Search Query Filters
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            workingList = workingList.filter(u => 
                u.name.toLowerCase().includes(query) || 
                formatRole(u.role).toLowerCase().includes(query) ||
                (u.department && u.department.toLowerCase().includes(query))
            );
        }

        // 2. Department Selector Filter
        if (selectedDept !== "All") {
            workingList = workingList.filter(u => u.department === selectedDept);
        }

        // Divide into Roles
        const admins = workingList.filter(u => u.role === 'admin');
        const tls = workingList.filter(u => u.role === 'TL');
        const members = workingList.filter(u => u.role === 'developer' || u.role === 'qa');

        // Resolve Tree Data based on View Modes + Logged-in User Roles
        if (viewMode === 'MyTeam') {
            // "My Team" structural scope
            if (loggedInUserRole === 'admin') {
                // Admins see all Team Leads and members under them
                return admins.map(adm => ({
                    ...adm,
                    children: tls.map(tl => ({
                        ...tl,
                        children: members.filter(m => (m.teamLeads || []).map(t => getIdString(t)).includes(getIdString(tl._id)))
                    }))
                }));
            } else if (loggedInUserRole === 'TL') {
                // Team Lead sees themselves at top, with developers & QAs reporting under them
                const selfTL = allUsers.find(u => getIdString(u._id) === loggedInUserId);
                if (!selfTL) return [];
                return [{
                    ...selfTL,
                    children: members.filter(m => (m.teamLeads || []).map(t => getIdString(t)).includes(loggedInUserId))
                }];
            } else {
                // Developer/QA sees their reporting TLs at top, with all teammates under them
                const reportingTLs = allUsers.filter(u => u.role === 'TL' && myTeamLeads.includes(getIdString(u._id)));
                return reportingTLs.map(tl => ({
                    ...tl,
                    children: allUsers.filter(u => 
                        (u.role === 'developer' || u.role === 'qa') &&
                        (u.teamLeads || []).map(t => getIdString(t)).includes(getIdString(tl._id))
                    )
                }));
            }
        }

        if (viewMode === 'ReportingChain' && selectedChainUser) {
            // "Reporting Chain" scope: dynamic vertical upward/downward reporting path for selected user
            const focusUser = allUsers.find(u => getIdString(u._id) === selectedChainUser);
            if (!focusUser) return [];

            if (focusUser.role === 'admin') {
                return [{
                    ...focusUser,
                    children: tls.filter(tl => (tl.teamLeads || []).map(t => getIdString(t)).includes(getIdString(focusUser._id)))
                }];
            } else if (focusUser.role === 'TL') {
                const focusManagers = allUsers.filter(u => u.role === 'admin' && (focusUser.teamLeads || []).map(t => getIdString(t)).includes(getIdString(u._id)));
                const rootManagers = focusManagers.length > 0 ? focusManagers : allUsers.filter(u => u.role === 'admin');
                
                return rootManagers.map(mgr => ({
                    ...mgr,
                    children: [{
                        ...focusUser,
                        children: members.filter(m => (m.teamLeads || []).map(t => getIdString(t)).includes(getIdString(focusUser._id)))
                    }]
                }));
            } else {
                const focusTLs = allUsers.filter(u => u.role === 'TL' && (focusUser.teamLeads || []).map(t => getIdString(t)).includes(getIdString(u._id)));
                
                return focusTLs.map(tl => {
                    const tlManagers = allUsers.filter(u => u.role === 'admin' && (tl.teamLeads || []).map(t => getIdString(t)).includes(getIdString(u._id)));
                    const rootMgrs = tlManagers.length > 0 ? tlManagers : allUsers.filter(u => u.role === 'admin');
                    
                    return rootMgrs.map(mgr => ({
                        ...mgr,
                        children: [{
                            ...tl,
                            children: [focusUser]
                        }]
                    }));
                }).flat();
            }
        }

        // DEFAULT: "Full Organization" Tree representation
        // Root nodes are Admins.
        // Nested children of Admins are Team Leads who report to them (or all TLs if no direct mapping).
        // Nested children of Team Leads are Developers and QAs who report to them.
        return admins.map(adm => {
            const adminTLs = tls.filter(tl => (tl.teamLeads || []).map(t => getIdString(t)).includes(getIdString(adm._id)));
            const childTLs = adminTLs.length > 0 ? adminTLs : tls;

            return {
                ...adm,
                children: childTLs.map(tl => ({
                    ...tl,
                    children: members.filter(m => (m.teamLeads || []).map(t => getIdString(t)).includes(getIdString(tl._id)))
                }))
            };
        });
    };

    const treeData = buildHierarchyData();

    // Recursive component to render tree nodes with guidelines
    const TreeNode = ({ node }) => {
        const styles = getRoleStyles(node.role);
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node._id] !== false;

        // Check if this node matches the search query for high-fidelity highlighting
        const isSearchMatch = searchQuery.trim() && (
            node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            formatRole(node.role).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (node.department && node.department.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        return (
            <div className="flex flex-col relative">
                {/* Node Card wrapper */}
                <div className="flex items-center gap-3 relative z-10">
                    
                    {/* Collapsible toggle */}
                    {hasChildren ? (
                        <button 
                            onClick={() => toggleExpand(node._id)}
                            className="p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:text-slate-700 transition-colors z-20 cursor-pointer focus:outline-none"
                        >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                    ) : (
                        <div className="w-5.5 h-5.5 flex-shrink-0" />
                    )}

                    {/* Org Node Card */}
                    <div className={`flex items-center gap-4 bg-white px-5 py-4 border-l-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 w-full max-w-sm ${styles.border} ${isSearchMatch ? 'ring-2 ring-blue-500 shadow-blue-50/50 scale-[1.01]' : ''}`}>
                        
                        {/* Avatar initials / Image */}
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${styles.initialsBg} text-white flex items-center justify-center font-extrabold text-sm shadow-sm overflow-hidden flex-shrink-0`}>
                            {node.profilePic ? (
                                <img src={node.profilePic} alt={node.name} className="w-full h-full object-cover" />
                            ) : getInitials(node.name)}
                        </div>

                        {/* Node details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <h5 className="text-sm font-bold text-slate-800 truncate">{node.name}</h5>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${styles.bg}`}>
                                    {formatRole(node.role)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold">
                                <span className="flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                    {node.department || "Engineering"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guidelines connectors recursively drawn */}
                {hasChildren && isExpanded && (
                    <div className="relative pl-7 ml-7 border-l border-slate-200/80 mt-1 space-y-4 pt-1 pb-1">
                        {node.children.map((child, idx) => (
                            <div key={child._id || idx} className="relative">
                                {/* Horizontal guideline */}
                                <div className="absolute top-8 -left-7 w-7 border-t border-slate-200/80" />
                                <TreeNode node={child} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Unified Portal Sidebar */}
            <AdminSidebar role={currentRole} />

            {/* Main Layout Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar DashboardTile="Organization Matrix" role={currentRole} />

                {/* Dashboard Inner Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
                    <div className="max-w-6xl mx-auto space-y-6">

                        {/* Top Control Board: Title, Search, Filters & View Options */}
                        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100/80 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                        <Network className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">Organizational Hierarchy</h3>
                                        <p className="text-xs text-slate-400 font-semibold mt-0.5">Visualize direct reporting structures, teammates, and leadership layout</p>
                                    </div>
                                </div>

                                {/* View Selector */}
                                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-slate-600 w-max self-start md:self-auto">
                                    {user?.role === 'admin' && (
                                        <button 
                                            onClick={() => setViewMode("Full")}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${viewMode === 'Full' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-800'}`}
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Full Org
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setViewMode("MyTeam")}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${viewMode === 'MyTeam' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-800'}`}
                                    >
                                        <Users className="w-3.5 h-3.5" /> My Team
                                    </button>
                                    <button 
                                        onClick={() => setViewMode("ReportingChain")}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${viewMode === 'ReportingChain' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-800'}`}
                                    >
                                        <UserCheck className="w-3.5 h-3.5" /> Chain view
                                    </button>
                                </div>
                            </div>

                            {/* Search and Filters Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                                
                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search by name, role, department..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                    />
                                </div>

                                {/* Department selection filter */}
                                <div className="relative">
                                    <select 
                                        value={selectedDept}
                                        onChange={e => setSelectedDept(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:border-blue-500 transition-all outline-none cursor-pointer"
                                    >
                                        <option value="All">All Departments</option>
                                        {departments.filter(d => d !== "All").map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Chain User selection (Only visible during Chain View mode) */}
                                {viewMode === 'ReportingChain' && (
                                    <div className="relative">
                                        <select 
                                            value={selectedChainUser}
                                            onChange={e => setSelectedChainUser(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:border-blue-500 transition-all outline-none cursor-pointer"
                                        >
                                            {allUsers.map(u => (
                                                <option key={u._id} value={u._id}>{u.name} ({formatRole(u.role)})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tree Diagram Container */}
                        <div className="bg-white p-8 rounded-[24px] shadow-sm border border-slate-100/80 min-h-[450px] relative">
                            {loading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                    <p className="text-sm text-slate-400 font-semibold">Resolving company matrix structure...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {treeData.length > 0 ? (
                                        treeData.map((rootNode, idx) => (
                                            <div key={rootNode._id || idx} className="border-b border-slate-50 last:border-b-0 pb-6 last:pb-0">
                                                <TreeNode node={rootNode} />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                                            <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                                                <UserMinus className="w-8 h-8" />
                                            </div>
                                            <div className="text-center">
                                                <h5 className="font-bold text-slate-700">No hierarchy results found</h5>
                                                <p className="text-xs text-slate-400 font-semibold mt-1">Try resetting the department filter or editing search terms</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationTree;
