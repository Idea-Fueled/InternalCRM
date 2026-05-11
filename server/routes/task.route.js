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
import { isAdmin, isDeveloper, isTeamLead, isQA, protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Create Task
router.post("/create", protectRoute, isAdmin, isTeamLead, createTask);
router.get("/trash", protectRoute, isAdmin, getDeletedTasks);
router.get("/project/:projectId", protectRoute, getTasksByProject);
router.get("/user/:userId", protectRoute, getTasksByUser);
router.get("/", protectRoute, getAllTasks);
router.get("/:id", protectRoute, getSingleTask);
router.put("/:id/status", protectRoute, isAdmin, isTeamLead, isDeveloper, isQA, updateTaskStatus);
router.put("/:id", protectRoute, isAdmin, isTeamLead, isDeveloper, isQA, updateTask);
router.put("/:id/restore", protectRoute, isAdmin, restoreTask);
router.delete("/:id", protectRoute, isAdmin, deleteTask);

export default router;