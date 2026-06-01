import express from "express";
import {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    restoreProject,
    getTrashProjects,
    hardDeleteProject,
    addProjectNote,
    uploadProjectAttachments,
    updateProjectMembers,
    deleteProjectNote,
    deleteProjectAttachment
} from "../controllers/project.controller.js";
import { isAdmin, protectRoute } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { uploadAttachment } from "../config/cloudinary.js";

const router = express.Router();

router.post("/create",     protectRoute, checkPermission("projects.create"), uploadAttachment.array("attachments", 10), createProject);
router.get("/",            protectRoute, getAllProjects);
router.get("/trash",       protectRoute, checkPermission("trash.view"), getTrashProjects);
router.get("/:id",         protectRoute, getProjectById);
router.put("/:id",         protectRoute, checkPermission("projects.update"), uploadAttachment.array("attachments", 10), updateProject);
router.delete("/:id",      protectRoute, checkPermission("projects.delete"), deleteProject);
router.delete("/hard/:id", protectRoute, isAdmin, hardDeleteProject);
router.put("/restore/:id", protectRoute, checkPermission("projects.delete"), restoreProject);

// SaaS addition sub-routes
router.post("/:id/notes",        protectRoute, addProjectNote);
router.delete("/:id/notes/:noteId", protectRoute, deleteProjectNote);
router.post("/:id/attachments",  protectRoute, uploadAttachment.array("attachments", 10), uploadProjectAttachments);
router.delete("/:id/attachments/:attachmentId", protectRoute, deleteProjectAttachment);
router.put("/:id/members",      protectRoute, updateProjectMembers);

export default router;
