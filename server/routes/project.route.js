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
import { isAdmin, isAdminOrTL, protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", protectRoute, isAdminOrTL, createProject);
router.get("/", protectRoute, getAllProjects);
router.get("/trash", protectRoute, isAdmin, getTrashProjects);
router.get("/:id", protectRoute, getProjectById);
router.put("/:id", protectRoute, isAdminOrTL, updateProject);
router.delete("/:id", protectRoute, isAdmin, deleteProject);
router.put("/restore/:id", protectRoute, isAdmin, restoreProject);

export default router;
