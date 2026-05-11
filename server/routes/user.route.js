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
    if (!req.user) {
        return res.status(401).json({ message: "User not found" });
    }
    res.status(200).json({ 
        user: {
            _id: req.user._id,
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            department: req.user.department
        }
    });
});

export default router;