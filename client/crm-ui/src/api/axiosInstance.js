import axios from 'axios';

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:8000',
    withCredentials: true, // This is crucial for sending cookies (like your JWT token) to the backend
    headers: {},
});

// Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            // Map technical backend error messages to readable ones just in case
            if (error.response.data && typeof error.response.data.message === 'string') {
                const message = error.response.data.message;
                const lower = message.toLowerCase();
                if (lower.includes("cast to objectid") || lower.includes("casterror") || lower.includes("failed for value")) {
                    if (lower.includes("assignedqa")) {
                        error.response.data.message = "Please select a valid QA before assigning the task.";
                    } else if (lower.includes("assignedto")) {
                        error.response.data.message = "Please select a valid user before assigning the task.";
                    } else {
                        error.response.data.message = "Please select a valid user before assigning the task.";
                    }
                } else if (lower.includes("validation failed") || lower.includes("validationerror")) {
                    error.response.data.message = "Please fill all required fields correctly.";
                } else if (lower.includes("unauthorized") || lower.includes("jwt") || lower.includes("expired token")) {
                    error.response.data.message = "Your session has expired. Please login again.";
                } else if (lower.includes("inactive")) {
                    // Preserve the custom inactive account message from backend
                } else if (lower.includes("access denied") || lower.includes("forbidden")) {
                    error.response.data.message = "You do not have permission to perform this action.";
                } else if (lower.includes("internal server error") || lower.includes("server error") || lower.includes("500")) {
                    error.response.data.message = "Something went wrong. Please try again.";
                }
            }
        } else if (error.request) {
            console.error("Network error! Server might be down or not reachable.");
            // Set message for network failure to keep UI toasts friendly
            error.message = "Network error! Server might be down or not reachable. Please try again.";
        } else {
            console.error("Error setting up request:", error.message);
            error.message = "Something went wrong. Please try again.";
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
