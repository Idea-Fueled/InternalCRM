import User from "../models/user.schema.js";
import { generateToken } from "../utils/authToken.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";

export const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, role, department } = req.body;

        if (!name || !email || !password || !role || !department) {
            return res.status(400).json({
                message: "All fields are required!"
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
            name, email, password: hashedPassword, role, department
        });

        const token = await generateToken(user._id, user.role);
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 1 * 24 * 60 * 60 * 1000
        })

        await user.save();

        return res.status(201).json({
            message: "User created successfully!",
            user
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message
        })
    }
}

export const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required!"
            })
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid password!"
            })
        }

        const token = await generateToken(user._id, user.role);
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 1 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            message: "Login successfully!",
            data: user.email
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message
        })
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        if (!users) {
            return res.status(404).json({
                message: "No users found!"
            })
        }
        return res.status(200).json({
            data: users
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message
        })
    }
}

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
        return res.status(500).json({
            message: error.message
        })
    }
}

export const updateUser = async (req, res) => {
    try {
        const { _id } = req.params;

        const updatedUser = await User.findByIdAndUpdate(
            _id,
            req.body,
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
        return res.status(500).json({
            message: error.message
        })
    }
}

//soft delete
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
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
        return res.status(500).json({
            message: error.message
        })
    }
}

export const restoreUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
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
        return res.status(500).json({
            message: error.message
        })
    }
}