import express from "express";
import {
    getAdminDashboard,
    getTeamLeadDashboard,
    getEmployeeDashboard,
    getQADashboard
} from "../controllers/dashboard.controller.js";
import { protectRoute, isAdmin, isTeamLead, isEmployee, isQA } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/admin", protectRoute, isAdmin, getAdminDashboard);
router.get("/teamlead", protectRoute, isTeamLead, getTeamLeadDashboard);
router.get("/employee", protectRoute, isEmployee, getEmployeeDashboard);
router.get("/qa", protectRoute, isQA, getQADashboard);

export default router;
