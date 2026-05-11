import express from "express";
import {
    getAdminDashboard,
    getTeamLeadDashboard,
    getDeveloperDashboard,
    getQADashboard
} from "../controllers/dashboard.controller.js";
import { protectRoute, isAdmin, isTeamLead, isDeveloper, isQA } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/admin", protectRoute, isAdmin, getAdminDashboard);
router.get("/teamlead", protectRoute, isTeamLead, getTeamLeadDashboard);
router.get("/developer", protectRoute, isDeveloper, getDeveloperDashboard);
router.get("/qa", protectRoute, isQA, getQADashboard);

export default router;
