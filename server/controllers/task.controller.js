import { Task } from "../models/task.schema.js";
import { createNotification, getUserNotificationLabel } from "./notification.controller.js";
import User from "../models/user.schema.js";
import Project from "../models/project.schema.js";
import { createAuditLog } from "./auditLog.controller.js";
import { getUserRoleCategory } from "../middlewares/auth.middleware.js";

const canViewPerformanceMetrics = (requestUser, targetUser) => {
    if (!requestUser || !targetUser) return false;

    const myId = String(requestUser._id || requestUser.id);
    const targetId = String(targetUser._id || targetUser.id);

    // 1. Own profile metrics are always visible
    if (myId === targetId) {
        return true;
    }

    const requestRole = requestUser.role; // Already resolved in protectRoute middleware
    const targetRole = getUserRoleCategory(targetUser);

    // 2. Admin can see everyone's metrics
    if (requestRole === 'admin') {
        return true;
    }

    // 3. HR can see everyone's metrics except admin
    if (requestRole === 'hr') {
        return targetRole !== 'admin';
    }

    // 4. Team Leads can only see metrics of their direct reports (and target cannot be admin, hr, or TL)
    if (requestRole === 'TL') {
        if (targetRole === 'admin' || targetRole === 'hr' || targetRole === 'TL') {
            return false;
        }

        const targetRM = targetUser.reportingManager;
        const targetRMs = targetUser.reportingManagers || [];
        const targetTLs = targetUser.teamLeads || [];

        const isDirectReport = 
            (targetRM && String(targetRM._id || targetRM) === myId) ||
            targetRMs.some(m => String(m._id || m) === myId) ||
            targetTLs.some(tl => String(tl._id || tl) === myId);

        return isDirectReport;
    }

    // 5. Employees & QA can only see their own metrics (which is handled by own profile check)
    if (requestRole === 'employee' || requestRole === 'qa') {
        return false;
    }

    return false;
};

// ─── Hierarchy-Based Visibility Helper ────────────────────────────────────────
// Filters statusHistory entries so that notes, attachments, and screenshotLinks
// are only visible to users allowed by the role hierarchy.
const filterTaskVisibility = (task, currentUser) => {
    if (!task || !task.statusHistory) return task;

    const userId = currentUser._id.toString();
    const userRole = currentUser.role;

    // Admin sees everything
    if (userRole === "admin") return task;

    // Check if user is project TL
    const projectTL = task.project?.teamLead
        ? (typeof task.project.teamLead === "object"
            ? task.project.teamLead._id?.toString()
            : task.project.teamLead.toString())
        : null;
    const isTL = projectTL === userId;

    // TL sees everything in their project
    if (isTL) return task;

    const assignedToId = task.assignedTo
        ? (typeof task.assignedTo === "object" ? task.assignedTo._id?.toString() : task.assignedTo.toString())
        : null;
    const assignedQAId = task.assignedQA
        ? (typeof task.assignedQA === "object" ? task.assignedQA._id?.toString() : task.assignedQA.toString())
        : null;

    const isAssignedDev = assignedToId === userId;
    const isAssignedQA = assignedQAId === userId;

    // If user is neither assigned dev nor assigned QA, restrict everything
    if (!isAssignedDev && !isAssignedQA) {
        task.statusHistory = task.statusHistory.map(h => {
            const obj = h.toObject ? h.toObject() : { ...h };
            return {
                ...obj,
                notes: "[Restricted Visibility]",
                attachment: "",
                attachments: [],
                screenshotLinks: []
            };
        });
        return task;
    }

    // For assigned dev/QA: show entries they created + entries created by TL/Admin.
    // Hide entries from the *other* assignee only if the creator is that other assignee.
    task.statusHistory = task.statusHistory.map(h => {
        const obj = h.toObject ? h.toObject() : { ...h };
        const changedById = obj.changedBy
            ? (typeof obj.changedBy === "object" ? obj.changedBy._id?.toString() : obj.changedBy.toString())
            : null;

        // If I created it, show it
        if (changedById === userId) return obj;

        // If created by TL or admin, show it (TL already returned above; this handles admin entries)
        // We can't easily check the role of changedBy without populating, so we allow it
        // unless it was specifically created by the OTHER assignee
        if (isAssignedDev && changedById === assignedQAId) {
            // Developer viewing QA's entry – QA entries ARE visible to assigned dev per requirements
            return obj;
        }
        if (isAssignedQA && changedById === assignedToId) {
            // QA viewing Developer's entry – Dev entries ARE visible to assigned QA per requirements
            return obj;
        }

        // For any other person's entry (someone not TL, not the other assignee), show it
        // This covers admin entries and TL entries
        return obj;
    });

    return task;
};

// ─── Upload Task Attachment ───────────────────────────────────────────────────
export const uploadTaskAttachment = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const formatSize = (bytes) => {
            if (!bytes) return "";
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / 1048576).toFixed(1)} MB`;
        };

        const fileData = {
            url: req.file.path,
            filename: req.file.originalname || req.file.filename || "attachment",
            fileType: req.file.mimetype || "",
            fileSize: formatSize(req.file.size)
        };

        return res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            file: fileData
        });
    } catch (error) {
        console.error("Upload attachment error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to upload attachment"
        });
    }
};

// Create Task
export const createTask = async (req, res) => {
    try {
        const { taskName, description, project, assignedTo, assignedQA, assignedBy, status, priority, startDate, endDate, developerNotes, qaNotes, attachments, screenshotLinks, isDeleted } = req.body;

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
            attachments: (attachments || []).map(att => ({
                ...att,
                uploadedBy: att.uploadedBy || req.user._id,
                createdAt: att.createdAt || new Date()
            })),
            screenshotLinks: screenshotLinks || [],
            isDeleted,
            statusHistory: [{
                fromStatus: "Created",
                status: status || "New",
                changedBy: req.user?._id || assignedBy,
                changedAt: new Date(),
                notes: "Initial assignment"
            }]
        });

        const populatedTask = await Task.findById(task._id)
            .populate("project", "projectName name status teamLead")
            .populate("assignedTo", "name email profilePic")
            .populate("assignedQA", "name email profilePic")
            .populate("assignedBy", "name email profilePic")
            .populate("statusHistory.changedBy", "name role designation")
            .populate("attachments.uploadedBy", "name email role profilePic")
            .populate("statusHistory.attachments.uploadedBy", "name email role profilePic");

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
                link: `/projects/${populatedTask.project._id}?taskId=${populatedTask._id}`
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
                link: `/employee/my-tasks?taskId=${populatedTask._id}`
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
                link: `/qa/reviews?taskId=${populatedTask._id}`
            });
        }

        // Notify all admins of task creation
        try {
            const admins = await User.find({ role: "admin" });
            for (const admin of admins) {
                if (admin._id.toString() !== req.user._id.toString()) {
                    await createNotification({
                        recipient: admin._id,
                        sender: req.user._id,
                        title: "New Task Created",
                        message: `${populatedTask.taskName} has been created in ${populatedTask.project?.projectName || 'Project'} by ${getUserNotificationLabel(req.user)}${req.user.name}`,
                        type: "task",
                        category: "creation",
                        link: `/projects/${populatedTask.project?._id}?taskId=${populatedTask._id}`
                    });
                }
            }
        } catch (notifErr) {
            console.error("Notification error on task creation:", notifErr);
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

        // If not admin, only show tasks related to the user
        if (role !== "admin") {
            const orConditions = [
                { assignedTo: _id },
                { assignedQA: _id }
            ];

            // If TL, also show tasks for projects they lead
            if (role === "TL") {
                const Project = (await import("../models/project.schema.js")).default;
                const ledProjects = await Project.find({ teamLead: _id, isDeleted: false });
                const ledProjectIds = ledProjects.map(p => p._id);
                orConditions.push({ project: { $in: ledProjectIds } });
            }

            query = { 
                ...query, 
                $or: orConditions
            };
        }

        const tasks = await Task.find(query)
            .populate("project", "projectName name status teamLead")
            .populate("assignedTo", "name email role profilePic")
            .populate("assignedBy", "name email role profilePic")
            .populate("assignedQA", "name email role profilePic")
            .populate("statusHistory.changedBy", "name role designation")
            .populate("attachments.uploadedBy", "name email role profilePic")
            .populate("statusHistory.attachments.uploadedBy", "name email role profilePic")
            .sort({ createdAt: -1 });

        // Apply visibility filtering to each task
        const filteredTasks = tasks.map(t => {
            const taskObj = t.toObject ? t.toObject() : { ...t };
            return filterTaskVisibility(taskObj, req.user);
        });

        return res.status(200).json({
            success: true,
            tasks: filteredTasks
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
            .populate("project", "projectName name description status teamLead")
            .populate("assignedTo", "name email role profilePic")
            .populate("assignedQA", "name email role profilePic")
            .populate("assignedBy", "name email role profilePic")
            .populate("statusHistory.changedBy", "name role designation profilePic")
            .populate("attachments.uploadedBy", "name email role profilePic")
            .populate("statusHistory.attachments.uploadedBy", "name email role profilePic");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        const { role, _id } = req.user;
        if (role !== "admin") {
            const isAssigned = (task.assignedTo?._id?.toString() === _id.toString() || task.assignedTo?.toString() === _id.toString() ||
                                task.assignedQA?._id?.toString() === _id.toString() || task.assignedQA?.toString() === _id.toString());
            const isProjectTL = task.project && (task.project.teamLead?.toString() === _id.toString() || task.project.teamLead?._id?.toString() === _id.toString());
            
            if (!isAssigned && !isProjectTL) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized Access: You do not have access to this task."
                });
            }
        }

        // Apply hierarchy-based visibility
        const taskObj = task.toObject();
        const filtered = filterTaskVisibility(taskObj, req.user);

        return res.status(200).json({
            success: true,
            task: filtered
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

        if (updates.attachments && Array.isArray(updates.attachments)) {
            updates.attachments = updates.attachments.map(att => ({
                ...att,
                uploadedBy: att.uploadedBy || req.user._id,
                createdAt: att.createdAt || new Date()
            }));
        }

        const updatedTask = await Task.findOneAndUpdate(
            { _id: id, isDeleted: false },
            updates,
            { new: true, runValidators: true }
        )
        .populate("project", "projectName name status teamLead")
        .populate("assignedTo", "name email role profilePic")
        .populate("assignedQA", "name email role profilePic")
        .populate("assignedBy", "name email role profilePic")
        .populate("attachments.uploadedBy", "name email role profilePic")
        .populate("statusHistory.attachments.uploadedBy", "name email role profilePic");

        if (!updatedTask) {
            return res.status(404).json({
                success: false,
                message: "Task not found or has been deleted"
            });
        }

        // Send Notifications to relevant parties
        try {
            const recipients = new Set();
            if (updatedTask.project?.teamLead) recipients.add(updatedTask.project.teamLead.toString());
            if (updatedTask.assignedTo?._id) recipients.add(updatedTask.assignedTo._id.toString());
            if (updatedTask.assignedQA?._id) recipients.add(updatedTask.assignedQA._id.toString());
            
            // Also notify all admins of task update
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin => recipients.add(admin._id.toString()));
            
            // Remove the person who made the change from recipients
            if (req.user?._id) {
                recipients.delete(req.user._id.toString());
            }

            const projName = updatedTask.project?.projectName || updatedTask.project?.name || "Project";
            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: req.user._id,
                    title: "Task Updated",
                    message: `${updatedTask.taskName} has been updated by ${getUserNotificationLabel(req.user)}${req.user.name}`,
                    type: "task",
                    category: "update",
                    link: `/projects/${updatedTask.project?._id}?taskId=${updatedTask._id}&projectName=${encodeURIComponent(projName)}`
                });
            }
        } catch (notifErr) {
            console.error("Notification error in updateTask:", notifErr);
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

// Update Task Status (with optional notes, attachments, and screenshot links logged to statusHistory)
export const updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, attachment, attachments, screenshotLinks } = req.body;

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
        const isEmployeeRole = !["admin", "TL", "qa"].includes(role);
        if (isEmployeeRole) {
            if (!["In Progress", "QA Review"].includes(status)) {
                return res.status(403).json({
                    success: false,
                    message: "Employees can only move tasks to 'In Progress' or 'QA Review'"
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

        const enrichedAttachments = (Array.isArray(attachments) ? attachments : []).map(att => ({
            ...att,
            uploadedBy: att.uploadedBy || req.user._id,
            createdAt: att.createdAt || new Date()
        }));

        // Build history entry with rich data
        const historyEntry = {
            fromStatus: taskToUpdate.status,
            status,
            notes: notes || "",
            attachment: attachment || "",
            attachments: enrichedAttachments,
            screenshotLinks: Array.isArray(screenshotLinks) ? screenshotLinks : [],
            changedBy: req.user._id,
            changedAt: new Date()
        };

        // Build the update object — also append attachments & screenshotLinks to top-level arrays
        const updateObj = {
            status,
            $push: {
                statusHistory: historyEntry
            }
        };

        // If a QA changes status, assign them as the QA reviewer if not already assigned
        if (role === "qa" && (!taskToUpdate.assignedQA || taskToUpdate.assignedQA.toString() !== req.user._id.toString())) {
            updateObj.assignedQA = req.user._id;
        }

        // Append new attachments and screenshot links to the top-level task arrays
        const pushToArrays = {};
        if (enrichedAttachments.length > 0) {
            pushToArrays.attachments = { $each: enrichedAttachments };
        }
        if (Array.isArray(screenshotLinks) && screenshotLinks.length > 0) {
            pushToArrays.screenshotLinks = { $each: screenshotLinks };
        }
        if (Object.keys(pushToArrays).length > 0) {
            // Merge into $push
            Object.assign(updateObj.$push, pushToArrays);
        }

        const task = await Task.findOneAndUpdate(
            { _id: id, isDeleted: false },
            updateObj,
            { new: true }
        )
        .populate("project", "projectName name status teamLead")
        .populate("assignedTo", "name email profilePic")
        .populate("assignedQA", "name email profilePic")
        .populate("statusHistory.changedBy", "name role designation profilePic")
        .populate("attachments.uploadedBy", "name email role profilePic")
        .populate("statusHistory.attachments.uploadedBy", "name email role profilePic");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found or has been deleted"
            });
        }

        // Send Notifications
        try {
            const senderName = req.user.name;
            const taskName = task.taskName;
            const projectName = task.project?.projectName || "Project";
            const projectId = task.project?._id;

            // Explicit QA Approval / Rejection detection
            let customTitle = "Task Status Updated";
            let customMsg = `${taskName} in ${projectName} moved to ${status} by ${getUserNotificationLabel(req.user)}${senderName}`;
            let category = "status_change";

            if (taskToUpdate.status === "QA Review") {
                if (status === "Completed") {
                    customTitle = "QA Task Approved";
                    customMsg = `Task "${taskName}" has been APPROVED by ${getUserNotificationLabel(req.user)}${senderName} in project "${projectName}".`;
                    category = "qa_approval";
                } else if (status === "In Progress") {
                    customTitle = "QA Task Rejected";
                    customMsg = `Task "${taskName}" was REJECTED by ${getUserNotificationLabel(req.user)}${senderName} in "${projectName}". Reason: ${notes || "No comments provided"}`;
                    category = "qa_rejection";
                }
            } else if (status === "QA Review") {
                customTitle = "QA Review Request";
                customMsg = `Task "${taskName}" in project "${projectName}" has been submitted for QA Review by ${getUserNotificationLabel(req.user)}${senderName}.`;
                category = "qa_review";
            }

            // Notify Project TL
            if (task.project?.teamLead && task.project.teamLead.toString() !== req.user._id.toString()) {
                await createNotification({
                    recipient: task.project.teamLead,
                    sender: req.user._id,
                    title: customTitle,
                    message: customMsg,
                    type: "task",
                    category: category,
                    link: `/projects/${projectId}?taskId=${task._id}&projectName=${encodeURIComponent(projectName)}`
                });
            }

            // Notify Developer (if they didn't do it)
            if (task.assignedTo?._id && task.assignedTo._id.toString() !== req.user._id.toString()) {
                await createNotification({
                    recipient: task.assignedTo._id,
                    sender: req.user._id,
                    title: customTitle,
                    message: customMsg,
                    type: "task",
                    category: category,
                    link: `/projects/${projectId}?taskId=${task._id}&projectName=${encodeURIComponent(projectName)}`
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
                        link: `/projects/${projectId}?taskId=${task._id}&projectName=${encodeURIComponent(projectName)}`
                    });
                } else {
                    // Fallback: Notify QAs assigned as members in that project
                    try {
                        const Project = (await import("../models/project.schema.js")).default;
                        const project = await Project.findById(projectId).select("teamMembers");
                        if (project && project.teamMembers && project.teamMembers.length > 0) {
                            const qas = await User.find({ 
                                _id: { $in: project.teamMembers },
                                role: "qa" 
                            });
                            for (const qa of qas) {
                                if (qa._id.toString() !== req.user._id.toString()) {
                                    await createNotification({
                                        recipient: qa._id,
                                        sender: req.user._id,
                                        title: "New QA Review Request",
                                        message: `${taskName} in ${projectName} is ready for review`,
                                        type: "task",
                                        category: "approval",
                                        link: `/projects/${projectId}?taskId=${task._id}&projectName=${encodeURIComponent(projectName)}`
                                    });
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Error in fallback QA notifications:", err);
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
                        title: customTitle,
                        message: customMsg,
                        type: "task",
                        category: category,
                        link: `/projects/${projectId}?taskId=${task._id}&projectName=${encodeURIComponent(projectName)}`
                    });
                }
            }
        } catch (notifErr) {
            console.error("Notification error in updateTaskStatus:", notifErr);
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
            
            // Also notify all admins of task deletion
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin => recipients.add(admin._id.toString()));
            
            recipients.delete(req.user._id.toString());

            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: req.user._id,
                    title: "Task Deleted",
                    message: `${populatedTask.taskName} has been moved to trash by ${getUserNotificationLabel(req.user)}${req.user.name}`,
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
            .populate("assignedTo", "name email profilePic")
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

export const getTasksByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { role, _id } = req.user;

        let query = { project: projectId, isDeleted: false };

        if (role !== "admin") {
            const Project = (await import("../models/project.schema.js")).default;
            const project = await Project.findOne({ _id: projectId, isDeleted: false });
            
            const isProjectTL = project && (project.teamLead?.toString() === _id.toString() || project.teamLead?._id?.toString() === _id.toString());
            if (!isProjectTL) {
                query.$or = [
                    { assignedTo: _id },
                    { assignedQA: _id }
                ];
            }
        }

        const tasks = await Task.find(query)
            .populate("project", "projectName name status teamLead")
            .populate("assignedTo", "name email role profilePic")
            .populate("assignedBy", "name email role profilePic")
            .populate("assignedQA", "name email role profilePic")
            .populate("statusHistory.changedBy", "name role designation profilePic")
            .populate("attachments.uploadedBy", "name email role profilePic")
            .populate("statusHistory.attachments.uploadedBy", "name email role profilePic")
            .sort({ createdAt: -1 });

        // Apply visibility filtering
        const filteredTasks = tasks.map(t => {
            const taskObj = t.toObject ? t.toObject() : { ...t };
            return filterTaskVisibility(taskObj, req.user);
        });

        return res.status(200).json({
            success: true,
            tasks: filteredTasks
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
        
        // Fetch target user first to verify permissions
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!canViewPerformanceMetrics(req.user, targetUser)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission to view performance metrics for this user."
            });
        }

        const tasks = await Task.find({ assignedTo: userId, isDeleted: false })
            .populate("project", "projectName name status teamLead")
            .populate("assignedTo", "name email role profilePic")
            .populate("assignedBy", "name email role profilePic")
            .populate("assignedQA", "name email role profilePic")
            .populate("statusHistory.changedBy", "name role designation profilePic")
            .populate("attachments.uploadedBy", "name email role profilePic")
            .populate("statusHistory.attachments.uploadedBy", "name email role profilePic")
            .sort({ createdAt: -1 });

        // Apply visibility filtering
        const filteredTasks = tasks.map(t => {
            const taskObj = t.toObject ? t.toObject() : { ...t };
            return filterTaskVisibility(taskObj, req.user);
        });

        return res.status(200).json({
            success: true,
            tasks: filteredTasks
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Permanently delete a task
export const hardDeleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findByIdAndDelete(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task permanently deleted"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Delete Task History Note / Comment
export const deleteTaskHistoryNote = async (req, res) => {
    try {
        const { id, historyId } = req.params;
        const task = await Task.findById(id);
        if (!task || task.isDeleted) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        const entry = task.statusHistory.id(historyId);
        if (!entry) {
            return res.status(404).json({ success: false, message: "History entry not found" });
        }

        const entryAuthor = await User.findById(entry.changedBy);
        const { role, _id } = req.user;
        const isAuthor = entry.changedBy?.toString() === _id.toString();
        const isAdminUser = role === "admin";
        
        const project = await Project.findById(task.project);
        const isProjectLead = project?.teamLead?.toString() === _id.toString();

        let hasPermission = false;
        if (isAdminUser) {
            hasPermission = true;
        } else if (isAuthor) {
            hasPermission = true;
        } else if (isProjectLead) {
            if (!entryAuthor || (entryAuthor.role !== "admin" && entryAuthor.role !== "TL")) {
                hasPermission = true;
            }
        }

        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this note" });
        }

        const deletedNoteText = entry.notes;
        entry.notes = "";
        await task.save();

        const updatedTask = await Task.findById(id)
            .populate("project", "projectName name status teamLead")
            .populate("assignedTo", "name email profilePic")
            .populate("assignedQA", "name email profilePic")
            .populate("statusHistory.changedBy", "name role designation profilePic")
            .populate("attachments.uploadedBy", "name email role profilePic")
            .populate("statusHistory.attachments.uploadedBy", "name email role profilePic");

        // Record Audit Log
        const details = `Task transition comment "${deletedNoteText.substring(0, 40)}${deletedNoteText.length > 40 ? '...' : ''}" on task "${task.taskName}" was deleted by ${getUserNotificationLabel(req.user)}${req.user.name}`;
        await createAuditLog({
            req,
            itemType: "Note",
            project: task.project,
            task: id,
            details
        });

        // Send notifications
        try {
            const recipients = new Set();
            if (project?.teamLead) recipients.add(project.teamLead.toString());
            if (task.assignedTo) recipients.add(task.assignedTo.toString());
            if (task.assignedQA) recipients.add(task.assignedQA.toString());
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin => recipients.add(admin._id.toString()));

            recipients.delete(_id.toString());

            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: _id,
                    title: "Task Comment/Note Deleted",
                    message: `A note was deleted from task "${task.taskName}" by ${getUserNotificationLabel(req.user)}${req.user.name}`,
                    type: "task",
                    category: "delete",
                    link: `/projects/${task.project}?taskId=${task._id}`
                });
            }
        } catch (err) {
            console.error("Task comment deletion notification error:", err);
        }

        return res.status(200).json({
            success: true,
            message: "Note deleted successfully",
            task: updatedTask
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Task Attachment
export const deleteTaskAttachment = async (req, res) => {
    try {
        const { id, attachmentId } = req.params;
        const task = await Task.findById(id);
        if (!task || task.isDeleted) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        let attachment = null;
        let attachmentSource = null; // "task" or "history"
        let parentHistoryEntry = null;

        // Check top-level task.attachments
        attachment = task.attachments.id(attachmentId);
        if (attachment) {
            attachmentSource = "task";
        } else {
            // Check statusHistory.attachments
            for (const hEntry of task.statusHistory) {
                const att = hEntry.attachments.id(attachmentId);
                if (att) {
                    attachment = att;
                    attachmentSource = "history";
                    parentHistoryEntry = hEntry;
                    break;
                }
            }
        }

        if (!attachment) {
            return res.status(404).json({ success: false, message: "Attachment not found" });
        }

        const uploaderId = attachment.uploadedBy || (attachmentSource === "history" ? parentHistoryEntry?.changedBy : null);
        const uploader = uploaderId ? await User.findById(uploaderId) : null;
        const { role, _id } = req.user;
        const isUploader = uploaderId?.toString() === _id.toString();
        const isAdminUser = role === "admin";
        
        const project = await Project.findById(task.project);
        const isProjectLead = project?.teamLead?.toString() === _id.toString();

        let hasPermission = false;
        if (isAdminUser) {
            hasPermission = true;
        } else if (isUploader) {
            hasPermission = true;
        } else if (isProjectLead) {
            if (!uploader || (uploader.role !== "admin" && uploader.role !== "TL")) {
                hasPermission = true;
            }
        }

        if (!hasPermission) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this attachment" });
        }

        // Pull attachment out of array
        if (attachmentSource === "task") {
            task.attachments.pull({ _id: attachmentId });
        } else {
            parentHistoryEntry.attachments.pull({ _id: attachmentId });
        }
        await task.save();

        const updatedTask = await Task.findById(id)
            .populate("project", "projectName name status teamLead")
            .populate("assignedTo", "name email profilePic")
            .populate("assignedQA", "name email profilePic")
            .populate("statusHistory.changedBy", "name role designation profilePic")
            .populate("attachments.uploadedBy", "name email role profilePic")
            .populate("statusHistory.attachments.uploadedBy", "name email role profilePic");

        // Record Audit Log
        const details = `Attachment "${attachment.filename}" was deleted from task "${task.taskName}" by ${getUserNotificationLabel(req.user)}${req.user.name}`;
        await createAuditLog({
            req,
            itemType: "Attachment",
            project: task.project,
            task: id,
            details
        });

        // Send notifications
        try {
            const recipients = new Set();
            if (project?.teamLead) recipients.add(project.teamLead.toString());
            if (task.assignedTo) recipients.add(task.assignedTo.toString());
            if (task.assignedQA) recipients.add(task.assignedQA.toString());
            const admins = await User.find({ role: "admin" });
            admins.forEach(admin => recipients.add(admin._id.toString()));

            recipients.delete(_id.toString());

            for (const recipientId of recipients) {
                await createNotification({
                    recipient: recipientId,
                    sender: _id,
                    title: "Task Attachment Deleted",
                    message: `File "${attachment.filename}" was deleted from task "${task.taskName}" by ${getUserNotificationLabel(req.user)}${req.user.name}`,
                    type: "task",
                    category: "delete",
                    link: `/projects/${task.project}?taskId=${task._id}`
                });
            }
        } catch (err) {
            console.error("Task attachment deletion notification error:", err);
        }

        return res.status(200).json({
            success: true,
            message: "Attachment deleted successfully",
            task: updatedTask
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};