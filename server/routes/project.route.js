import express from "express";
import {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    restoreProject,
    getTrashProjects
} from "../controllers/project.controller.js";
import { isAdmin, isTeamLead, protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", protectRoute, isAdmin, isTeamLead, createProject);
router.get("/", protectRoute, getAllProjects);
router.get("/trash", protectRoute, isAdmin, getTrashProjects); // Must be placed before /:id to prevent matching as an ID
router.get("/:id", protectRoute, getProjectById);
router.put("/:id", protectRoute, isAdmin, isTeamLead, updateProject);
router.delete("/:id", protectRoute, isAdmin, deleteProject);
router.put("/restore/:id", protectRoute, isAdmin, restoreProject);

export default router;
