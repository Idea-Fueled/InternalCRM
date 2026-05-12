import express from "express";
import {
    createTask,
    getAllTasks,
    getSingleTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    restoreTask,
    getDeletedTasks,
    getTasksByProject,
    getTasksByUser
} from "../controllers/task.controller.js";
import { isAdmin, isAdminOrTL, protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Create Task — Admin and TL can create tasks
router.post("/create", protectRoute, isAdminOrTL, createTask);
router.get("/trash", protectRoute, isAdmin, getDeletedTasks);
router.get("/project/:projectId", protectRoute, getTasksByProject);
router.get("/user/:userId", protectRoute, getTasksByUser);
router.get("/", protectRoute, getAllTasks);
router.get("/:id", protectRoute, getSingleTask);
// Update status — any authenticated user can update status (developer, QA, TL, admin)
router.put("/:id/status", protectRoute, updateTaskStatus);
// Update task — any authenticated user can update a task
router.put("/:id", protectRoute, updateTask);
router.put("/:id/restore", protectRoute, isAdmin, restoreTask);
router.delete("/:id", protectRoute, isAdmin, deleteTask);

export default router;