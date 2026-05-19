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
    getTasksByUser,
    hardDeleteTask
} from "../controllers/task.controller.js";
import { isAdmin, protectRoute } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post("/create",            protectRoute, checkPermission("tasks.create"), createTask);
router.get("/trash",              protectRoute, checkPermission("trash.view"), getDeletedTasks);
router.get("/project/:projectId", protectRoute, getTasksByProject);
router.get("/user/:userId",       protectRoute, getTasksByUser);
router.get("/",                   protectRoute, getAllTasks);
router.get("/:id",                protectRoute, getSingleTask);
// Status update — any logged-in user can update their own task status
router.put("/:id/status",         protectRoute, updateTaskStatus);
// Full task edit requires tasks.update permission
router.put("/:id",                protectRoute, checkPermission("tasks.update"), updateTask);
router.put("/:id/restore",        protectRoute, checkPermission("tasks.delete"), restoreTask);
router.delete("/:id",             protectRoute, checkPermission("tasks.delete"), deleteTask);
router.delete("/hard/:id",        protectRoute, isAdmin, hardDeleteTask);

export default router;