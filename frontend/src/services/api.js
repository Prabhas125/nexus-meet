/**
 * API Service Layer
 * Centralizes all HTTP requests to the backend
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Attach JWT ────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response Interceptor: Handle 401 ──────────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || { error: 'Network error' });
  }
);

// ─── Auth API ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Meeting API ─────────────────────────────────────────────────────────────────
export const meetingAPI = {
  create: (data) => api.post('/meetings', data),
  getByCode: (roomCode) => api.get(`/meetings/${roomCode}`),
  join: (roomCode) => api.post(`/meetings/${roomCode}/join`),
  leave: (roomCode) => api.post(`/meetings/${roomCode}/leave`),
  list: () => api.get('/meetings'),
};

// ─── Message API ─────────────────────────────────────────────────────────────────
export const messageAPI = {
  getMessages: (meetingId) => api.get(`/messages/${meetingId}`),
};

// ─── File API ────────────────────────────────────────────────────────────────────
export const fileAPI = {
  upload: (meetingId, formData) =>
    api.post(`/files/upload/${meetingId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getFiles: (meetingId) => api.get(`/files/${meetingId}`),
};

export default api;
