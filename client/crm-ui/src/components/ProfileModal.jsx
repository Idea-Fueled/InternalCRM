import React, { useState, useEffect, useRef } from "react";
import { 
    X, Mail, Phone, Briefcase, Calendar, Camera, Loader2, 
    Trash2, Users, UserCheck, Award, ShieldAlert
} from "lucide-react";
import { authService, userService } from "../api/services";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

// Helper to robustly fetch string ID from any ID type
const getIdString = (id) => {
    if (!id) return "";
    if (typeof id === 'object') return id._id ? String(id._id) : String(id);
    return String(id);
};

// Helper to get initials
const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Helper to format role names beautifully
const formatRole = (r) => {
    if (r === 'TL') return 'Team Lead';
    if (r === 'qa') return 'QA';
    return r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Employee';
};

// Role style mapping
const getRoleBadgeStyle = (r) => {
    switch (r) {
        case 'admin':
            return 'bg-blue-50 text-blue-700 border-blue-100/50';
        case 'TL':
            return 'bg-purple-50 text-purple-700 border-purple-100/50';
        case 'developer':
            return 'bg-indigo-50 text-indigo-700 border-indigo-100/50';
        case 'qa':
            return 'bg-pink-50 text-pink-700 border-pink-100/50';
        default:
            return 'bg-slate-50 text-slate-700 border-slate-100/50';
    }
};

const getUserRoleCategory = (u) => {
    if (!u) return 'employee';
    const role = (u.role || '').toLowerCase();
    const designation = (u.designation || '').toLowerCase();
    if (role === 'admin' || designation === 'admin') {
        return 'admin';
    }
    const checkText = designation || role;
    if (checkText.includes('qa')) {
        return 'qa';
    }
    if (checkText.includes('team lead') || checkText.includes('lead')) {
        return 'TL';
    }
    return 'employee';
};

const ProfileModal = ({ isOpen, onClose, user, role, displayName, displayRole, initial }) => {
    const { user: currentUser, updateUserProfile, logout } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [isLoadingRelations, setIsLoadingRelations] = useState(false);
    const fileInputRef = useRef(null);

    // Fetch relations when modal is opened
    useEffect(() => {
        if (!isOpen) return;

        const fetchRelations = async () => {
            try {
                setIsLoadingRelations(true);
                const res = await userService.getAllUsers({ status: 'active', orgTree: true });
                if (res.data?.success && Array.isArray(res.data.data)) {
                    setAllUsers(res.data.data);
                }
            } catch (err) {
                console.error("Failed to load hierarchy relations:", err);
            } finally {
                setIsLoadingRelations(false);
            }
        };

        fetchRelations();
    }, [isOpen]);

    if (!isOpen) return null;

    // Handle profile pic upload
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please select a valid image file");
            return;
        }

        const formData = new FormData();
        formData.append('profilePic', file);

        try {
            setIsUploading(true);
            const res = await authService.updateProfilePic(formData);
            if (res.data?.profilePic) {
                updateUserProfile({ profilePic: res.data.profilePic });
                toast.success("Profile picture updated successfully!");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error.response?.data?.message || "Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    // Handle profile pic removal
    const handleImageDelete = async () => {
        try {
            setIsUploading(true);
            await authService.deleteProfilePic();
            updateUserProfile({ profilePic: "" });
            toast.success("Profile picture removed!");
        } catch (error) {
            console.error("Pic deletion error:", error);
            toast.error(error.response?.data?.message || "Failed to remove profile picture");
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Logged out successfully");
            onClose();
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Failed to logout. Please try again.");
        }
    };
    // --- Dynamic Relations Calculations ---
    const userRole = user?.role || role;
    const canSeeReason = currentUser?.role === 'admin' || currentUser?.role === 'TL';
    const isMyProfile = user && currentUser && (getIdString(user._id) === getIdString(currentUser._id) || user.email === currentUser.email);

    const myReportingManagersIds = (user?.reportingManagers || []).map(m => getIdString(m));
    const myTeamLeadIds = (user?.teamLeads || []).map(tl => getIdString(tl));
    const myManagerId = user?.reportingManager?._id || user?.reportingManager;

    // 1. Calculations for Developer / QA / Dynamic Employee
    const reportingManagers = allUsers.filter(u => {
        const uId = getIdString(u._id);
        if (myReportingManagersIds.length > 0) {
            return myReportingManagersIds.includes(uId);
        }
        return (getUserRoleCategory(u) === 'TL' || getUserRoleCategory(u) === 'admin') &&
            ((myManagerId && uId === getIdString(myManagerId)) ||
             (!myManagerId && myTeamLeadIds.includes(uId)));
    });

    const teammates = allUsers.filter(u => {
        if (getIdString(u._id) === getIdString(user?._id)) return false;
        if (getUserRoleCategory(u) === 'admin' || getUserRoleCategory(u) === 'TL') return false;

        const uManagers = (u.reportingManagers || []).map(m => getIdString(m));
        if (myReportingManagersIds.length > 0 && uManagers.length > 0) {
            return uManagers.some(mId => myReportingManagersIds.includes(mId));
        }

        const uManagerId = u.reportingManager?._id || u.reportingManager;
        const uTeamLeadIds = (u.teamLeads || []).map(tl => getIdString(tl));

        return ((myManagerId && getIdString(uManagerId) === getIdString(myManagerId)) ||
                (!myManagerId && uTeamLeadIds.some(tlId => myTeamLeadIds.includes(tlId))));
    });

    // 2. Calculations for Team Lead (TL)
    const tlManagers = allUsers.filter(u => getUserRoleCategory(u) === 'admin');
    const reportingTeamTL = allUsers.filter(u => {
        const uManagers = (u.reportingManagers || []).map(m => getIdString(m));
        const userIdStr = getIdString(user?._id);
        if (uManagers.length > 0) {
            return uManagers.includes(userIdStr);
        }
        return ((u.reportingManager && getIdString(u.reportingManager) === userIdStr) ||
                (!u.reportingManager && (u.teamLeads || []).map(tl => getIdString(tl)).includes(userIdStr)));
    });

    // 3. Calculations for Admin
    const reportingTeamAdmin = allUsers.filter(u => getUserRoleCategory(u) === 'TL');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white w-full max-w-lg max-h-[85vh] flex flex-col rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Clean white top bar with close button */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Scrollable Container */}
                <div className="overflow-y-auto flex-1 px-8 pb-8 pt-10 scrollbar-thin scrollbar-thumb-slate-200">
                    
                    {/* Avatar Container naturally aligned */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-[24px] flex items-center justify-center text-white text-4xl font-extrabold shadow-xl border-4 border-slate-50 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden relative">
                                {user?.profilePic ? (
                                    <img src={user.profilePic} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                    initial
                                )}
                                
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px] z-10">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            
                            {/* Symmetric Avatar Controls */}
                            <div className="absolute -bottom-2 -left-2 flex gap-1 z-20">
                                {user?.profilePic && (
                                    <button 
                                        onClick={handleImageDelete}
                                        disabled={isUploading}
                                        className="p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-rose-500 hover:bg-rose-50 transition-all hover:scale-110 active:scale-95"
                                        title="Remove Photo"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="absolute -bottom-2 -right-2 flex gap-1 z-20">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-blue-600 hover:bg-blue-50 transition-all hover:scale-110 active:scale-95"
                                    title="Upload Photo"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Name and Badges */}
                        <h3 className="text-2xl font-bold text-slate-800 mt-4 mb-2">{displayName}</h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getRoleBadgeStyle(getUserRoleCategory(user || { role: userRole }))}`}>
                                {user?.designation || displayRole || formatRole(userRole)}
                            </span>
                            {/* Hide active/inactive pill when viewing an admin profile and the logged-in user is not an admin */}
                            {!(getUserRoleCategory(user || { role: userRole }) === 'admin' && currentUser?.role !== 'admin') && (
                                user?.status === 'inactive' ? (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-slate-400" /> Inactive
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                                    </span>
                                )
                            )}
                        </div>
                    </div>

                    {user?.status === 'inactive' && (
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2 text-xs text-slate-600 w-full animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
                                <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">Inactivity Profile</span>
                            </div>
                            {canSeeReason && (
                            <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">Reason for Inactivity</span>
                                <p className="italic text-slate-700 font-semibold">{user.inactiveReason || "No reason specified"}</p>
                            </div>
                            )}
                            <div className="flex flex-col gap-0.5 mt-1">
                                <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">Duration</span>
                                <p className="text-slate-800 font-bold">
                                    {user.inactiveUntil ? `${(() => {
                                        const diffTime = new Date(user.inactiveUntil) - new Date();
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        return diffDays > 0 ? `${diffDays} days remaining` : "Reactivating...";
                                    })()} (Until ${new Date(user.inactiveUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})` : "Indefinite"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Left & Right layout for general info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all duration-200 hover:bg-blue-50/20 hover:border-blue-100/50 flex items-start gap-3 col-span-1 sm:col-span-2">
                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600 mt-0.5">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-slate-400 mb-0.5">Email Address</p>
                                <p className="text-sm font-semibold text-slate-700 truncate">{user?.email || "N/A"}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all duration-200 hover:bg-blue-50/20 hover:border-blue-100/50 flex items-start gap-3">
                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600 mt-0.5">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-slate-400 mb-0.5">Phone Number</p>
                                <p className="text-sm font-semibold text-slate-700 truncate">{user?.phone || "Not provided"}</p>
                            </div>
                        </div>

                        {getUserRoleCategory(user || { role: userRole }) !== 'admin' && (
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all duration-200 hover:bg-indigo-50/20 hover:border-indigo-100/50 flex items-start gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 mt-0.5">
                                <Briefcase className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-0.5">Department</p>
                                <p className="text-sm font-semibold text-slate-700">{user?.department || "Engineering"}</p>
                            </div>
                        </div>
                        )}

                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all duration-200 hover:bg-purple-50/20 hover:border-purple-100/50 flex items-start gap-3">
                            <div className="p-2 bg-purple-50 rounded-xl text-purple-600 mt-0.5">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-0.5">Created CRM</p>
                                <p className="text-sm font-semibold text-slate-700">
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-6" />

                    {/* ─── Hierarchy / Reporting Section ───────────────────────────── */}
                    <div className="space-y-6">
                        {isLoadingRelations ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                <p className="text-xs text-slate-400 font-semibold">Resolving organization matrix...</p>
                            </div>
                        ) : (
                            <>
                                {/* 1. Reporting Manager Block (Developers, QAs, Team Leads only) */}
                                {getUserRoleCategory(user || { role: userRole }) !== 'admin' && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                                            <UserCheck className="w-4 h-4 text-blue-500" />
                                            Reporting Manager
                                        </h4>
                                        <div className="space-y-2">
                                            {getUserRoleCategory(user || { role: userRole }) === 'TL' ? (
                                                /* TL reports to Admins */
                                                tlManagers.length > 0 ? (
                                                    tlManagers.map(mgr => (
                                                        <div key={mgr._id} className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm">
                                                                {mgr.profilePic ? (
                                                                    <img src={mgr.profilePic} alt={mgr.name} className="w-full h-full object-cover" />
                                                                ) : getInitials(mgr.name)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-slate-700 truncate">{mgr.name}</p>
                                                                <p className="text-[10px] font-bold text-blue-600">Corporate Administrator</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-center text-xs font-medium text-slate-400">
                                                        No supervisor assigned
                                                    </div>
                                                )
                                            ) : (
                                                /* Developer / QA report to assigned Team Leads */
                                                reportingManagers.length > 0 ? (
                                                    reportingManagers.map(mgr => (
                                                        <div key={mgr._id} className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
                                                            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm">
                                                                {mgr.profilePic ? (
                                                                    <img src={mgr.profilePic} alt={mgr.name} className="w-full h-full object-cover" />
                                                                ) : getInitials(mgr.name)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-slate-700 truncate">{mgr.name}</p>
                                                                <p className="text-[10px] font-bold text-purple-600">Team Lead / Reporting Manager</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl text-center text-xs font-medium text-slate-400">
                                                        No reporting manager assigned
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 2. Reporting Team / Teammates Block */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-indigo-500" />
                                        {getUserRoleCategory(user || { role: userRole }) === 'admin' ? "Active Team Leads" : getUserRoleCategory(user || { role: userRole }) === 'TL' ? "Reporting Team Members" : "My Teammates"}
                                    </h4>

                                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                                        {/* Render items based on role */}
                                        {getUserRoleCategory(user || { role: userRole }) === 'admin' && (
                                            reportingTeamAdmin.length > 0 ? (
                                                reportingTeamAdmin.map(member => (
                                                    <div key={member._id} className="flex items-center justify-between p-2.5 bg-slate-50/40 border border-slate-100 hover:border-indigo-100 rounded-xl hover:bg-slate-50 transition-all duration-150">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-extrabold overflow-hidden">
                                                                {member.profilePic ? (
                                                                    <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                                                                ) : getInitials(member.name)}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{member.name}</span>
                                                        </div>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getRoleBadgeStyle(getUserRoleCategory(member))}`}>
                                                            {member.designation || formatRole(member.role)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 bg-slate-50/30 border border-slate-100 border-dashed rounded-xl text-center text-xs text-slate-400 font-medium">
                                                    No active Team Leads registered in the system
                                                </div>
                                            )
                                        )}

                                        {getUserRoleCategory(user || { role: userRole }) === 'TL' && (
                                            reportingTeamTL.length > 0 ? (
                                                reportingTeamTL.map(member => (
                                                    <div key={member._id} className="flex items-center justify-between p-2.5 bg-slate-50/40 border border-slate-100 hover:border-indigo-100 rounded-xl hover:bg-slate-50 transition-all duration-150">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-extrabold overflow-hidden">
                                                                {member.profilePic ? (
                                                                    <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                                                                ) : getInitials(member.name)}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{member.name}</span>
                                                        </div>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getRoleBadgeStyle(getUserRoleCategory(member))}`}>
                                                            {member.designation || formatRole(member.role)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 bg-slate-50/30 border border-slate-100 border-dashed rounded-xl text-center text-xs text-slate-400 font-medium">
                                                    No developers or QA assigned under you yet
                                                </div>
                                            )
                                        )}

                                        {getUserRoleCategory(user || { role: userRole }) !== 'admin' && getUserRoleCategory(user || { role: userRole }) !== 'TL' && (
                                            teammates.length > 0 ? (
                                                teammates.map(member => (
                                                    <div key={member._id} className="flex items-center justify-between p-2.5 bg-slate-50/40 border border-slate-100 hover:border-indigo-100 rounded-xl hover:bg-slate-50 transition-all duration-150">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-extrabold overflow-hidden">
                                                                {member.profilePic ? (
                                                                    <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover" />
                                                                ) : getInitials(member.name)}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{member.name}</span>
                                                        </div>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getRoleBadgeStyle(getUserRoleCategory(member))}`}>
                                                            {member.designation || formatRole(member.role)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 bg-slate-50/30 border border-slate-100 border-dashed rounded-xl text-center text-xs text-slate-400 font-medium">
                                                    No teammates found under your reporting lead
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {isMyProfile ? (
                        <button 
                            onClick={handleLogout}
                            className="w-full mt-8 py-3 text-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-100 cursor-pointer border-none"
                        >
                            Logout
                        </button>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="w-full mt-8 py-3 text-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 cursor-pointer border-none"
                        >
                            Close Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
