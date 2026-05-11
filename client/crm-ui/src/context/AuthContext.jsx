import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../api/services";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            setLoading(true);
            console.log("Checking authentication...");
            const res = await authService.checkAuth();
            if (res.data?.user) {
                console.log("Authenticated as:", res.data.user.role);
                setUser(res.data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.log("Authentication check failed:", err.response?.status || "Network error");
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (formData) => {
        try {
            const res = await authService.login(formData);
            // After successful login, wait for checkAuth to populate user state
            await checkAuth(); 
            return res;
        } catch (error) {
            setUser(null);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            setUser(null);
            // No forced redirect here, App.jsx or ProtectedRoute will handle it
        }
    };

    const value = React.useMemo(() => ({
        user, 
        loading, 
        login, 
        logout, 
        checkAuth,
        isAuthenticated: !!user
    }), [user, loading, checkAuth]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
