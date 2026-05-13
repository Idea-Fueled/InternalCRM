import User from "../models/user.schema.js";
import { generateToken } from "../utils/authToken.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";

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

        const user = new User({
            name, 
            email, 
            password: hashedPassword, 
            role, 
            department, 
            teamLead: (teamLead && teamLead !== "") ? teamLead : null
        });

        await user.save();

        return res.status(201).json({
            message: "User created successfully!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        })
    } catch (error) {
        console.error("User controller error:", error);
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors).map(val => val.message).join(", ");
            return res.status(400).json({ message });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid selection" });
        }
        return res.status(500).json({ message: error.message || "Internal server error" });
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

        console.log(`Login attempt for: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`User not found: ${email}`);
            return res.status(401).json({
                message: "Invalid email or password. Please check your credentials."
            })
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            console.log(`Invalid password for: ${email}`);
            return res.status(401).json({
                message: "Invalid email or password. Please check your credentials."
            })
        }

        // Token payload uses { id, role } — must match auth middleware
        const token = await generateToken(user._id, user.role);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        console.log(`Login successful for: ${email} (role: ${user.role})`);

        return res.status(200).json({
            message: "Login successful!",
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        })

    } catch (error) {
        console.error("Login controller error:", error);
        return res.status(500).json({
            message: "Internal server error during login"
        })
    }
}

// Returns the currently authenticated user from req.user (set by protectRoute)
// No DB query needed — avoids any route ordering collision with /:_id
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
                department: user.department || null
            }
        });
    } catch (error) {
        console.error("getCurrentUser error:", error);
        return res.status(500).json({ message: "Failed to get current user" });
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const { teamLead, role } = req.query;
        let query = { isActive: true };
        
        // Automatic filtering for Team Leads
        if (req.user.role === "TL") {
            query.teamLead = req.user._id;
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
        console.error("getAllUsers error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { _id } = req.params;

        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        return res.status(200).json({
            message: "User fetched successfully!",
            data: { email: user.email, name: user.name, role: user.role, department: user.department }
        })

    } catch (error) {
        console.error("User controller error:", error);
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors).map(val => val.message).join(", ");
            return res.status(400).json({ message });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid selection" });
        }
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
}

export const updateUser = async (req, res) => {
    try {
        const { _id } = req.params;
        const { teamLead, ...otherData } = req.body;
        
        const updateData = {
            ...otherData,
            teamLead: (teamLead && teamLead !== "") ? teamLead : null
        };

        const updatedUser = await User.findByIdAndUpdate(
            _id,
            updateData,
            { new: true, runValidators: true }
        ).select("-password")

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        return res.status(200).json({
            message: "User updated successfully!",
            data: updatedUser
        })
    } catch (error) {
        console.error("User controller error:", error);
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors).map(val => val.message).join(", ");
            return res.status(400).json({ message });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid selection" });
        }
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
}

// Soft delete
export const deleteUser = async (req, res) => {
    try {
        const { _id } = req.params;
        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }
        user.isActive = false;
        await user.save();
        return res.status(200).json({
            message: "User deleted successfully!",
            data: user
        })
    } catch (error) {
        console.error("User controller error:", error);
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors).map(val => val.message).join(", ");
            return res.status(400).json({ message });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid selection" });
        }
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
}

export const restoreUser = async (req, res) => {
    try {
        const { _id } = req.params;
        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }
        user.isActive = true;
        await user.save();
        return res.status(200).json({
            message: "User restored successfully!",
            data: user
        })
    } catch (error) {
        console.error("User controller error:", error);
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors).map(val => val.message).join(", ");
            return res.status(400).json({ message });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid selection" });
        }
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
}