import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../api/services";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await authService.checkAuth();
            setUser(res.data.user);
        } catch (err) {
            setUser(null);
            // Don't show error toast for background auth check
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (formData) => {
        try {
            const res = await authService.login(formData);
            await checkAuth(); 
            return res;
        } catch (error) {
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
            window.location.href = "/"; // Force redirect on logout
        }
    };

    const value = React.useMemo(() => ({
        user, loading, login, logout, checkAuth
    }), [user, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
