import jwt from "jsonwebtoken";
import User from "../models/user.schema.js";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized - No token found!"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found!"
            })
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid token!"
        })
    }
}

export const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Access denied - Admin only"
        })
    }

    next();
}

export const isTeamLead = (req, res, next) => {
    if (req.user.role !== "TL") {
        return res.status(403).json({
            message: "Access denied - Team Lead only"
        })
    }

    next();
}

export const isDeveloper = (req, res, next) => {
    if (req.user.role !== "developer") {
        return res.status(403).json({
            message: "Access denied - Developer only"
        })
    }

    next();
}

export const isQA = (req, res, next) => {
    if (req.user.role !== "qa") {
        return res.status(403).json({
            message: "Access denied - QA only"
        })
    }

    next();
}