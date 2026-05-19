import User from "../models/user.schema.js";
import { generateToken } from "../utils/authToken.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import { cloudinary } from "../config/cloudinary.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../middlewares/permission.middleware.js";

export const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, role, department, status } = req.body;
        const incomingTeamLeads = req.body.teamLeads || req.body['teamLeads[]'];

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Name, email, password and role are required!"
            })
        }

        const existsingUser = await User.findOne({ email });
        if (existsingUser) {
            return res.status(400).json({
                message: "User already exists!"
            })
        }

        const hashedPassword = await hashPassword(password);

        let profilePic = "";
        let profilePicPublicId = "";

        if (req.file) {
            console.log("File received in registerUser:", req.file);
            profilePic = req.file.path;
            profilePicPublicId = req.file.filename;
        }

        // Robustly normalize teamLeads
        let finalTeamLeads = [];
        if (incomingTeamLeads) {
            if (Array.isArray(incomingTeamLeads)) {
                finalTeamLeads = incomingTeamLeads;
            } else if (typeof incomingTeamLeads === 'string') {
                finalTeamLeads = incomingTeamLeads.split(',').map(id => id.trim()).filter(id => id);
            } else {
                finalTeamLeads = [incomingTeamLeads];
            }
        }
        // Filter out duplicates and invalid IDs
        finalTeamLeads = [...new Set(finalTeamLeads)].filter(id => id !== 'null' && id !== 'undefined' && id !== '');

        // Parse permissions from body or fall back to role defaults
        let permissions = [];
        const rawPerms = req.body.permissions || req.body['permissions[]'];
        if (rawPerms) {
            permissions = Array.isArray(rawPerms) ? rawPerms : String(rawPerms).split(',').map(p => p.trim()).filter(Boolean);
        } else {
            permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
        }

        const user = new User({
            name, 
            email, 
            password: hashedPassword, 
            role, 
            department, 
            teamLeads: finalTeamLeads,
            profilePic,
            profilePicPublicId,
            permissions
        });

        await user.save();

        return res.status(201).json({
            message: "User created successfully!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
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
                role: user.role,
                profilePic: user.profilePic,
                teamLeads: user.teamLeads || [],
                teamMembers: user.teamMembers || [],
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
                role: user.role,
                department: user.department || null,
                profilePic: user.profilePic || "",
                teamLeads: user.teamLeads || [],
                teamMembers: user.teamMembers || [],
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
        const { teamLeadId, teamLead, role, status } = req.query;
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
        
        if (userRole === 'TL') {
            // Find users assigned to this TL, or the TL themselves
            query = {
                ...query,
                $or: [
                    { teamLeads: _id },
                    { _id: _id }
                ]
            };
        } else if (targetTeamLead && targetTeamLead !== 'undefined' && targetTeamLead !== 'null') {
            query.teamLeads = targetTeamLead;
        }
        
        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .populate("teamLeads", "name")
            .sort({ name: 1 });
        
        return res.status(200).json({
            success: true,
            data: users
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
        const incomingTeamLeads = req.body.teamLeads || req.body['teamLeads[]'];
        
        // Robustly normalize teamLeads
        let finalTeamLeads = [];
        if (incomingTeamLeads) {
            if (Array.isArray(incomingTeamLeads)) {
                finalTeamLeads = incomingTeamLeads;
            } else if (typeof incomingTeamLeads === 'string') {
                finalTeamLeads = incomingTeamLeads.split(',').map(id => id.trim()).filter(id => id);
            } else {
                finalTeamLeads = [incomingTeamLeads];
            }
        }
        finalTeamLeads = [...new Set(finalTeamLeads)].filter(id => id !== 'null' && id !== 'undefined' && id !== '');

        // Parse permissions
        const rawPerms = req.body.permissions || req.body['permissions[]'];
        let parsedPermissions = null;
        if (rawPerms !== undefined) {
            parsedPermissions = Array.isArray(rawPerms)
                ? rawPerms
                : String(rawPerms).split(',').map(p => p.trim()).filter(Boolean);
        }

        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ message: "User not found!" });

        const updateData = {
            ...otherData,
            teamLeads: finalTeamLeads,
            ...(parsedPermissions !== null && { permissions: parsedPermissions })
        };

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
        const user = await User.findByIdAndDelete(_id);
        if (!user) return res.status(404).json({ message: "User not found!" });

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