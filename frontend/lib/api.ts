import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('clipforge_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handler — redirect to login
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (!path.startsWith('/login') && !path.startsWith('/register') && path !== '/') {
          localStorage.removeItem('clipforge_token');
          localStorage.removeItem('clipforge_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Namespaced API client ────────────────────────────────────────────────────

export const api = {
  // Raw axios (for custom calls)
  raw: axiosInstance,

  // Auth
  auth: {
    login: (data: { email: string; password: string }) =>
      axiosInstance.post('/api/auth/login', data),
    register: (data: { email: string; password: string; name?: string; full_name?: string }) =>
      axiosInstance.post('/api/auth/register', {
        name: data.name || data.full_name || 'Creator',
        email: data.email,
        password: data.password,
      }),
    getMe: () => axiosInstance.get('/api/auth/me'),
    logout: () => axiosInstance.post('/api/auth/logout'),
    forgotPassword: (email: string) =>
      axiosInstance.post('/api/auth/forgot-password', { email }),
    resetPassword: (token: string, new_password: string) =>
      axiosInstance.post('/api/auth/reset-password', { token, new_password }),
  },

  // Projects
  projects: {
    list: (params?: any) => axiosInstance.get('/api/projects', { params }),
    create: (data: { project_name: string }) =>
      axiosInstance.post('/api/projects', data),
    createFromYouTube: (data: { youtube_url: string; project_name?: string; clip_settings?: any }) =>
      axiosInstance.post('/api/projects/from-youtube', data),
    get: (id: string) => axiosInstance.get(`/api/projects/${id}`),
    delete: (id: string) => axiosInstance.delete(`/api/projects/${id}`),
    upload: (
      id: string,
      formData: FormData,
      onProgress?: (p: number) => void
    ) =>
      axiosInstance.post(`/api/projects/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total && onProgress) {
            onProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      }),
    process: (id: string, settings: any) =>
      axiosInstance.post(`/api/projects/${id}/process`, settings),
    getStatus: (id: string) => axiosInstance.get(`/api/projects/${id}/status`),
    getClips: (id: string) => axiosInstance.get(`/api/projects/${id}/clips`),
    generateMore: (id: string, count: number = 5) =>
      axiosInstance.post(`/api/projects/${id}/generate-more?count=${count}`),
    openFolder: (id: string) =>
      axiosInstance.post(`/api/projects/${id}/open-folder`),
    exportAll: (id: string) =>
      axiosInstance.post(`/api/projects/${id}/export-all`),
    downloadZip: (projectId: string) =>
      axiosInstance.post(
        `/api/downloads/projects/${projectId}/zip`,
        {},
        { responseType: 'blob' }
      ),
  },

  // Clips
  clips: {
    list: (projectIdOrParams?: string | any, params?: any) => {
      if (typeof projectIdOrParams === 'string') {
        return axiosInstance.get(`/api/projects/${projectIdOrParams}/clips`, { params });
      }
      return axiosInstance.get('/api/clips', { params: projectIdOrParams });
    },
    get: (id: string) => axiosInstance.get(`/api/clips/${id}`),
    update: (id: string, data: any) => axiosInstance.put(`/api/clips/${id}`, data),
    delete: (id: string) => axiosInstance.delete(`/api/clips/${id}`),
    render: (id: string) => axiosInstance.post(`/api/clips/${id}/render`),
    download: (id: string) =>
      axiosInstance.get(`/api/clips/${id}/download`, { responseType: 'blob' }),
    stream: (id: string) => `/api/clips/${id}/stream`,
  },

  // Downloads
  downloads: {
    zip: (projectId: string) =>
      axiosInstance.post(
        `/api/downloads/projects/${projectId}/zip`,
        {},
        { responseType: 'blob' }
      ),
  },

  // Usage
  usage: {
    get: () => axiosInstance.get('/api/usage'),
  },

  // Settings (user-level)
  settings: {
    get: () => axiosInstance.get('/api/settings'),
    update: (data: any) => axiosInstance.put('/api/settings', data),
    updateProfile: (data: { full_name?: string }) =>
      axiosInstance.put('/api/settings/profile', data),
    changePassword: (data: {
      current_password: string;
      new_password: string;
    }) => axiosInstance.post('/api/settings/change-password', data),
  },

  // Admin
  admin: {
    stats: () => axiosInstance.get('/api/admin/stats'),
    users: (params?: any) => axiosInstance.get('/api/admin/users', { params }),
    suspendUser: (userId: string) =>
      axiosInstance.put(`/api/admin/users/${userId}/suspend`),
    activateUser: (userId: string) =>
      axiosInstance.put(`/api/admin/users/${userId}/activate`),
    deleteUser: (userId: string) =>
      axiosInstance.delete(`/api/admin/users/${userId}`),
    failedJobs: () => axiosInstance.get('/api/admin/jobs/failed'),
    adminSettings: () => axiosInstance.get('/api/admin/settings'),
    updateAdminSettings: (data: any) =>
      axiosInstance.put('/api/admin/settings', data),
  },
};

// Legacy named exports for any older import patterns
export const authApi = api.auth;
export const projectsApi = api.projects;
export const clipsApi = api.clips;
export const usageApi = api.usage;
export const settingsApi = api.settings;
export const adminApi = api.admin;

export default axiosInstance;
