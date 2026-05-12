import { Task } from "../models/task.schema.js";

// Create Task
export const createTask = async (req, res) => {
    try {
        const { taskName, description, project, assignedTo, assignedBy, status, priority, startDate, endDate, developerNotes, qaNotes, attachments, isDeleted } = req.body;

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
            assignedBy,
            status,
            priority,
            startDate,
            endDate,
            developerNotes,
            qaNotes,
            attachments,
            isDeleted
        });

        const populatedTask = await Task.findById(task._id)
            .populate("project", "name status")
            .populate("assignedTo", "name email")
            .populate("assignedBy", "name email");

        return res.status(201).json({
            success: true,
            message: "Task created successfully",
            task: populatedTask
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get All Tasks (excluding deleted)
export const getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ isDeleted: false })
            .populate("project", "name status")
            .populate("assignedTo", "name email role")
            .populate("assignedBy", "name email role")
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
            .populate("project", "name description status")
            .populate("assignedTo", "name email role")
            .populate("assignedBy", "name email role");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
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
        .populate("project", "name status")
        .populate("assignedTo", "name email role")
        .populate("assignedBy", "name email role");

        if (!updatedTask) {
            return res.status(404).json({
                success: false,
                message: "Task not found or has been deleted"
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

// Update Task Status
export const updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

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

        const task = await Task.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { status },
            { new: true }
        )
        .populate("project", "name status")
        .populate("assignedTo", "name email");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found or has been deleted"
            });
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
            .populate("project", "name")
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
            .populate("project", "name status")
            .populate("assignedBy", "name email")
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