import React, { useState } from "react";
import { KeyRound, X, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { userService } from "../api/services";
import { toast } from "sonner";

const getPwdStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '', text: '' };
    let score = 0;
    if (pwd.length >= 6)  score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const map = [
        { label: 'Very Weak', color: 'bg-red-500',    text: 'text-red-500'    },
        { label: 'Weak',      color: 'bg-orange-400',  text: 'text-orange-500' },
        { label: 'Fair',      color: 'bg-yellow-400',  text: 'text-yellow-600' },
        { label: 'Good',      color: 'bg-blue-500',    text: 'text-blue-600'   },
        { label: 'Strong',    color: 'bg-emerald-500', text: 'text-emerald-600'},
        { label: 'Very Strong', color: 'bg-emerald-600', text: 'text-emerald-700'},
    ];
    return { score, ...map[score] };
};

export default function ChangePasswordModal({ isOpen, employeeId, employeeName, onClose }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [isChangingPwd, setIsChangingPwd] = useState(false);
    const [pwdSubmitted, setPwdSubmitted] = useState(false);

    if (!isOpen) return null;

    const strength = getPwdStrength(newPassword);
    const pwdMismatch = pwdSubmitted && newPassword !== confirmPassword;
    const pwdTooShort = pwdSubmitted && newPassword.length < 6;

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdSubmitted(true);
        if (!newPassword || newPassword.length < 6) return;
        if (newPassword !== confirmPassword) return;
        try {
            setIsChangingPwd(true);
            await userService.changeUserPassword(employeeId, newPassword);
            toast.success(`Password updated! ${employeeName} can now login with the new password.`);
            onClose();
            // Reset
            setNewPassword('');
            setConfirmPassword('');
            setPwdSubmitted(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setIsChangingPwd(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-bold text-slate-800">Change Password</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Setting new credentials for <span className="font-bold text-slate-700">{employeeName}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Security notice */}
                <div className="mx-6 mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                    <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                        The new password will be <span className="font-bold">securely hashed</span> using bcrypt before saving. The employee can login immediately after this change.
                    </p>
                </div>

                <form onSubmit={handleChangePassword} noValidate>
                    <div className="p-6 space-y-4">
                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-slate-700">New Password *</label>
                            <div className="relative">
                                <input
                                    type={showNewPwd ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm outline-none text-slate-800 transition-all ${
                                        pwdTooShort ? 'border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    }`}
                                    placeholder="Enter new password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPwd(!showNewPwd)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {pwdTooShort && (
                                <p className="text-red-500 text-[11px] font-semibold mt-1">Password must be at least 6 characters long!</p>
                            )}

                            {/* Strength bar */}
                            {newPassword && (
                                <div className="space-y-1 animate-in fade-in duration-200">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-slate-400 uppercase tracking-wider">Strength:</span>
                                        <span className={strength.text}>{strength.label}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-full flex-1 transition-all ${
                                                    level <= strength.score ? strength.color : 'bg-slate-200'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-slate-700">Confirm Password *</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPwd ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm outline-none text-slate-800 transition-all ${
                                        pwdMismatch ? 'border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    }`}
                                    placeholder="Re-enter new password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {pwdMismatch && (
                                <p className="text-red-500 text-[11px] font-semibold mt-1">Passwords do not match!</p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 bg-white rounded-xl text-xs font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isChangingPwd}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {isChangingPwd ? "Updating..." : "Change Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
