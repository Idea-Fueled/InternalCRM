import express from "express";
import {
    getCurrentUser,
    deleteUser,
    getAllUsers,
    getUserById,
    loginController,
    registerUser,
    restoreUser,
    updateUser
} from "../controllers/user.controller.js";
import { protectRoute, isAdmin, isAdminOrTL } from "../middlewares/auth.middleware.js";

const router = express.Router();

// --- Public routes ---
router.post("/register", registerUser);
router.post("/login", loginController);

// --- Auth routes (must come BEFORE /:_id to prevent Express treating "me" as an _id) ---
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });
    res.status(200).json({ message: "Logged out successfully" });
});

// CRITICAL: /me must be declared before /:_id
// Otherwise Express captures "me" as the _id param, causing findById("me") to fail with 500
router.get("/me", protectRoute, getCurrentUser);

// --- Protected routes ---
router.get("/all", protectRoute, isAdminOrTL, getAllUsers);
router.get("/:_id", protectRoute, getUserById);
router.put("/update/:_id", protectRoute, isAdmin, updateUser);
router.delete("/delete/:_id", protectRoute, isAdmin, deleteUser);
router.put("/restore/:_id", protectRoute, isAdmin, restoreUser);

export default router;