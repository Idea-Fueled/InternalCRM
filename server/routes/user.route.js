import express from "express";
import {
    getCurrentUser,
    deleteUser,
    getAllUsers,
    getUserById,
    loginController,
    registerUser,
    restoreUser,
    updateUser,
    updateProfilePic,
    hardDeleteUser
} from "../controllers/user.controller.js";
import { protectRoute, isAdmin, isAdminOrTL } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// --- Public routes ---
router.post("/register", upload.single('profilePic'), registerUser);
router.post("/login", loginController);

// --- Auth routes ---
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });
    res.status(200).json({ message: "Logged out successfully" });
});

// CRITICAL: /me must be declared before /:_id
router.get("/me", protectRoute, getCurrentUser);
router.put("/me/profile-pic", protectRoute, upload.single('profilePic'), updateProfilePic);

// --- Protected routes ---
router.get("/all",           protectRoute, isAdminOrTL, getAllUsers);
router.get("/:_id",          protectRoute, getUserById);
router.put("/update/:_id",   protectRoute, checkPermission("users.update"), upload.single('profilePic'), updateUser);
router.delete("/delete/:_id",protectRoute, checkPermission("users.delete"), deleteUser);
router.delete("/hard/:_id",  protectRoute, isAdmin, hardDeleteUser);
router.put("/restore/:_id",  protectRoute, isAdmin, restoreUser);

export default router;