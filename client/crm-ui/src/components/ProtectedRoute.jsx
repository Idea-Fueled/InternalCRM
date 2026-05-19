import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Admins have bypass access to everything
    if (user.role === 'admin') {
        return children;
    }

    // Check dynamic permission
    if (requiredPermission) {
        const permissions = user.permissions || [];
        const requiredArray = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
        const hasPerm = requiredArray.some(p => permissions.includes(p));
        if (hasPerm) {
            return children;
        }
    }

    // Check role
    if (allowedRoles && allowedRoles.includes(user.role)) {
        return children;
    }

    return <Navigate to="/" replace />;
};

export default ProtectedRoute;
