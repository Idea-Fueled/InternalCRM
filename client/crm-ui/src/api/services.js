import axiosInstance from './axiosInstance';

// Dashboard Services
export const dashboardService = {
    getAdminDashboard: () => axiosInstance.get('/dashboard/admin'),
    getTeamLeadDashboard: () => axiosInstance.get('/dashboard/teamlead'),
    getDeveloperDashboard: () => axiosInstance.get('/dashboard/developer'),
    getQADashboard: () => axiosInstance.get('/dashboard/qa'),
};

// Project Services
export const projectService = {
    getAllProjects: () => axiosInstance.get('/projects'),
    getProjectById: (id) => axiosInstance.get(`/projects/${id}`),
    createProject: (data) => axiosInstance.post('/projects/create', data),
    updateProject: (id, data) => axiosInstance.put(`/projects/${id}`, data),
    deleteProject: (id) => axiosInstance.delete(`/projects/${id}`),
};

// Task Services
export const taskService = {
    getAllTasks: () => axiosInstance.get('/tasks'),
    getTasksByProject: (projectId) => axiosInstance.get(`/tasks/project/${projectId}`),
    getTasksByUser: (userId) => axiosInstance.get(`/tasks/user/${userId}`),
    createTask: (data) => axiosInstance.post('/tasks/create', data),
    updateTaskStatus: (id, status) => axiosInstance.put(`/tasks/${id}/status`, { status }),
    updateTask: (id, data) => axiosInstance.put(`/tasks/${id}`, data),
    deleteTask: (id) => axiosInstance.delete(`/tasks/${id}`),
    getDeletedTasks: () => axiosInstance.get('/tasks/trash'),
    restoreTask: (id) => axiosInstance.put(`/tasks/${id}/restore`),
};

// User Services
export const userService = {
    getAllUsers: () => axiosInstance.get('/users/all'),
    updateUser: (id, data) => axiosInstance.put(`/users/update/${id}`, data),
    deleteUser: (id) => axiosInstance.delete(`/users/delete/${id}`),
    restoreUser: (id) => axiosInstance.put(`/users/restore/${id}`),
};

// Auth Services
export const authService = {
    login: (data) => axiosInstance.post('/users/login', data),
    register: (data) => axiosInstance.post('/users/register', data),
    logout: () => axiosInstance.post('/users/logout'),
};
