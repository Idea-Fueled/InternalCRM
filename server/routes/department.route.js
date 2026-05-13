import express from "express";
import { protectRoute, isAdmin } from "../middlewares/auth.middleware.js";
import { getAllDepartments, createDepartment, deleteDepartment } from "../controllers/department.controller.js";

const router = express.Router();

router.get("/all", protectRoute, getAllDepartments);
router.post("/create", protectRoute, isAdmin, createDepartment);
router.delete("/delete/:id", protectRoute, isAdmin, deleteDepartment);

export default router;
