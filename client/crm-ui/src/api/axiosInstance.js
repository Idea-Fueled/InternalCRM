import axios from 'axios';

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:8000/api',
    withCredentials: true, // This is crucial for sending cookies (like your JWT token) to the backend
    headers: {
        'Content-Type': 'application/json',
    },
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
            if (error.response.status === 401) {
                console.error("Unauthorized access! Token may be missing or expired.");
            }

            if (error.response.status === 403) {
                console.error("Access Denied! You do not have the required role.");
            }
        } else if (error.request) {
            console.error("Network error! Server might be down or not reachable.");
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error setting up request:", error.message);
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
