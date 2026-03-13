import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 15000,
});

// Request interceptor — always attach stored JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('safechat_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('safechat_token');
      localStorage.removeItem('safechat_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── AUTH ────────────────────────────────────────────────
export const loginApi = (username, password) =>
  api.post('/api/auth/login/', { username, password });

export const registerApi = (data) =>
  api.post('/api/auth/register/', data);

export const getMyProfile = () =>
  api.get('/api/auth/profile/');

// ── POSTS ──────────────────────────────────────────────
export const fetchFeed = (page = 1) =>
  api.get(`/api/posts/?page=${page}`);

export const fetchPost = (id) =>
  api.get(`/api/posts/${id}/`);

export const createPost = (content) =>
  api.post('/api/posts/', { content });

export const likePost = (id) =>
  api.post(`/api/posts/${id}/like/`);

export const sharePost = (id) =>
  api.post(`/api/posts/${id}/share/`);

export const deletePost = (id) =>
  api.delete(`/api/posts/${id}/`);

// ── COMMENTS ───────────────────────────────────────────
export const fetchComments = (postId) =>
  api.get(`/api/posts/${postId}/comments/`);

export const createComment = (postId, content, parentId = null) =>
  api.post(`/api/posts/${postId}/comments/`, { content, parent_id: parentId });

export const likeComment = (id) =>
  api.post(`/api/comments/${id}/like/`);

export const deleteComment = (id) =>
  api.delete(`/api/comments/${id}/`);

// ── USERS ───────────────────────────────────────────────
export const fetchProfile = (username) =>
  api.get(`/api/users/${username}/`);

export const fetchUserPosts = (username) =>
  api.get(`/api/users/${username}/posts/`);

export const followUser = (username) =>
  api.post(`/api/users/${username}/follow/`);

export const updateProfile = (data) =>
  api.patch('/api/auth/profile/', data);

// ── ADMIN ───────────────────────────────────────────────
export const fetchModerationLog = (page = 1, status = 'all') =>
  api.get(`/api/admin/moderation/?page=${page}&status=${status}`);

export const overrideModeration = (logId, action) =>
  api.post(`/api/admin/moderation/${logId}/override/`, { action });

export const banUser = (userId, reason) =>
  api.post(`/api/admin/users/${userId}/ban/`, { reason });

export const unbanUser = (userId) =>
  api.post(`/api/admin/users/${userId}/unban/`);

export const fetchAdminStats = () =>
  api.get('/api/admin/stats/');

export const fetchTopUsers = () =>
  api.get('/api/admin/top-offenders/');

// ── NOTIFICATIONS ────────────────────────────────────────
export const fetchNotifications = (page = 1) =>
  api.get(`/api/notifications/?page=${page}`);

export const fetchUnreadCount = () =>
  api.get('/api/notifications/unread/');

export const markAllRead = () =>
  api.post('/api/notifications/read-all/');

export const markNotifRead = (id) =>
  api.post(`/api/notifications/${id}/read/`);

export default api;
