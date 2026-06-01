import jwt from "jsonwebtoken";
import User from "../models/user.schema.js";

export const getUserRoleCategory = (user) => {
    if (!user) return 'employee';
    if (user.role === 'admin' || (user.designation && user.designation.toLowerCase() === 'admin')) {
        return 'admin';
    }
    const designation = (user.designation || user.role || '').toLowerCase();
    if (/\bhr\b/.test(designation) || designation.includes('human resources')) {
        return 'hr';
    }
    if (designation.includes('qa')) {
        return 'qa';
    }
    if (designation.includes('team lead') || designation.includes('lead') || designation === 'tl' || user.role === 'TL' || user.role === 'teamLead') {
        return 'TL';
    }
    return 'employee';
};

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            console.log("No token found in cookies");
            return res.status(401).json({
                message: "Unauthorized - No token found!"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(`Token verified for user ID: ${decoded.id}`);

        const user = await User.findById(decoded.id).select("-password").populate("reportingManagers", "name designation role");

        if (!user) {
            console.log(`User not found in DB for ID: ${decoded.id}`);
            return res.status(401).json({
                message: "User no longer exists!"
            })
        }

        // Auto-reactivation check
        if (user.status === "inactive" && user.inactiveUntil && new Date() > new Date(user.inactiveUntil)) {
            user.status = "free";
            user.inactiveUntil = null;
            user.inactiveReason = "";
            await user.save();
        }

        if (user.status === "inactive") {
            return res.status(403).json({
                message: "Your account is currently marked as inactive. Please contact your administrator for access.",
                isInactive: true
            });
        }

        // Dynamically resolve and override role category for hierarchy/scoping
        const resolvedRole = getUserRoleCategory(user);
        user.designation = user.designation || user.role;
        user.role = resolvedRole;

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message);
        return res.status(401).json({
            message: "Invalid or expired token!"
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

// Allows EITHER admin OR Team Lead — use this instead of chaining isAdmin + isTeamLead
export const isAdminOrTL = (req, res, next) => {
    if (req.user.role !== "admin" && req.user.role !== "TL") {
        return res.status(403).json({
            message: "Access denied - Admin or Team Lead only"
        })
    }
    next();
}

export const isHR = (req, res, next) => {
    if (req.user.role !== "hr" && req.user.role !== "admin") {
        return res.status(403).json({
            message: "Access denied - HR or Admin only"
        })
    }
    next();
}

export const isEmployee = (req, res, next) => {
    if (["admin", "TL", "qa"].includes(req.user.role)) {
        return res.status(403).json({
            message: "Access denied - Employee only"
        })
    }

    next();
}

export const isDeveloper = (req, res, next) => {
    // Treat any custom employee role as developer for legacy checks
    if (req.user.role !== "developer" && ["admin", "TL", "qa"].includes(req.user.role)) {
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