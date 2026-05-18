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

        let parsedTeamMembers = [];
        if (teamMembers) {
            if (typeof teamMembers === 'string') {
                try {
                    parsedTeamMembers = JSON.parse(teamMembers);
                } catch (e) {
                    parsedTeamMembers = [];
                }
            } else if (Array.isArray(teamMembers)) {
                parsedTeamMembers = teamMembers;
            }
        }
        
        // Handle case where teamMembers stringifies to another string (double stringified)
        if (typeof parsedTeamMembers === 'string') {
            try {
                parsedTeamMembers = JSON.parse(parsedTeamMembers);
            } catch (e) {
                parsedTeamMembers = [];
            }
        }

        const newProject = new Project({
            projectName,
            description,
            teamLead,
            teamMembers: parsedTeamMembers,
            startDate,
            endDate,
            status: status || "Active",
            attachment: req.file ? req.file.path : ""
        });

        const savedProject = await newProject.save();

        // Notify Team Lead
        await createNotification({
            recipient: teamLead,
            sender: req.user._id,
            title: "New Project Assigned",
            message: `New project "${projectName}" has been created and you have been assigned as a Team Lead.`,
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

        // Notify Team Members (Developers and QAs)
        if (teamMembers && teamMembers.length > 0) {
            const members = await User.find({ _id: { $in: teamMembers } });
            for (const member of members) {
                if (member._id.toString() !== req.user._id.toString() && member._id.toString() !== teamLead.toString()) {
                    const roleLabel = member.role === 'qa' ? 'QA' : 'Developer';
                    await createNotification({
                        recipient: member._id,
                        sender: req.user._id,
                        title: "New Project Assignment",
                        message: `New project "${projectName}" has been created and you have been assigned as a ${roleLabel}.`,
                        type: "project",
                        category: "assignment",
                        link: `/projects/${savedProject._id}`
                    });
                }
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
            .populate("teamLead", "name email role profilePic")
            .populate("teamMembers", "name email role profilePic")
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
            .populate("teamLead", "name email role profilePic")
            .populate("teamMembers", "name email role profilePic");

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

        const updateData = { ...req.body };
        if (updateData.teamMembers) {
            if (typeof updateData.teamMembers === 'string') {
                try {
                    updateData.teamMembers = JSON.parse(updateData.teamMembers);
                } catch (e) {
                    updateData.teamMembers = [];
                }
            }
            if (typeof updateData.teamMembers === 'string') {
                try {
                    updateData.teamMembers = JSON.parse(updateData.teamMembers);
                } catch (e) {
                    updateData.teamMembers = [];
                }
            }
        }
        if (req.file) {
            updateData.attachment = req.file.path;
        }

        const updatedProject = await Project.findOneAndUpdate(
            { _id: id, isDeleted: false },
            updateData,
            { new: true, runValidators: true }
        )
            .populate("teamLead", "name email profilePic")
            .populate("teamMembers", "name email profilePic");

        if (!updatedProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found or is deleted"
            });
        }

        // Notify Team Lead and Team Members
        try {
            const recipients = new Set();
            if (updatedProject.teamLead?._id) recipients.add(updatedProject.teamLead._id.toString());
            if (updatedProject.teamMembers) {
                updatedProject.teamMembers.forEach(m => {
                    if (m?._id) recipients.add(m._id.toString());
                });
            }
            
            if (req.user?._id) {
                recipients.delete(req.user._id.toString());
            }

            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: req.user._id,
                    title: "Project Updated",
                    message: `${updatedProject.projectName} details have been updated by ${req.user.name}`,
                    type: "project",
                    category: "update",
                    link: `/projects/${updatedProject._id}`
                });
            }
        } catch (notifErr) {
            console.error("Notification error on project update:", notifErr);
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

        // Notify Team Lead and Members
        try {
            const recipients = new Set();
            if (deletedProject.teamLead) recipients.add(deletedProject.teamLead.toString());
            if (deletedProject.teamMembers) {
                deletedProject.teamMembers.forEach(m => recipients.add(m.toString()));
            }
            
            recipients.delete(req.user._id.toString());

            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: req.user._id,
                    title: "Project Deleted",
                    message: `${deletedProject.projectName} has been moved to trash by ${req.user.name}`,
                    type: "project",
                    category: "deletion",
                    link: `/trash`
                });
            }
        } catch (notifErr) {
            console.error("Notification error on project delete:", notifErr);
        }

        return res.status(200).json({
            success: true,
            message: "Project moved to trash successfully",
            project: deletedProject
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
            .populate("teamLead", "name email profilePic")
            .populate("teamMembers", "name email profilePic")
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

// Permanently delete a project
export const hardDeleteProject = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedProject = await Project.findByIdAndDelete(id);

        if (!deletedProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Also delete all tasks associated with this project
        await Task.deleteMany({ project: id });

        return res.status(200).json({
            success: true,
            message: "Project permanently deleted"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};