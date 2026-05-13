import Project from "../models/project.schema.js";
import { createNotification } from "./notification.controller.js";
import User from "../models/user.schema.js";
import { Task } from "../models/task.schema.js";

// Create a new project
export const createProject = async (req, res, next) => {
    try {
        const { projectName, description, teamLead, teamMembers, startDate, endDate, status } = req.body;

        if (!projectName || !teamLead || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields (projectName, teamLead, startDate, endDate)",
            });
        }

        const newProject = new Project({
            projectName,
            description,
            teamLead,
            teamMembers: teamMembers || [],
            startDate,
            endDate,
            status: status || "Active"
        });

        const savedProject = await newProject.save();

        // Notify Team Lead
        await createNotification({
            recipient: teamLead,
            sender: req.user._id,
            title: "New Project Assigned",
            message: `You have been assigned as the Team Lead for ${projectName}`,
            type: "project",
            category: "assignment",
            link: `/projects/${savedProject._id}`
        });

        // Notify Admins
        const admins = await User.find({ role: "admin" });
        for (const admin of admins) {
            if (admin._id.toString() !== req.user._id.toString()) {
                await createNotification({
                    recipient: admin._id,
                    sender: req.user._id,
                    title: "New Project Created",
                    message: `${projectName} has been created by ${req.user.name}`,
                    type: "project",
                    category: "creation",
                    link: `/projects/${savedProject._id}`
                });
            }
        }

        return res.status(201).json({
            success: true,
            message: "Project created successfully",
            project: savedProject
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all active projects
export const getAllProjects = async (req, res, next) => {
    try {
        const { role, _id } = req.user;
        let query = { isDeleted: false };

        // Role-based filtering
        if (role === "TL") {
            query.teamLead = _id;
        } else if (role === "developer" || role === "qa") {
            query.teamMembers = _id;
        }
        // Admins see all projects (no additional filter)

        const projects = await Project.find(query)
            .populate("teamLead", "name email role")
            .populate("teamMembers", "name email role")
            .sort({ createdAt: -1 });

        // Fetch tasks for these projects to include counts/progress
        const projectIds = projects.map(p => p._id);
        const allTasks = await Task.find({ project: { $in: projectIds }, isDeleted: false })
            .populate("assignedTo", "name email role")
            .populate("assignedQA", "name email role");

        const projectsWithTasks = projects.map(p => {
            const projectTasks = allTasks.filter(t => t.project.toString() === p._id.toString());
            return {
                ...p.toObject(),
                tasks: projectTasks
            };
        });

        return res.status(200).json({
            success: true,
            projects: projectsWithTasks
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get a single project by ID
export const getProjectById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const project = await Project.findOne({ _id: id, isDeleted: false })
            .populate("teamLead", "name email role")
            .populate("teamMembers", "name email role");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        const tasks = await Task.find({ project: id, isDeleted: false })
            .populate("assignedTo", "name email role")
            .populate("assignedQA", "name email role");

        return res.status(200).json({
            success: true,
            project: {
                ...project.toObject(),
                tasks
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update a project
export const updateProject = async (req, res, next) => {
    try {
        const { id } = req.params;

        const updatedProject = await Project.findOneAndUpdate(
            { _id: id, isDeleted: false },
            req.body,
            { new: true, runValidators: true }
        )
            .populate("teamLead", "name email")
            .populate("teamMembers", "name email");

        if (!updatedProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found or is deleted"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project updated successfully",
            project: updatedProject
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Soft delete a project (move to trash)
export const deleteProject = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedProject = await Project.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );

        if (!deletedProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project moved to trash successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Restore a deleted project
export const restoreProject = async (req, res, next) => {
    try {
        const { id } = req.params;

        const restoredProject = await Project.findByIdAndUpdate(
            id,
            { isDeleted: false },
            { new: true }
        );

        if (!restoredProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project restored successfully",
            project: restoredProject
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all deleted projects (Trash)
export const getTrashProjects = async (req, res, next) => {
    try {
        const trashProjects = await Project.find({ isDeleted: true })
            .populate("teamLead", "firstName lastName email")
            .populate("teamMembers", "firstName lastName email")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            projects: trashProjects
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};