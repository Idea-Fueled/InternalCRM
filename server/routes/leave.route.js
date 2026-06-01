import express from "express";
import { 
    applyLeave, 
    updateLeaveStatus, 
    getScopedLeaves, 
    adjustBalances, 
    getHRStats 
} from "../controllers/leave.controller.js";
import { protectRoute, isHR } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get scoped leaves (Employees see own, Admins & HR see all)
router.get("/", protectRoute, getScopedLeaves);

// Apply for a leave
router.post("/apply", protectRoute, applyLeave);

// Adjust numerical leave balances (HR & Admin only)
router.patch("/adjust-balance", protectRoute, isHR, adjustBalances);

// Get HR dashboard metrics & graphs (HR & Admin only)
router.get("/hr-stats", protectRoute, isHR, getHRStats);

// Update status of a pending leave request (HR & Admin only)
router.patch("/:id/status", protectRoute, isHR, updateLeaveStatus);

export default router;
