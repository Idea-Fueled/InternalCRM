import User from "../models/user.schema.js";
import { generateToken } from "../utils/authToken.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import { cloudinary } from "../config/cloudinary.js";

export const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, role, department, teamLead } = req.body;

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

        const user = new User({
            name, 
            email, 
            password: hashedPassword, 
            role, 
            department, 
            teamLead: (teamLead && teamLead !== "") ? teamLead : null,
            profilePic,
            profilePicPublicId
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

        const user = await User.findOne({ email });
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
                profilePic: user.profilePic
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
                profilePic: user.profilePic || ""
            }
        });
    } catch (error) {
        console.error("getCurrentUser error:", error);
        return res.status(500).json({ message: "Failed to get current user" });
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const { teamLead, role, status } = req.query;
        let query = {};
        
        if (status === 'inactive') {
            query.isActive = false;
        } else if (status === 'all') {
            // No isActive filter
        } else {
            query.isActive = true;
        }
        
        if (req.user.role === "TL") {
            const currentUser = await User.findById(req.user._id);
            const teamMemberIds = currentUser?.teamMembers || [];
            
            query = {
                ...query,
                $or: [
                    { teamLead: req.user._id },
                    { _id: { $in: teamMemberIds } }
                ]
            };
        } else if (teamLead && teamLead !== 'undefined' && teamLead !== 'null') {
            query.teamLead = teamLead;
        }
        
        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .populate("teamLead", "name")
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
        const { teamLead, ...otherData } = req.body;
        
        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ message: "User not found!" });

        const updateData = {
            ...otherData,
            teamLead: (teamLead && teamLead !== "") ? teamLead : null
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