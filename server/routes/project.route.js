import express from "express";
import {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    restoreProject,
    getTrashProjects,
    hardDeleteProject
} from "../controllers/project.controller.js";
import { isAdmin, protectRoute } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { uploadAttachment } from "../config/cloudinary.js";

const router = express.Router();

router.post("/create",     protectRoute, checkPermission("projects.create"), uploadAttachment.single("attachment"), createProject);
router.get("/",            protectRoute, getAllProjects);
router.get("/trash",       protectRoute, checkPermission("trash.view"), getTrashProjects);
router.get("/:id",         protectRoute, getProjectById);
router.put("/:id",         protectRoute, checkPermission("projects.update"), uploadAttachment.single("attachment"), updateProject);
router.delete("/:id",      protectRoute, checkPermission("projects.delete"), deleteProject);
router.delete("/hard/:id", protectRoute, isAdmin, hardDeleteProject);
router.put("/restore/:id", protectRoute, checkPermission("projects.delete"), restoreProject);

export default router;
