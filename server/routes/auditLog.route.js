import express from "express";
import { getAuditLogs } from "../controllers/auditLog.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getAuditLogs);

export default router;
