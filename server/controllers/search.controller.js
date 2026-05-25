import User from "../models/user.schema.js";
import Project from "../models/project.schema.js";
import { Task } from "../models/task.schema.js";

/**
 * Global Search Controller
 * 
 * Implements hierarchy-based access control:
 * - Admin: Full global access to all users, projects, tasks
 * - TL: Own team members, own projects, own team's tasks
 * - Developer: Assigned projects, assigned tasks, related users
 * - QA: Assigned projects, assigned/QA-review tasks, related users
 */
export const globalSearch = async (req, res) => {
    try {
        const { query } = req.query;
        const { role, _id } = req.user;

        if (!query || query.trim().length < 2) {
            return res.status(200).json({
                success: true,
                results: { users: [], projects: [], tasks: [] }
            });
        }

        // Escape special regex characters to prevent ReDoS
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedQuery, "i");

        // ─── USERS SEARCH ────────────────────────────────────────────
        let userResults = [];

        if (role === "admin") {
            // Admin: search all active users
            userResults = await User.find({
                isActive: true,
                $or: [
                    { name: regex },
                    { email: regex },
                    { department: regex }
                ]
            })
            .select("name email role department profilePic status createdAt")
            .limit(10)
            .lean();

        } else if (role === "TL") {
            // TL: search only their own team members (users who have this TL in teamLeads)
            userResults = await User.find({
                isActive: true,
                teamLeads: _id,
                $or: [
                    { name: regex },
                    { email: regex },
                    { department: regex }
                ]
            })
            .select("name email role department profilePic status createdAt")
            .limit(10)
            .lean();

        } else if (role !== "admin" && role !== "TL") {
            // Dev/QA: find projects they belong to, then find users in those projects
            const myProjects = await Project.find({
                isDeleted: false,
                teamMembers: _id
            }).select("teamLead teamMembers").lean();

            const relatedUserIds = new Set();
            relatedUserIds.add(_id.toString()); // include self

            for (const proj of myProjects) {
                if (proj.teamLead) relatedUserIds.add(proj.teamLead.toString());
                for (const memberId of proj.teamMembers || []) {
                    relatedUserIds.add(memberId.toString());
                }
            }

            // Also include their team leads
            const currentUser = await User.findById(_id).select("teamLeads").lean();
            if (currentUser?.teamLeads) {
                for (const tlId of currentUser.teamLeads) {
                    relatedUserIds.add(tlId.toString());
                }
            }

            const relatedIdsArray = [...relatedUserIds];

            userResults = await User.find({
                isActive: true,
                _id: { $in: relatedIdsArray },
                $or: [
                    { name: regex },
                    { email: regex },
                    { department: regex }
                ]
            })
            .select("name email role department profilePic status createdAt")
            .limit(10)
            .lean();
        }

        // ─── PROJECTS SEARCH ─────────────────────────────────────────
        let projectQuery = { isDeleted: false };

        if (role === "TL") {
            projectQuery.teamLead = _id;
        } else if (role !== "admin") {
            projectQuery.teamMembers = _id;
        }
        // Admin: no additional filter

        const projectResults = await Project.find({
            ...projectQuery,
            $or: [
                { projectName: regex },
                { description: regex },
                { clientName: regex }
            ]
        })
        .select("projectName description status priority clientName startDate endDate teamLead teamMembers")
        .populate("teamLead", "name email profilePic")
        .limit(8)
        .lean();

        // ─── TASKS SEARCH ────────────────────────────────────────────
        let taskFilter = { isDeleted: false };

        if (role === "admin") {
            // Admin: all tasks
        } else if (role === "TL") {
            // TL: tasks belonging to projects they lead
            const ledProjects = await Project.find({
                teamLead: _id,
                isDeleted: false
            }).select("_id").lean();
            const ledProjectIds = ledProjects.map(p => p._id);
            taskFilter.project = { $in: ledProjectIds };

        } else if (role === "qa") {
            // QA: tasks assigned to them as QA, OR in QA Review status in their projects
            const qaProjects = await Project.find({
                teamMembers: _id,
                isDeleted: false
            }).select("_id").lean();
            const qaProjectIds = qaProjects.map(p => p._id);

            taskFilter.$or = [
                { assignedQA: _id },
                { project: { $in: qaProjectIds } }
            ];

        } else if (role !== "admin" && role !== "TL") {
            // Employee: tasks assigned to them OR in their projects
            const devProjects = await Project.find({
                teamMembers: _id,
                isDeleted: false
            }).select("_id").lean();
            const devProjectIds = devProjects.map(p => p._id);

            taskFilter.$or = [
                { assignedTo: _id },
                { project: { $in: devProjectIds } }
            ];
        }

        const taskResults = await Task.find({
            ...taskFilter,
            ...(taskFilter.$or ? {} : {}),
            $and: [
                // Preserve existing role-based $or from taskFilter if present
                ...(taskFilter.$or ? [{ $or: taskFilter.$or }] : []),
                // Apply text search
                {
                    $or: [
                        { taskName: regex },
                        { description: regex }
                    ]
                }
            ]
        })
        .select("taskName description status priority project assignedTo assignedQA startDate endDate")
        .populate("project", "projectName")
        .populate("assignedTo", "name email profilePic")
        .populate("assignedQA", "name email profilePic")
        .limit(8)
        .lean();

        // Clean up the taskFilter.$or to avoid sending it in the top-level query
        // (already handled via $and above)

        return res.status(200).json({
            success: true,
            results: {
                users: userResults,
                projects: projectResults,
                tasks: taskResults
            }
        });

    } catch (error) {
        console.error("[GLOBAL SEARCH ERROR]:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Search failed"
        });
    }
};
