import Leave from "../models/leave.schema.js";
import User from "../models/user.schema.js";
import { Notification } from "../models/notification.schema.js";

// Helper to create notifications
const sendNotification = async ({ recipient, sender, title, message, category, link }) => {
    try {
        const notif = new Notification({
            recipient,
            sender,
            title,
            message,
            type: "system",
            category,
            link
        });
        await notif.save();
    } catch (err) {
        console.error("Failed to save leave notification:", err.message);
    }
};

// 1. Apply Leave
export const applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid date format!" });
        }

        if (start > end) {
            return res.status(400).json({ success: false, message: "Start date cannot be after end date!" });
        }

        // Calculate total days (inclusive)
        const timeDiff = end.getTime() - start.getTime();
        const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

        if (totalDays <= 0) {
            return res.status(400).json({ success: false, message: "Leave duration must be at least 1 day!" });
        }

        const employee = await User.findById(req.user._id);

        // Check numerical balance constraints for limited types
        if (leaveType !== "Unpaid Leave") {
            let balance = 0;
            if (leaveType === "Casual Leave") balance = employee.casualLeaveBalance || 0;
            else if (leaveType === "Sick Leave") balance = employee.sickLeaveBalance || 0;
            else if (leaveType === "Earned Leave") balance = employee.earnedLeaveBalance || 0;

            if (totalDays > balance) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient leave balance! You requested ${totalDays} days, but your current ${leaveType} balance is ${balance} days.` 
                });
            }
        }

        const leave = new Leave({
            employee: req.user._id,
            leaveType,
            startDate: start,
            endDate: end,
            totalDays,
            reason,
            status: "Pending"
        });

        await leave.save();

        // Dispatch notifications to reporting managers, HR, and Admin
        const recipientsSet = new Set();

        // Add reporting managers
        if (employee.reportingManagers && employee.reportingManagers.length > 0) {
            employee.reportingManagers.forEach(mgr => recipientsSet.add(String(mgr._id || mgr)));
        }
        if (employee.reportingManager) {
            recipientsSet.add(String(employee.reportingManager));
        }

        // Find Admin and HR users
        const adminAndHR = await User.find({ role: { $in: ["admin", "hr"] } });
        adminAndHR.forEach(user => recipientsSet.add(String(user._id)));

        // Remove self from recipients if present
        recipientsSet.delete(String(req.user._id));

        for (const recipientId of recipientsSet) {
            await sendNotification({
                recipient: recipientId,
                sender: req.user._id,
                title: "New Leave Application",
                message: `${req.user.name} applied for ${totalDays} days of ${leaveType} starting ${start.toLocaleDateString()}`,
                category: "creation",
                link: "/hr/leaves"
            });
        }

        return res.status(201).json({
            success: true,
            message: "Leave application submitted successfully!",
            data: leave
        });

    } catch (error) {
        console.error("applyLeave error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Update Leave Status (Approve / Reject)
export const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value!" });
        }

        const leave = await Leave.findById(id).populate("employee");
        if (!leave) {
            return res.status(404).json({ success: false, message: "Leave request not found!" });
        }

        if (leave.status !== "Pending") {
            return res.status(400).json({ success: false, message: "This leave request has already been processed!" });
        }

        const { role, _id } = req.user;
        const leaveApplicant = leave.employee;
        
        let isAuthorized = role === "admin" || role === "hr";
        if (role === "TL") {
            // Check if the applicant is a member of the TL's team
            const applicantIdStr = String(leaveApplicant._id || leaveApplicant);
            // The TL can't approve their own leave request (only admin or hr can)
            if (applicantIdStr !== String(_id)) {
                const teamMember = await User.findOne({
                    _id: leaveApplicant._id,
                    $or: [
                        { reportingManagers: _id },
                        { reportingManager: _id },
                        { teamLeads: _id }
                    ]
                });
                if (teamMember) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: "Unauthorized - Only Admins, HRs, or the applicant's Team Lead can process this leave request." });
        }

        leave.status = status;
        leave.processedBy = _id;
        leave.processedAt = new Date();

        // Deduct balances if approved and limited
        if (status === "Approved" && leave.leaveType !== "Unpaid Leave") {
            const emp = await User.findById(leave.employee._id);
            let balanceField = "";
            if (leave.leaveType === "Casual Leave") balanceField = "casualLeaveBalance";
            else if (leave.leaveType === "Sick Leave") balanceField = "sickLeaveBalance";
            else if (leave.leaveType === "Earned Leave") balanceField = "earnedLeaveBalance";

            if (balanceField && emp) {
                emp[balanceField] = Math.max(0, (emp[balanceField] || 0) - leave.totalDays);
                await emp.save();
            }
        }

        await leave.save();

        // Notify employee of the decision
        await sendNotification({
            recipient: leave.employee._id,
            sender: req.user._id,
            title: `Leave Request ${status}`,
            message: `Your ${leave.totalDays}-day ${leave.leaveType} starting ${new Date(leave.startDate).toLocaleDateString()} has been ${status}.`,
            category: status === "Approved" ? "approval" : "rejection",
            link: "/employee/dashboard"
        });

        return res.status(200).json({
            success: true,
            message: `Leave request successfully ${status.toLowerCase()}!`,
            data: leave
        });

    } catch (error) {
        console.error("updateLeaveStatus error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Scoped Leaves
export const getScopedLeaves = async (req, res) => {
    try {
        const { role, _id } = req.user;
        let query = {};

        if (role === "TL") {
            // Find all team members of this Team Lead
            const teamMembersList = await User.find({
                $or: [
                    { reportingManagers: _id },
                    { reportingManager: _id },
                    { teamLeads: _id }
                ]
            }).select("_id");
            const teamMemberIds = teamMembersList.map(member => member._id);
            query.employee = { $in: [_id, ...teamMemberIds] };
        } else if (role !== "admin" && role !== "hr") {
            query.employee = _id;
        }

        const leaves = await Leave.find(query)
            .populate("employee", "name email department designation profilePic")
            .populate("processedBy", "name designation")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: leaves
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Adjust Balances
export const adjustBalances = async (req, res) => {
    try {
        const { employeeId, casualLeaveBalance, sickLeaveBalance, earnedLeaveBalance } = req.body;
        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee ID is required!" });
        }

        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found!" });
        }

        if (casualLeaveBalance !== undefined) employee.casualLeaveBalance = Number(casualLeaveBalance);
        if (sickLeaveBalance !== undefined) employee.sickLeaveBalance = Number(sickLeaveBalance);
        if (earnedLeaveBalance !== undefined) employee.earnedLeaveBalance = Number(earnedLeaveBalance);

        await employee.save();

        return res.status(200).json({
            success: true,
            message: "Leave balances adjusted successfully!",
            data: {
                casualLeaveBalance: employee.casualLeaveBalance,
                sickLeaveBalance: employee.sickLeaveBalance,
                earnedLeaveBalance: employee.earnedLeaveBalance
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Get HR Dashboard Stats & Analytics Graphs
export const getHRStats = async (req, res) => {
    try {
        // Enforce HR/Admin only
        if (req.user.role !== "hr" && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Forbidden - HR only" });
        }

        const totalEmployees = await User.countDocuments({ isActive: true });
        const activeEmployees = await User.countDocuments({ isActive: true, status: { $ne: "inactive" } });
        const inactiveEmployees = await User.countDocuments({ $or: [{ isActive: false }, { status: "inactive" }] });
        const pendingLeaveRequests = await Leave.countDocuments({ status: "Pending" });

        // Employees currently on active approved leaves
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const activeLeaves = await Leave.find({
            status: "Approved",
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });
        const employeesOnLeave = activeLeaves.length;

        // New Joinees (created in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newJoinees = await User.countDocuments({ isActive: true, createdAt: { $gte: thirtyDaysAgo } });

        // Graph 1: Department-wise Employee Distribution
        const deptDistribution = await User.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $project: { department: { $ifNull: ["$_id", "Unassigned"] }, count: 1, _id: 0 } },
            { $sort: { count: -1 } }
        ]);

        // Graph 2: Leave Distribution (by type)
        const leaveDistribution = await Leave.aggregate([
            { $group: { _id: "$leaveType", count: { $sum: 1 } } },
            { $project: { type: "$_id", count: 1, _id: 0 } }
        ]);

        // Graph 3: Monthly Growth (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0,0,0,0);

        const monthlyGrowthRaw = await User.aggregate([
            { $match: { isActive: true, createdAt: { $gte: sixMonthsAgo } } },
            { 
                $group: { 
                    _id: { 
                        year: { $year: "$createdAt" }, 
                        month: { $month: "$createdAt" } 
                    }, 
                    count: { $sum: 1 } 
                } 
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthlyGrowth = monthlyGrowthRaw.map(item => {
            const date = new Date(item._id.year, item._id.month - 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            return { month: `${monthName} ${item._id.year}`, count: item.count };
        });

        // Recent activity feed
        // We will query users and leaves created recently
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("name role designation status inactiveReason createdAt");
        
        const recentLeaves = await Leave.find()
            .populate("employee", "name designation")
            .sort({ createdAt: -1 })
            .limit(5);

        const activities = [];

        recentUsers.forEach(u => {
            activities.push({
                type: "user",
                action: u.status === "inactive" ? "Employee Marked Inactive" : "New Employee Created",
                detail: `${u.name} (${u.designation || u.role})`,
                timestamp: u.createdAt,
                reason: u.inactiveReason || ""
            });
        });

        recentLeaves.forEach(l => {
            let action = "Leave Applied";
            if (l.status === "Approved") action = "Leave Approved";
            if (l.status === "Rejected") action = "Leave Rejected";
            activities.push({
                type: "leave",
                action,
                detail: `${l.employee?.name || "Employee"} - ${l.totalDays} days of ${l.leaveType}`,
                timestamp: l.updatedAt || l.createdAt
            });
        });

        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recentActivity = activities.slice(0, 10);

        return res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalEmployees,
                    activeEmployees,
                    inactiveEmployees,
                    employeesOnLeave,
                    pendingLeaveRequests,
                    newJoinees
                },
                graphs: {
                    deptDistribution,
                    leaveDistribution,
                    monthlyGrowth
                },
                recentActivity
            }
        });

    } catch (error) {
        console.error("getHRStats error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
