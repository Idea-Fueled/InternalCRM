import { Task } from "../models/task.schema.js";
import { createNotification } from "./notification.controller.js";
import User from "../models/user.schema.js";

// Create Task
export const createTask = async (req, res) => {
    try {
        const { taskName, description, project, assignedTo, assignedQA, assignedBy, status, priority, startDate, endDate, developerNotes, qaNotes, attachments, isDeleted } = req.body;

        if (!taskName || !project) {
            return res.status(400).json({
                success: false,
                message: "Task name and project are required",
            });
        }

        const task = await Task.create({
            taskName,
            description,
            project,
            assignedTo,
            assignedQA,
            assignedBy: req.user._id || assignedBy,
            status,
            priority,
            startDate: startDate || new Date(),
            endDate,
            developerNotes,
            qaNotes,
            attachments,
            isDeleted,
            statusHistory: [{
                status: status || "New",
                changedBy: req.user?._id || assignedBy,
                changedAt: new Date(),
                notes: "Initial assignment"
            }]
        });

        const populatedTask = await Task.findById(task._id)
            .populate("project", "projectName name status teamLead")
            .populate("assignedTo", "name email")
            .populate("assignedQA", "name email")
            .populate("assignedBy", "name email")
            .populate("statusHistory.changedBy", "name role");

        // Send notifications
        // Notify TL of the project
        if (populatedTask.project?.teamLead) {
            await createNotification({
                recipient: populatedTask.project.teamLead,
                sender: req.user._id,
                title: "New Task Assigned",
                message: `${populatedTask.taskName} has been created in ${populatedTask.project.projectName}`,
                type: "task",
                category: "creation",
                link: `/projects/${populatedTask.project._id}`
            });
        }
        // Notify Developer if assigned
        if (populatedTask.assignedTo) {
            await createNotification({
                recipient: populatedTask.assignedTo._id,
                sender: req.user._id,
                title: "New Task Assigned",
                message: `You have been assigned to ${populatedTask.taskName}`,
                type: "task",
                category: "assignment",
                link: `/developer/tasks?taskId=${populatedTask._id}`
            });
        }
        // Notify QA if assigned
        if (populatedTask.assignedQA) {
            await createNotification({
                recipient: populatedTask.assignedQA._id,
                sender: req.user._id,
                title: "New Task for QA Review",
                message: `You have been assigned as QA for ${populatedTask.taskName}`,
                type: "task",
                category: "assignment",
                link: `/qa/tasks?taskId=${populatedTask._id}`
            });
        }

        return res.status(201).json({
            success: true,
            message: "Task created successfully",
            task: populatedTask
        });

    } catch (error) {
        console.error("Task creation error:", error);
        let message = error.message;
        
        if (error.name === "ValidationError") {
            message = Object.values(error.errors).map(val => val.message).join(", ");
        } else if (error.name === "CastError") {
            message = `Invalid ${error.path}: ${error.value}`;
        }

        return res.status(error.name === "ValidationError" || error.name === "CastError" ? 400 : 500).json({
            success: false,
            message: message || "Internal server error"
        });
    }
};

// Get All Tasks (excluding deleted)
export const getAllTasks = async (req, res) => {
    try {
        const { role, _id } = req.user;
        let query = { isDeleted: false };

        // If not admin or TL, only show tasks assigned to them
        if (role !== "admin" && role !== "TL") {
            query = { 
                ...query, 
                $or: [
                    { assignedTo: _id },
                    { assignedQA: _id }
                ]
            };
        }

        const tasks = await Task.find(query)
            .populate("project", "projectName name status")
            .populate("assignedTo", "name email role")
            .populate("assignedBy", "name email role")
            .populate("assignedQA", "name email role")
            .populate("statusHistory.changedBy", "name role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            tasks
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get Single Task
export const getSingleTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findOne({ _id: id, isDeleted: false })
            .populate("project", "projectName name description status")
            .populate("assignedTo", "name email role")
            .populate("assignedBy", "name email role")
            .populate("statusHistory.changedBy", "name role");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        // Visibility Scoping for Sensitive Notes/Attachments
        const isAuthorized = 
            req.user.role === 'admin' || 
            (task.project && task.project.teamLead && task.project.teamLead.toString() === req.user._id.toString()) ||
            (task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString()) ||
            (task.assignedQA && task.assignedQA.toString() === req.user._id.toString());

        if (!isAuthorized && task.statusHistory) {
            task.statusHistory = task.statusHistory.map(h => ({
                ...h.toObject(),
                notes: "[Restricted Visibility]",
                attachment: "[Restricted Visibility]"
            }));
        }

        return res.status(200).json({
            success: true,
            task
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Update Task
export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Prevent updating isDeleted via this route
        delete updates.isDeleted;

        const updatedTask = await Task.findOneAndUpdate(
            { _id: id, isDeleted: false },
            updates,
            { new: true, runValidators: true }
        )
        .populate("project", "projectName name status teamLead")
        .populate("assignedTo", "name email role")
        .populate("assignedQA", "name email role")
        .populate("assignedBy", "name email role");

        if (!updatedTask) {
            return res.status(404).json({
                success: false,
                message: "Task not found or has been deleted"
            });
        }

        // Send Notifications to relevant parties
        const recipients = new Set();
        if (updatedTask.project?.teamLead) recipients.add(updatedTask.project.teamLead.toString());
        if (updatedTask.assignedTo) recipients.add(updatedTask.assignedTo._id.toString());
        if (updatedTask.assignedQA) recipients.add(updatedTask.assignedQA._id.toString());
        
        // Remove the person who made the change from recipients
        recipients.delete(req.user._id.toString());

        for (const recipientId of recipients) {
            await createNotification({
                recipient: recipientId,
                sender: req.user._id,
                title: "Task Updated",
                message: `${updatedTask.taskName} has been updated by ${req.user.name}`,
                type: "task",
                category: "update",
                link: `/kanban/${updatedTask.project?._id}?taskId=${updatedTask._id}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task updated successfully",
            task: updatedTask
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Update Task Status (with optional notes and attachment logged to statusHistory)
export const updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, attachment } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        const validStatuses = ["New", "In Progress", "QA Review", "Completed", "Done"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        }

        const taskToUpdate = await Task.findById(id).populate("project");
        if (!taskToUpdate) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        // Enforce Workflow Rules
        const role = req.user.role;
        if (role === "developer") {
            if (!["In Progress", "QA Review"].includes(status)) {
                return res.status(403).json({
                    success: false,
                    message: "Developers can only move tasks to 'In Progress' or 'QA Review'"
                });
            }
        } else if (role === "qa") {
            if (!["Completed", "In Progress"].includes(status)) {
                return res.status(403).json({
                    success: false,
                    message: "QA can only move tasks to 'Completed' or back to 'In Progress' (Reject)"
                });
            }
        }

        // Build history entry
        const historyEntry = {
            status,
            notes: notes || "",
            attachment: attachment || "",
            changedBy: req.user._id,
            changedAt: new Date()
        };

        const task = await Task.findOneAndUpdate(
            { _id: id, isDeleted: false },
            {
                status,
                $push: { statusHistory: historyEntry }
            },
            { new: true }
        )
        .populate("project", "projectName name status teamLead")
        .populate("assignedTo", "name email");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found or has been deleted"
            });
        }

        // Send Notifications
        const senderName = req.user.name;
        const taskName = task.taskName;
        const projectName = task.project?.projectName || "Project";
        const projectId = task.project?._id;

        // Notify Project TL
        if (task.project?.teamLead && task.project.teamLead.toString() !== req.user._id.toString()) {
            await createNotification({
                recipient: task.project.teamLead,
                sender: req.user._id,
                title: "Task Status Updated",
                message: `${taskName} in ${projectName} moved to ${status} by ${senderName}`,
                type: "task",
                category: "status_change",
                link: `/kanban/${projectId}?taskId=${task._id}`
            });
        }

        // Notify Developer (if they didn't do it)
        if (task.assignedTo && task.assignedTo._id.toString() !== req.user._id.toString()) {
            await createNotification({
                recipient: task.assignedTo._id,
                sender: req.user._id,
                title: "Task Status Updated",
                message: `Your task ${taskName} was moved to ${status} by ${senderName}`,
                type: "task",
                category: "status_change",
                link: `/developer/tasks?taskId=${task._id}`
            });
        }

        // Notify QAs if moved to QA Review
        if (status === "QA Review") {
            // Notify Assigned QA specifically if exists
            if (task.assignedQA && task.assignedQA.toString() !== req.user._id.toString()) {
                await createNotification({
                    recipient: task.assignedQA,
                    sender: req.user._id,
                    title: "Task Ready for Review",
                    message: `${taskName} in ${projectName} is ready for your review`,
                    type: "task",
                    category: "qa_review",
                    link: `/qa/tasks?taskId=${task._id}`
                });
            } else {
                // Fallback: Notify all QAs if no specific QA assigned
                const qas = await User.find({ role: "qa" });
                for (const qa of qas) {
                    if (qa._id.toString() !== req.user._id.toString()) {
                        await createNotification({
                            recipient: qa._id,
                            sender: req.user._id,
                            title: "New QA Review Request",
                            message: `${taskName} in ${projectName} is ready for review`,
                            type: "task",
                            category: "approval",
                            link: `/qa/dashboard?taskId=${task._id}`
                        });
                    }
                }
            }
        }

        // Notify Admins
        const admins = await User.find({ role: "admin" });
        for (const admin of admins) {
            if (admin._id.toString() !== req.user._id.toString()) {
                await createNotification({
                    recipient: admin._id,
                    sender: req.user._id,
                    title: "Task Status Updated",
                    message: `${taskName} in ${projectName} moved to ${status} by ${senderName}`,
                    type: "task",
                    category: "status_change",
                    link: `/kanban/${projectId}?taskId=${task._id}`
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Task status updated successfully",
            task
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Soft Delete Task
export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found or already deleted"
            });
        }

        // Send Notifications
        try {
            const populatedTask = await Task.findById(id).populate("project", "projectName teamLead");
            const recipients = new Set();
            if (populatedTask.project?.teamLead) recipients.add(populatedTask.project.teamLead.toString());
            if (populatedTask.assignedTo) recipients.add(populatedTask.assignedTo.toString());
            
            recipients.delete(req.user._id.toString());

            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: req.user._id,
                    title: "Task Deleted",
                    message: `${populatedTask.taskName} has been moved to trash by ${req.user.name}`,
                    type: "task",
                    category: "deletion",
                    link: `/trash`
                });
            }
        } catch (notifErr) {
            console.error("Notification error on task delete:", notifErr);
        }

        return res.status(200).json({
            success: true,
            message: "Task moved to trash successfully",
            task
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Restore Deleted Task
export const restoreTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findOneAndUpdate(
            { _id: id, isDeleted: true },
            { isDeleted: false },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found in trash"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task restored successfully",
            task
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get Deleted Tasks (Trash)
export const getDeletedTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ isDeleted: true })
            .populate("project", "projectName name")
            .populate("assignedTo", "name email")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            tasks
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get Tasks by Project
export const getTasksByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const tasks = await Task.find({ project: projectId, isDeleted: false })
            .populate("assignedTo", "name email role")
            .populate("assignedBy", "name email role")
            .populate("statusHistory.changedBy", "name role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            tasks
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get Tasks by User
export const getTasksByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const tasks = await Task.find({ assignedTo: userId, isDeleted: false })
            .populate("project", "projectName name status")
            .populate("assignedBy", "name email")
            .populate("assignedQA", "name email role")
            .populate("statusHistory.changedBy", "name role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            tasks
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};