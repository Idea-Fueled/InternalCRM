import { Notification } from "../models/notification.schema.js";

// Get notifications for logged in user
export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            recipient: req.user._id,
            isDeleted: false 
        })
        .populate("sender", "name role")
        .sort({ createdAt: -1 })
        .limit(20);

        return res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            success: true,
            notification
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Soft delete notification
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.user._id },
            { isDeleted: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification deleted"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Clear all notifications (soft delete all)
export const clearAllNotifications = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isDeleted: false },
            { isDeleted: true }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications cleared"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Helper function to create notification (internal use)
export const createNotification = async ({ recipient, sender, title, message, type, category, link }) => {
    try {
        await Notification.create({
            recipient,
            sender,
            title,
            message,
            type,
            category,
            link
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};
