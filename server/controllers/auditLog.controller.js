import { AuditLog } from "../models/auditLog.schema.js";
import Project from "../models/project.schema.js";

// Helper function to create system audit log (internal use)
export const createAuditLog = async ({ req, itemType, project, task, details }) => {
    try {
        await AuditLog.create({
            deletedBy: req.user._id,
            userRole: req.user.role,
            itemType,
            project,
            task,
            details
        });
    } catch (error) {
        console.error("Error creating audit log:", error);
    }
};

// Retrieve scoped audit logs
export const getAuditLogs = async (req, res) => {
    try {
        const { role, _id } = req.user;
        let query = {};

        if (role !== "admin") {
            if (role === "TL") {
                // Team Leads can see their own logs, or logs in projects they manage
                const managedProjects = await Project.find({ teamLead: _id, isDeleted: false }).select("_id");
                const projectIds = managedProjects.map(p => p._id);
                
                query = {
                    $or: [
                        { deletedBy: _id },
                        { project: { $in: projectIds } }
                    ]
                };
            } else {
                // Employees and QA can only see their own logs
                query = { deletedBy: _id };
            }
        }

        const logs = await AuditLog.find(query)
            .populate("deletedBy", "name role profilePic")
            .populate("project", "projectName")
            .populate("task", "taskName")
            .sort({ timestamp: -1 })
            .limit(50);

        return res.status(200).json({
            success: true,
            logs
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch audit logs"
        });
    }
};
