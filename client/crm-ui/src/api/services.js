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
    hardDeleteProject: (id) => axiosInstance.delete(`/projects/hard/${id}`),
    getTrashProjects: () => axiosInstance.get('/projects/trash'),
    restoreProject: (id) => axiosInstance.put(`/projects/restore/${id}`),
};

// Task Services
export const taskService = {
    getAllTasks: () => axiosInstance.get('/tasks'),
    getTasksByProject: (projectId) => axiosInstance.get(`/tasks/project/${projectId}`),
    getTasksByUser: (userId) => axiosInstance.get(`/tasks/user/${userId}`),
    createTask: (data) => axiosInstance.post('/tasks/create', data),
    uploadAttachment: (formData) => axiosInstance.post('/tasks/upload-attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateTaskStatus: (id, status, notes = "", attachments = [], screenshotLinks = []) =>
        axiosInstance.put(`/tasks/${id}/status`, { status, notes, attachments, screenshotLinks }),
    updateTask: (id, data) => axiosInstance.put(`/tasks/${id}`, data),
    deleteTask: (id) => axiosInstance.delete(`/tasks/${id}`),
    hardDeleteTask: (id) => axiosInstance.delete(`/tasks/hard/${id}`),
    getDeletedTasks: () => axiosInstance.get('/tasks/trash'),
    restoreTask: (id) => axiosInstance.put(`/tasks/${id}/restore`),
};

// User Services
export const userService = {
    getAllUsers: (params = {}) => axiosInstance.get('/users/all', { params }),
    updateUser: (id, data) => axiosInstance.put(`/users/update/${id}`, data),
    deleteUser: (id) => axiosInstance.delete(`/users/delete/${id}`),
    hardDeleteUser: (id) => axiosInstance.delete(`/users/hard/${id}`),
    restoreUser: (id) => axiosInstance.put(`/users/restore/${id}`),
};

// Notification Services
export const notificationService = {
    getMyNotifications: () => axiosInstance.get('/notifications/my'),
    markAsRead: (id) => axiosInstance.put(`/notifications/read/${id}`),
    markAllAsRead: () => axiosInstance.put('/notifications/read-all'),
    deleteNotification: (id) => axiosInstance.delete(`/notifications/delete/${id}`),
    clearAllNotifications: () => axiosInstance.delete('/notifications/clear-all'),
};

// Department Services
export const departmentService = {
    getAllDepartments: () => axiosInstance.get('/departments/all'),
    createDepartment: (data) => axiosInstance.post('/departments/create', data),
    deleteDepartment: (id) => axiosInstance.delete(`/departments/delete/${id}`),
};

// Auth Services
export const authService = {
    login: (data) => axiosInstance.post('/users/login', data),
    register: (data) => axiosInstance.post('/users/register', data),
    logout: () => axiosInstance.post('/users/logout'),
    checkAuth: () => axiosInstance.get('/users/me'),
    updateProfilePic: (formData) => axiosInstance.put('/users/me/profile-pic', formData),
    deleteProfilePic: () => axiosInstance.delete('/users/me/profile-pic'),
    forgotPassword: (email) => axiosInstance.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => axiosInstance.post('/auth/reset-password', { token, password }),
};
