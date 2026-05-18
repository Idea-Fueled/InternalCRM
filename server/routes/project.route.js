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
import { isAdmin, isAdminOrTL, protectRoute } from "../middlewares/auth.middleware.js";
import { uploadAttachment } from "../config/cloudinary.js";

const router = express.Router();

router.post("/create", protectRoute, isAdmin, uploadAttachment.single("attachment"), createProject);
router.get("/", protectRoute, getAllProjects);
router.get("/trash", protectRoute, isAdmin, getTrashProjects);
router.get("/:id", protectRoute, getProjectById);
router.put("/:id", protectRoute, isAdmin, uploadAttachment.single("attachment"), updateProject);
router.delete("/:id", protectRoute, isAdmin, deleteProject);
router.delete("/hard/:id", protectRoute, isAdmin, hardDeleteProject);
router.put("/restore/:id", protectRoute, isAdmin, restoreProject);

export default router;
