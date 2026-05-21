import Project from "../models/project.schema.js";
import { createNotification } from "./notification.controller.js";
import User from "../models/user.schema.js";
import { Task } from "../models/task.schema.js";

// Create a new project
export const createProject = async (req, res, next) => {
    try {
        const { projectName, description, teamLead, teamMembers, startDate, endDate, status, priority, clientName, estimatedTasks, notes } = req.body;

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

        let parsedTechStack = [];
        if (req.body.techStack) {
            if (Array.isArray(req.body.techStack)) {
                parsedTechStack = req.body.techStack;
            } else if (typeof req.body.techStack === "string") {
                try {
                    parsedTechStack = JSON.parse(req.body.techStack);
                } catch (e) {
                    parsedTechStack = req.body.techStack.split(",").map(t => t.trim()).filter(Boolean);
                }
            }
        }

        let parsedAttachments = [];
        if (req.files && req.files.length > 0) {
            parsedAttachments = req.files.map(file => ({
                url: file.path,
                filename: file.originalname || file.filename || "Attachment",
                fileType: file.mimetype || "",
                uploadedBy: req.user._id
            }));
        } else if (req.file) {
            parsedAttachments = [{
                url: req.file.path,
                filename: req.file.originalname || req.file.filename || "Attachment",
                fileType: req.file.mimetype || "",
                uploadedBy: req.user._id
            }];
        }

        let parsedNotes = [];
        if (notes && typeof notes === "string" && notes.trim() !== "") {
            parsedNotes.push({
                text: notes.trim(),
                author: req.user._id
            });
        }

        const newProject = new Project({
            projectName,
            description,
            teamLead,
            teamMembers: parsedTeamMembers,
            startDate,
            endDate,
            status: status || "Active",
            priority: priority || "Medium",
            techStack: parsedTechStack,
            clientName: clientName || "",
            estimatedTasks: Number(estimatedTasks) || 0,
            attachments: parsedAttachments,
            notes: parsedNotes,
            attachment: parsedAttachments.length > 0 ? parsedAttachments[0].url : ""
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
        if (parsedTeamMembers && parsedTeamMembers.length > 0) {
            const members = await User.find({ _id: { $in: parsedTeamMembers } });
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
            .populate("teamMembers", "name email role profilePic")
            .populate("notes.author", "name email role profilePic")
            .populate("attachments.uploadedBy", "name email role profilePic");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Project Visibility Scoping
        const { role, _id } = req.user;
        const isLead = project.teamLead?._id?.toString() === _id.toString() || project.teamLead?.toString() === _id.toString();
        const isMember = project.teamMembers?.some(m => m._id?.toString() === _id.toString() || m.toString() === _id.toString());
        const isAdminUser = role === "admin";

        if (!isAdminUser && !isLead && !isMember) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized Access: You are not assigned to this project."
            });
        }

        const tasks = await Task.find({ project: id, isDeleted: false })
            .populate("assignedTo", "name email role profilePic")
            .populate("assignedQA", "name email role profilePic")
            .populate("statusHistory.changedBy", "name email role profilePic");

        // Filter task notes and attachments according to rules:
        // "When task status changes and notes/attachments are added: Visibility must be limited only to: Assigned Developer, Assigned QA, Project Team Lead, Admin"
        const filteredTasks = tasks.map(task => {
            const isAssignedDev = task.assignedTo?._id?.toString() === _id.toString() || task.assignedTo?.toString() === _id.toString();
            const isAssignedQA = task.assignedQA?._id?.toString() === _id.toString() || task.assignedQA?.toString() === _id.toString();
            
            const isSecuredTaskRole = isAdminUser || isLead || isAssignedDev || isAssignedQA;
            
            const taskObj = task.toObject();
            if (!isSecuredTaskRole) {
                // Mask confidential fields for unauthorized project members
                taskObj.developerNotes = "";
                taskObj.qaNotes = "";
                taskObj.attachments = [];
                taskObj.screenshotLinks = [];
                if (taskObj.statusHistory) {
                    taskObj.statusHistory = taskObj.statusHistory.map(h => ({
                        ...h,
                        notes: "[Access Restricted]",
                        attachment: "",
                        attachments: [],
                        screenshotLinks: []
                    }));
                }
            }
            return taskObj;
        });

        return res.status(200).json({
            success: true,
            project: {
                ...project.toObject(),
                tasks: filteredTasks
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
        
        let parsedTeamMembers;
        if (updateData.teamMembers) {
            if (typeof updateData.teamMembers === 'string') {
                try {
                    parsedTeamMembers = JSON.parse(updateData.teamMembers);
                } catch (e) {
                    parsedTeamMembers = [];
                }
            } else if (Array.isArray(updateData.teamMembers)) {
                parsedTeamMembers = updateData.teamMembers;
            }
        }

        // Handle double-stringification
        if (typeof parsedTeamMembers === 'string') {
            try {
                parsedTeamMembers = JSON.parse(parsedTeamMembers);
            } catch (e) {
                parsedTeamMembers = [];
            }
        }

        let parsedTechStack;
        if (updateData.techStack) {
            if (Array.isArray(updateData.techStack)) {
                parsedTechStack = updateData.techStack;
            } else if (typeof updateData.techStack === "string") {
                try {
                    parsedTechStack = JSON.parse(updateData.techStack);
                } catch (e) {
                    parsedTechStack = updateData.techStack.split(",").map(t => t.trim()).filter(Boolean);
                }
            }
        }

        let newAttachments = [];
        if (req.files && req.files.length > 0) {
            newAttachments = req.files.map(file => ({
                url: file.path,
                filename: file.originalname || file.filename || "Attachment",
                fileType: file.mimetype || "",
                uploadedBy: req.user._id
            }));
        } else if (req.file) {
            newAttachments = [{
                url: req.file.path,
                filename: req.file.originalname || req.file.filename || "Attachment",
                fileType: req.file.mimetype || "",
                uploadedBy: req.user._id
            }];
        }

        const project = await Project.findOne({ _id: id, isDeleted: false });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or is deleted"
            });
        }

        // Update fields if provided
        if (updateData.projectName) project.projectName = updateData.projectName;
        if (updateData.description !== undefined) project.description = updateData.description;
        if (updateData.teamLead) project.teamLead = updateData.teamLead;
        if (updateData.startDate) project.startDate = updateData.startDate;
        if (updateData.endDate) project.endDate = updateData.endDate;
        if (updateData.status) project.status = updateData.status;
        if (updateData.priority) project.priority = updateData.priority;
        if (updateData.clientName !== undefined) project.clientName = updateData.clientName;
        if (updateData.estimatedTasks !== undefined) project.estimatedTasks = Number(updateData.estimatedTasks) || 0;
        
        if (parsedTeamMembers !== undefined) project.teamMembers = parsedTeamMembers;
        if (parsedTechStack !== undefined) project.techStack = parsedTechStack;

        if (newAttachments.length > 0) {
            project.attachments.push(...newAttachments);
            project.attachment = project.attachments[0].url; // fallback legacy
        }

        const updatedProject = await project.save();
        await updatedProject.populate([
            { path: "teamLead", select: "name email role profilePic" },
            { path: "teamMembers", select: "name email role profilePic" }
        ]);

        // Notify Team Lead and Team Members
        try {
            const recipients = new Set();
            if (updatedProject.teamLead?._id) recipients.add(updatedProject.teamLead._id.toString());
            if (updatedProject.teamMembers) {
                updatedProject.teamMembers.forEach(m => {
                    if (m?._id) recipients.add(m._id.toString());
                });
            }
            
            // Also notify all admins of project update
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin => recipients.add(admin._id.toString()));
            
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
            
            // Also notify all admins of project deletion
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin => recipients.add(admin._id.toString()));
            
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

// Add a project note / comment
export const addProjectNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, message: "Note text is required" });
        }

        const project = await Project.findById(id);
        if (!project || project.isDeleted) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Check permission
        const { role, _id } = req.user;
        const isLead = project.teamLead?.toString() === _id.toString();
        const isMember = project.teamMembers?.some(m => m.toString() === _id.toString());
        const isAdminUser = role === "admin";

        if (!isAdminUser && !isLead && !isMember) {
            return res.status(403).json({ success: false, message: "Unauthorized to add notes to this project" });
        }

        project.notes.push({
            text,
            author: _id
        });

        await project.save();

        // Fetch populated notes to return
        const updatedProject = await Project.findById(id)
            .populate("notes.author", "name email role profilePic");

        // Notify other project members
        try {
            const recipients = new Set();
            if (project.teamLead) recipients.add(project.teamLead.toString());
            if (project.teamMembers) {
                project.teamMembers.forEach(m => recipients.add(m.toString()));
            }
            // Also notify admins
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin => recipients.add(admin._id.toString()));

            recipients.delete(_id.toString()); // remove self

            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: _id,
                    title: "New Project Comment/Note",
                    message: `A new comment/note has been added to project "${project.projectName}" by ${req.user.name}`,
                    type: "project",
                    category: "update",
                    link: `/projects/${project._id}`
                });
            }
        } catch (err) {
            console.error("Note notification error:", err);
        }

        return res.status(200).json({
            success: true,
            message: "Note added successfully",
            notes: updatedProject.notes
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Upload additional project attachments
export const uploadProjectAttachments = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id);
        if (!project || project.isDeleted) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Check permission
        const { role, _id } = req.user;
        const isLead = project.teamLead?.toString() === _id.toString();
        const isMember = project.teamMembers?.some(m => m.toString() === _id.toString());
        const isAdminUser = role === "admin";

        if (!isAdminUser && !isLead && !isMember) {
            return res.status(403).json({ success: false, message: "Unauthorized to upload attachments to this project" });
        }

        let newAttachments = [];
        if (req.files && req.files.length > 0) {
            newAttachments = req.files.map(file => ({
                url: file.path,
                filename: file.originalname || file.filename || "Attachment",
                fileType: file.mimetype || "",
                uploadedBy: _id
            }));
        }

        if (req.file) {
            newAttachments.push({
                url: req.file.path,
                filename: req.file.originalname || req.file.filename || "Attachment",
                fileType: req.file.mimetype || "",
                uploadedBy: _id
            });
        }

        if (newAttachments.length === 0) {
            return res.status(400).json({ success: false, message: "No files were uploaded" });
        }

        project.attachments.push(...newAttachments);
        await project.save();

        const updatedProject = await Project.findById(id)
            .populate("attachments.uploadedBy", "name email role profilePic");

        // Notify other project members
        try {
            const recipients = new Set();
            if (project.teamLead) recipients.add(project.teamLead.toString());
            if (project.teamMembers) {
                project.teamMembers.forEach(m => recipients.add(m.toString()));
            }
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin => recipients.add(admin._id.toString()));

            recipients.delete(_id.toString()); // remove self

            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: _id,
                    title: "New Project Attachment",
                    message: `${newAttachments.length} new file(s) uploaded to project "${project.projectName}" by ${req.user.name}`,
                    type: "project",
                    category: "update",
                    link: `/projects/${project._id}`
                });
            }
        } catch (err) {
            console.error("Attachment notification error:", err);
        }

        return res.status(200).json({
            success: true,
            message: "Files uploaded successfully",
            attachments: updatedProject.attachments
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Update project members list
export const updateProjectMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const { teamMembers } = req.body;

        const project = await Project.findById(id);
        if (!project || project.isDeleted) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Check permission: Admin or Project Team Lead can manage members
        const { role, _id } = req.user;
        const isLead = project.teamLead?.toString() === _id.toString();
        const isAdminUser = role === "admin";

        if (!isAdminUser && !isLead) {
            return res.status(403).json({ success: false, message: "Only Admin or Team Lead can update project members" });
        }

        let parsedMembers = [];
        if (teamMembers) {
            if (Array.isArray(teamMembers)) {
                parsedMembers = teamMembers;
            } else if (typeof teamMembers === "string") {
                try {
                    parsedMembers = JSON.parse(teamMembers);
                } catch (e) {
                    parsedMembers = [];
                }
            }
        }

        project.teamMembers = parsedMembers;
        await project.save();

        const updatedProject = await Project.findById(id)
            .populate("teamLead", "name email role profilePic")
            .populate("teamMembers", "name email role profilePic");

        // Send notifications to new/remaining team members
        try {
            const members = await User.find({ _id: { $in: parsedMembers } });
            for (const member of members) {
                if (member._id.toString() !== _id.toString()) {
                    await createNotification({
                        recipient: member._id,
                        sender: _id,
                        title: "Project Assignment Update",
                        message: `You are assigned to project "${project.projectName}".`,
                        type: "project",
                        category: "assignment",
                        link: `/projects/${project._id}`
                    });
                }
            }
        } catch (err) {
            console.error("Member update notification error:", err);
        }

        return res.status(200).json({
            success: true,
            message: "Project members updated successfully",
            project: updatedProject
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};