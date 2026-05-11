import express from "express";
import { deleteUser, getAllUsers, getUserById, loginController, registerUser, restoreUser, updateUser } from "../controllers/user.controller.js";
import { protectRoute, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginController)
router.get("/all", protectRoute, isAdmin, getAllUsers)
router.get("/:_id", protectRoute, getUserById)
router.put("/update/:_id", protectRoute, isAdmin, updateUser)
router.delete("/delete/:_id", protectRoute, isAdmin, deleteUser)
router.put("/restore/:_id", protectRoute, isAdmin, restoreUser);

router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });
    res.status(200).json({ message: "Logged out successfully" });
});
router.get("/me", protectRoute, (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "User not found" });
        }
        
        // Ensure we send a clean object
        const user = req.user.toObject ? req.user.toObject() : req.user;
        delete user.password;
        
        res.status(200).json({ 
            success: true,
            user: {
                _id: user._id,
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.error("Error in /me route:", error);
        res.status(500).json({ message: "Internal Server Error in /me" });
    }
});

export default router;