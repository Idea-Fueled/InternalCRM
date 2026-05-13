import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { 
    getMyNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications 
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/my", protectRoute, getMyNotifications);
router.put("/read/:id", protectRoute, markAsRead);
router.put("/read-all", protectRoute, markAllAsRead);
router.delete("/delete/:id", protectRoute, deleteNotification);
router.delete("/clear-all", protectRoute, clearAllNotifications);

export default router;
