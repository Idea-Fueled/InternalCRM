import User from "../models/user.schema.js";
import jwt from "jsonwebtoken";
import { getUserRoleCategory } from "../middlewares/auth.middleware.js";
import { generateToken } from "../utils/authToken.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import { cloudinary } from "../config/cloudinary.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../middlewares/permission.middleware.js";
import crypto from "crypto";
import { sendWelcomeEmail } from "../utils/email.js";

export const registerUser = async (req, res, next) => {
    try {
        let { name, email, password, role, designation, department, reportingManager, status, phone, casualLeaveBalance, sickLeaveBalance, earnedLeaveBalance } = req.body;
        const incomingTeamLeads = req.body.teamLeads || req.body['teamLeads[]'];

        if (!name || !email || !role) {
            return res.status(400).json({
                message: "Name, email, and role are required!"
            })
        }

        // Strictly restrict admin creation to logged-in admins
        const resolvedRoleCategory = getUserRoleCategory({ role, designation });
        if (resolvedRoleCategory === 'admin' || (designation && designation.toLowerCase().includes('admin'))) {
            let callingUser = null;
            if (req.cookies?.token) {
                try {
                    const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
                    callingUser = await User.findById(decoded.id);
                } catch (e) {
                    console.error("Token verification failed in admin creation block:", e.message);
                }
            }
            if (!callingUser || callingUser.role !== 'admin') {
                return res.status(403).json({
                    message: "Access denied. Only administrators can create admin accounts."
                });
            }
        }

        const existsingUser = await User.findOne({ email });
        if (existsingUser) {
            return res.status(400).json({
                message: "User already exists!"
            })
        }

        // Generate a secure random password if none is provided
        if (!password || !password.trim()) {
            password = crypto.randomBytes(16).toString('hex');
        }

        const hashedPassword = await hashPassword(password);

        let profilePic = "";
        let profilePicPublicId = "";

        if (req.file) {
            console.log("File received in registerUser:", req.file);
            profilePic = req.file.path;
            profilePicPublicId = req.file.filename;
        }

        // Dynamic Role & Designation Scoping
        let resolvedDesignation = designation || role;
        const resolvedRole = getUserRoleCategory({ role, designation: resolvedDesignation });
        
        // Retrieve and process multiple reporting managers
        const incomingManagers = req.body.reportingManagers || req.body['reportingManagers[]'];
        let finalReportingManagers = [];
        if (incomingManagers) {
            if (Array.isArray(incomingManagers)) {
                finalReportingManagers = incomingManagers;
            } else if (typeof incomingManagers === 'string') {
                finalReportingManagers = incomingManagers.split(',').map(id => id.trim()).filter(id => id);
            } else {
                finalReportingManagers = [incomingManagers];
            }
            finalReportingManagers = [...new Set(finalReportingManagers)].filter(id => id !== 'null' && id !== 'undefined' && id !== '');
        } else if (reportingManager && reportingManager !== 'null' && reportingManager !== 'undefined' && reportingManager !== '') {
            finalReportingManagers = [reportingManager];
        }

        const finalReportingManager = finalReportingManagers[0] || null;
        const finalTeamLeads = finalReportingManagers;

        // Parse permissions from body or fall back to role defaults
        let permissions = [];
        const rawPerms = req.body.permissions || req.body['permissions[]'];
        if (rawPerms) {
            permissions = Array.isArray(rawPerms) ? rawPerms : String(rawPerms).split(',').map(p => p.trim()).filter(Boolean);
        } else {
            permissions = DEFAULT_ROLE_PERMISSIONS[resolvedRole] || DEFAULT_ROLE_PERMISSIONS['developer'];
        }

        const user = new User({
            name, 
            email, 
            password: hashedPassword, 
            role: resolvedRole, 
            designation: resolvedDesignation || (resolvedRole === 'admin' ? 'Admin' : resolvedRole),
            reportingManager: finalReportingManager,
            reportingManagers: finalReportingManagers,
            department, 
            teamLeads: finalTeamLeads,
            profilePic,
            profilePicPublicId,
            permissions,
            phone: phone || "",
            casualLeaveBalance: casualLeaveBalance !== undefined ? Number(casualLeaveBalance) : 12,
            sickLeaveBalance: sickLeaveBalance !== undefined ? Number(sickLeaveBalance) : 10,
            earnedLeaveBalance: earnedLeaveBalance !== undefined ? Number(earnedLeaveBalance) : 15
        });

        // Generate setup password token (expires in 24 hours)
        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await user.save();

        // Send Welcome & Password Setup email in the background
        const frontendUrl = process.env.FRONTEND_URL
            ? process.env.FRONTEND_URL.split(',')[0].trim().replace(/\/$/, '')
            : 'http://localhost:5173';
        const setupLink = `${frontendUrl}/reset-password?token=${rawToken}`;

        console.log(`[registerUser] Dispatching welcome email with password setup to: ${user.email}`);
        try {
            await sendWelcomeEmail(user.email, user.name, setupLink);
        } catch (emailErr) {
            console.error('[registerUser] Welcome email sending failed:', emailErr.message || emailErr);
        }

        return res.status(201).json({
            message: "User created successfully!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                designation: user.designation,
                reportingManager: user.reportingManager,
                reportingManagers: user.reportingManagers,
                department: user.department,
                profilePic: user.profilePic
            }
        })
    } catch (error) {
        console.error("User registration error:", error);
        return res.status(500).json({ 
            message: error.message || "Internal server error during registration"
        });
    }
}

export const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required!"
            })
        }

        const formattedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: formattedEmail });
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            })
        }

        if (user.isActive === false) {
            return res.status(403).json({
                message: "Your account has been deactivated. Please contact the management team.",
                isDeactivated: true
            })
        }

        // Auto-reactivation check
        if (user.status === "inactive" && user.inactiveUntil && new Date() > new Date(user.inactiveUntil)) {
            user.status = "free";
            user.inactiveUntil = null;
            user.inactiveReason = "";
            await user.save();
        }

        if (user.status === "inactive") {
            return res.status(403).json({
                message: "Your account is currently marked as inactive. Please contact your administrator for access.",
                isInactive: true
            });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password."
            })
        }

        const token = await generateToken(user._id, user.role);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        return res.status(200).json({
            message: "Login successful!",
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: getUserRoleCategory(user),
                designation: user.designation || user.role,
                reportingManager: user.reportingManager,
                reportingManagers: user.reportingManagers || [],
                profilePic: user.profilePic,
                teamLeads: user.teamLeads || [],
                teamMembers: user.teamMembers || [],
                createdAt: user.createdAt,
                permissions: user.role === 'admin'
                    ? DEFAULT_ROLE_PERMISSIONS.admin
                    : (user.permissions || [])
            }
        })

    } catch (error) {
        console.error("Login controller error:", error);
        return res.status(500).json({ 
            message: error.message || "Internal server error during login"
        })
    }
}

export const getCurrentUser = (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = req.user.toObject ? req.user.toObject() : { ...req.user };
        delete user.password;
        return res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                id: user._id,
                name: user.name,
                email: user.email,
                role: getUserRoleCategory(user),
                designation: user.designation || user.role,
                reportingManager: user.reportingManager,
                reportingManagers: user.reportingManagers || [],
                department: user.department || null,
                profilePic: user.profilePic || "",
                teamLeads: user.teamLeads || [],
                teamMembers: user.teamMembers || [],
                createdAt: user.createdAt,
                permissions: user.role === 'admin'
                    ? DEFAULT_ROLE_PERMISSIONS.admin
                    : (user.permissions || [])
            }
        });
    } catch (error) {
        console.error("getCurrentUser error:", error);
        return res.status(500).json({ message: "Failed to get current user" });
    }
}

export const getAllUsers = async (req, res) => {
    try {
        // Auto-reactivate expired inactive users company-wide before queries
        await User.updateMany(
            { status: "inactive", inactiveUntil: { $ne: null, $lt: new Date() } },
            { $set: { status: "free", inactiveUntil: null, inactiveReason: "" } }
        );

        const { teamLeadId, teamLead, role, status, orgTree } = req.query;
        const targetTeamLead = teamLeadId || teamLead;
        const { role: userRole, _id } = req.user;
        let query = {};
        
        if (status === 'inactive') {
            query.isActive = false;
        } else if (status === 'all') {
            // No isActive filter
        } else {
            query.isActive = true;
        }
        
        const isOrgTree = orgTree === 'true' || orgTree === true || String(orgTree).toLowerCase() === 'true';

        if (userRole !== 'admin' && userRole !== 'hr') {
            const userDept = req.user.department || "";
            const managers = req.user.reportingManagers || [];
            
            const orConditions = [
                { _id: _id },
                { reportingManagers: _id },
                { reportingManager: _id },
                { teamLeads: _id }
            ];

            if (userDept) {
                orConditions.push({ 
                    department: { $regex: new RegExp(`^${userDept.trim()}$`, 'i') } 
                });
            }
            if (managers.length > 0) {
                orConditions.push({ _id: { $in: managers } });
            }
            const mySingularManager = req.user.reportingManager;
            if (mySingularManager) {
                orConditions.push({ _id: mySingularManager });
            }

            query = {
                ...query,
                $or: orConditions
            };
        } else {
            if (!isOrgTree && targetTeamLead && targetTeamLead !== 'undefined' && targetTeamLead !== 'null') {
                query.teamLeads = targetTeamLead;
            }
        }
        
        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .populate("teamLeads", "name")
            .populate("reportingManager", "name")
            .populate("reportingManagers", "name designation role profilePic")
            .sort({ name: 1 });
        
        // Strictly sanitize inactiveReason based on role permissions
        const currentUserId = String(req.user?._id || "");
        const currentUserRole = req.user?.role || "employee";
        const isAdminOrHR = currentUserRole === 'admin' || currentUserRole === 'hr';

        const sanitizedUsers = users.map(u => {
            const uObj = u.toObject ? u.toObject() : u;
            const isSelf = String(uObj._id) === currentUserId;
            
            // Extract IDs of Team Leads and Reporting Managers
            const tls = (uObj.teamLeads || []).map(tl => typeof tl === 'object' ? String(tl._id) : String(tl));
            const rms = (uObj.reportingManagers || []).map(rm => typeof rm === 'object' ? String(rm._id) : String(rm));
            const isManagerOfUser = tls.includes(currentUserId) || rms.includes(currentUserId) || (uObj.reportingManager && String(uObj.reportingManager) === currentUserId);

            if (!isAdminOrHR && !isSelf && !isManagerOfUser) {
                uObj.inactiveReason = ""; // Strict privacy masking
            }
            return uObj;
        });

        return res.status(200).json({
            success: true,
            data: sanitizedUsers
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { _id } = req.params;
        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ message: "User not found!" });

        return res.status(200).json({
            message: "User fetched successfully!",
            data: { email: user.email, name: user.name, role: user.role, department: user.department, profilePic: user.profilePic }
        })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const updateUser = async (req, res) => {
    try {
        const { _id } = req.params;
        const { ...otherData } = req.body;

        delete otherData.password;

        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ message: "User not found!" });

        // Non-admin users (such as HR) cannot modify admin accounts or promote to admin
        if (req.user?.role !== 'admin') {
            if (user.role === 'admin' || (user.designation && user.designation.toLowerCase().includes('admin'))) {
                return res.status(403).json({
                    message: "Access denied. Only administrators can modify admin accounts."
                });
            }
            if (otherData.role === 'admin' || (otherData.designation && otherData.designation.toLowerCase().includes('admin'))) {
                return res.status(403).json({
                    message: "Access denied. Non-administrators cannot promote users to administrators."
                });
            }
        }

        const incomingTeamLeads = req.body.teamLeads || req.body['teamLeads[]'];
        const incomingManagers = req.body.reportingManagers || req.body['reportingManagers[]'];
        let finalReportingManagers = undefined;
        if (incomingManagers !== undefined) {
            if (Array.isArray(incomingManagers)) {
                finalReportingManagers = incomingManagers;
            } else if (typeof incomingManagers === 'string') {
                finalReportingManagers = incomingManagers.split(',').map(id => id.trim()).filter(id => id);
            } else {
                finalReportingManagers = [incomingManagers];
            }
            finalReportingManagers = [...new Set(finalReportingManagers)].filter(id => id !== 'null' && id !== 'undefined' && id !== '');
        }

        // Single supervisor setup
        const finalReportingManager = 'reportingManager' in req.body 
            ? (req.body.reportingManager && req.body.reportingManager !== 'null' && req.body.reportingManager !== 'undefined' && req.body.reportingManager !== '' ? req.body.reportingManager : null)
            : undefined;

        // Parse permissions
        const rawPerms = req.body.permissions || req.body['permissions[]'];
        let parsedPermissions = null;
        if (rawPerms !== undefined) {
            parsedPermissions = Array.isArray(rawPerms)
                ? rawPerms
                : String(rawPerms).split(',').map(p => p.trim()).filter(Boolean);
        }

        const updateData = {
            ...otherData,
            ...(parsedPermissions !== null && { permissions: parsedPermissions })
        };

        if (finalReportingManagers !== undefined) {
            updateData.reportingManagers = finalReportingManagers;
            updateData.reportingManager = finalReportingManagers[0] || null;
            updateData.teamLeads = finalReportingManagers;
        } else if (finalReportingManager !== undefined) {
            updateData.reportingManager = finalReportingManager;
            updateData.reportingManagers = finalReportingManager ? [finalReportingManager] : [];
            updateData.teamLeads = finalReportingManager ? [finalReportingManager] : [];
        } else if (incomingTeamLeads) {
            let finalTeamLeads = [];
            if (Array.isArray(incomingTeamLeads)) {
                finalTeamLeads = incomingTeamLeads;
            } else if (typeof incomingTeamLeads === 'string') {
                finalTeamLeads = incomingTeamLeads.split(',').map(id => id.trim()).filter(id => id);
            } else {
                finalTeamLeads = [incomingTeamLeads];
            }
            finalTeamLeads = [...new Set(finalTeamLeads)].filter(id => id !== 'null' && id !== 'undefined' && id !== '');
            updateData.teamLeads = finalTeamLeads;
            updateData.reportingManagers = finalTeamLeads;
            updateData.reportingManager = finalTeamLeads[0] || null;
        }

        // Dynamic Role & Designation Scoping
        if (otherData.role !== undefined || otherData.designation !== undefined) {
            const resolvedDesignation = otherData.designation !== undefined ? otherData.designation : (otherData.role !== undefined ? otherData.role : user.designation);
            const resolvedRole = getUserRoleCategory({ role: otherData.role || user.role, designation: resolvedDesignation });
            updateData.role = resolvedRole;
            updateData.designation = resolvedDesignation || (resolvedRole === 'admin' ? 'Admin' : resolvedRole);
        }

        if (req.file) {
            console.log("File received in updateUser:", req.file);
            // Delete old pic if exists
            if (user.profilePicPublicId) {
                try {
                    await cloudinary.uploader.destroy(user.profilePicPublicId);
                } catch (delErr) {
                    console.error("Cloudinary delete error (updateUser):", delErr);
                }
            }
            updateData.profilePic = req.file.path;
            updateData.profilePicPublicId = req.file.filename;
        }

        const updatedUser = await User.findByIdAndUpdate(
            _id,
            updateData,
            { new: true, runValidators: true }
        ).select("-password")
         .populate("reportingManager", "name")
         .populate("reportingManagers", "name designation role profilePic")
         .populate("teamLeads", "name");

        return res.status(200).json({
            message: "User updated successfully!",
            data: updatedUser
        })
    } catch (error) {
        console.error("updateUser error:", error);
        return res.status(500).json({ 
            message: error.message || "Failed to update user" 
        });
    }
}

// ─── Change User Password (Admin-initiated, properly hashed) ─────────────────
export const changeUserPassword = async (req, res) => {
    try {
        const { _id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Non-admin users cannot change password for admin accounts
        if (req.user?.role !== 'admin') {
            if (user.role === 'admin' || (user.designation && user.designation.toLowerCase().includes('admin'))) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Only administrators can change password for admin accounts."
                });
            }
        }

        const hashed = await hashPassword(newPassword);
        user.password = hashed;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully. The employee can now login with the new password."
        });
    } catch (error) {
        console.error("changeUserPassword error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update password."
        });
    }
};

export const updateProfilePic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        console.log("File received in updateProfilePic:", req.file);

        // Delete old pic if exists
        if (user.profilePicPublicId) {
            try {
                await cloudinary.uploader.destroy(user.profilePicPublicId);
            } catch (delErr) {
                console.error("Cloudinary delete error (updateProfilePic):", delErr);
                // Continue anyway
            }
        }

        user.profilePic = req.file.path;
        user.profilePicPublicId = req.file.filename;
        await user.save();

        return res.status(200).json({
            message: "Profile picture updated successfully",
            profilePic: user.profilePic
        });
    } catch (error) {
        console.error("updateProfilePic error:", error);
        return res.status(500).json({ 
            message: "Failed to update profile picture",
            error: error.message 
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { _id } = req.params;
        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ message: "User not found!" });
        
        // Non-admin users cannot delete/deactivate admin accounts
        if (req.user?.role !== 'admin') {
            if (user.role === 'admin' || (user.designation && user.designation.toLowerCase().includes('admin'))) {
                return res.status(403).json({
                    message: "Access denied. Only administrators can delete or deactivate admin accounts."
                });
            }
        }

        user.isActive = false;
        await user.save();
        return res.status(200).json({ message: "User deleted successfully!", data: user })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const restoreUser = async (req, res) => {
    try {
        const { _id } = req.params;
        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ message: "User not found!" });
        
        // Non-admin users cannot restore admin accounts
        if (req.user?.role !== 'admin') {
            if (user.role === 'admin' || (user.designation && user.designation.toLowerCase().includes('admin'))) {
                return res.status(403).json({
                    message: "Access denied. Only administrators can restore admin accounts."
                });
            }
        }

        user.isActive = true;
        await user.save();
        return res.status(200).json({ message: "User restored successfully!", data: user })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const hardDeleteUser = async (req, res) => {
    try {
        const { _id } = req.params;
        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ message: "User not found!" });

        // Non-admin users cannot permanently delete admin accounts
        if (req.user?.role !== 'admin') {
            if (user.role === 'admin' || (user.designation && user.designation.toLowerCase().includes('admin'))) {
                return res.status(403).json({
                    message: "Access denied. Only administrators can permanently delete admin accounts."
                });
            }
        }

        await User.findByIdAndDelete(_id);

        // Clean up Cloudinary if profile pic exists
        if (user.profilePicPublicId) {
            try {
                await cloudinary.uploader.destroy(user.profilePicPublicId);
            } catch (delErr) {
                console.error("Cloudinary delete error (hardDeleteUser):", delErr);
            }
        }

        return res.status(200).json({ message: "User permanently deleted!" })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const deleteProfilePic = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Delete from Cloudinary if exists
        if (user.profilePicPublicId) {
            try {
                await cloudinary.uploader.destroy(user.profilePicPublicId);
            } catch (delErr) {
                console.error("Cloudinary delete error (deleteProfilePic):", delErr);
            }
        }

        user.profilePic = "";
        user.profilePicPublicId = "";
        await user.save();

        return res.status(200).json({
            message: "Profile picture removed successfully",
            profilePic: ""
        });
    } catch (error) {
        console.error("deleteProfilePic error:", error);
        return res.status(500).json({ 
            message: "Failed to remove profile picture",
            error: error.message 
        });
    }
};