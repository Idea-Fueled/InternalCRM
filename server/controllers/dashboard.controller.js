import User from "../models/user.schema.js";
import Project from "../models/project.schema.js";
import { Task } from "../models/task.schema.js";

// Admin Dashboard
export const getAdminDashboard = async (req, res) => {
    try {
        const currentDate = new Date();

        const [
            totalEmployees,
            totalProjects,
            totalTasks,
            qaReviewTasks,
            overdueTasks
        ] = await Promise.all([
            User.countDocuments({ isActive: true }),
            Project.countDocuments({ isDeleted: false }),
            Task.countDocuments({ isDeleted: false }),
            Task.countDocuments({ status: "QA Review", isDeleted: false }),
            Task.countDocuments({ endDate: { $lt: currentDate }, status: { $nin: ["Completed", "Done"] }, isDeleted: false })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                totalProjects,
                totalTasks,
                qaReviewTasks,
                overdueTasks
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
};

// Team Lead Dashboard
export const getTeamLeadDashboard = async (req, res) => {
    try {
        const teamLeadId = req.user._id;
        const currentDate = new Date();

        // Active projects under this team lead (case-insensitive status check)
        const activeProjectsCount = await Project.countDocuments({ 
            teamLead: teamLeadId, 
            status: { $regex: /^active$/i }, 
            isDeleted: false 
        });

        // Find all projects led by this team lead to get tasks belonging to them
        const tlProjects = await Project.find({ teamLead: teamLeadId, isDeleted: false }).select('_id');
        const projectIds = tlProjects.map(p => p._id);

        const [
            totalTeamTasks,
            qaReviewTasks,
            overdueTasks
        ] = await Promise.all([
            Task.countDocuments({ project: { $in: projectIds }, isDeleted: false }),
            Task.countDocuments({ project: { $in: projectIds }, status: "QA Review", isDeleted: false }),
            Task.countDocuments({ project: { $in: projectIds }, endDate: { $lt: currentDate }, status: { $nin: ["Completed", "Done"] }, isDeleted: false })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalTeamTasks,
                activeProjects: activeProjectsCount,
                qaReviewTasks,
                overdueTasks
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
};

// Employee Dashboard
export const getEmployeeDashboard = async (req, res) => {
    try {
        const employeeId = req.user._id;
        const currentDate = new Date();

        const [
            totalAssignedTasks,
            inProgressTasks,
            qaReviewTasks,
            completedTasks,
            pendingTasks,
            overdueTasks
        ] = await Promise.all([
            Task.countDocuments({ assignedTo: employeeId, isDeleted: false }),
            Task.countDocuments({ assignedTo: employeeId, status: "In Progress", isDeleted: false }),
            Task.countDocuments({ assignedTo: employeeId, status: "QA Review", isDeleted: false }),
            Task.countDocuments({ assignedTo: employeeId, status: { $in: ["Completed", "Done"] }, isDeleted: false }),
            Task.countDocuments({ assignedTo: employeeId, status: { $in: ["New", "Pending", "Todo", "To Do"] }, isDeleted: false }),
            Task.countDocuments({ assignedTo: employeeId, endDate: { $lt: currentDate }, status: { $nin: ["Completed", "Done"] }, isDeleted: false })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalAssignedTasks,
                inProgressTasks,
                qaReviewTasks,
                completedTasks,
                pendingTasks,
                overdueTasks
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
};

// QA Dashboard
export const getQADashboard = async (req, res) => {
    try {
        const [
            pendingReviewTasks,
            completedTasks,
            doneTasks
        ] = await Promise.all([
            Task.countDocuments({ status: "QA Review", isDeleted: false }),
            Task.countDocuments({ status: "Completed", isDeleted: false }),
            Task.countDocuments({ status: "Done", isDeleted: false })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                pendingReviewTasks,
                completedTasks,
                doneTasks
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
};
