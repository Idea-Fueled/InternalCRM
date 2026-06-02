import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../api/services";
import axiosInstance from "../api/axiosInstance";

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
                localStorage.removeItem("token");
            }
        } catch (err) {
            console.log("Authentication check failed:", err.response?.status || "Network error");
            setUser(null);
            localStorage.removeItem("token");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        const interceptor = axiosInstance.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    console.log("Global 401 unauthorized detected, resetting user state...");
                    setUser(null);
                    localStorage.removeItem("token");
                }
                return Promise.reject(error);
            }
        );
        return () => {
            axiosInstance.interceptors.response.eject(interceptor);
        };
    }, []);

    const login = async (formData) => {
        try {
            const res = await authService.login(formData);
            if (res.data?.token) {
                localStorage.setItem("token", res.data.token);
            }
            if (res.data?.user) {
                setUser(res.data.user);
            }
            return res;
        } catch (error) {
            setUser(null);
            localStorage.removeItem("token");
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
            localStorage.removeItem("token");
        }
    };

    const updateUserProfile = (updatedData) => {
        setUser(prev => prev ? { ...prev, ...updatedData } : null);
    };

    const value = React.useMemo(() => ({
        user, 
        loading, 
        login, 
        logout, 
        checkAuth,
        updateUserProfile,
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
