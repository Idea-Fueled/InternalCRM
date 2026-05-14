import React from "react";
import { X, Mail, Shield, Briefcase, Calendar, Camera, Loader2 } from "lucide-react";
import { authService } from "../api/services";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const ProfileModal = ({ isOpen, onClose, user, role, displayName, displayRole, initial }) => {
    const { updateUserProfile } = useAuth();
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef(null);

    if (!isOpen) return null;

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }

        const formData = new FormData();
        formData.append('profilePic', file);

        try {
            setIsUploading(true);
            const res = await authService.updateProfilePic(formData);
            if (res.data?.profilePic) {
                updateUserProfile({ profilePic: res.data.profilePic });
                toast.success("Profile picture updated!");
            }
        } catch (error) {
            console.error("Upload error:", error);
            const errorMsg = error.response?.data?.message || "Failed to upload image";
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white w-full max-w-sm rounded-[24px] shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 relative border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="pt-10 pb-8 px-6 text-center">
                    {/* Profile Icon with Upload Overlay */}
                    <div className="flex justify-center mb-5">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-blue-100 bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden">
                                {user?.profilePic ? (
                                    <img src={user.profilePic} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                    initial
                                )}
                                
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-blue-600 hover:bg-blue-50 transition-all hover:scale-110 active:scale-95"
                                title="Change Profile Picture"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleImageUpload}
                            />
                        </div>
                    </div>

                    {/* Name & Role - Blue Theme */}
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{displayName}</h3>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md text-blue-600 bg-blue-50">
                                {displayRole}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Active
                            </span>
                        </div>
                    </div>

                    {/* Info Fields - Stacked for full visibility */}
                    <div className="space-y-3 text-left">
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 transition-all hover:bg-blue-50/30 hover:border-blue-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email Address</p>
                            <p className="text-sm font-medium text-slate-700 break-all">{user?.email || "N/A"}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Role</p>
                                <p className="text-sm font-medium text-slate-700">{displayRole}</p>
                            </div>
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department</p>
                                <p className="text-sm font-medium text-slate-700">{user?.department || "N/A"}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Account Joined</p>
                            <p className="text-sm font-medium text-slate-700">
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "N/A"}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full mt-8 py-3 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100"
                    >
                        Close Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
