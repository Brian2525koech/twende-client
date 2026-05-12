// src/lib/api/axios.ts
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('twende_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle expired/invalid TOKEN errors globally
// NOTE: Auth routes (/auth/login, /auth/register) are excluded because a 401
// from those endpoints means wrong credentials, not an expired session.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl: string = error.config?.url || '';
    const isAuthRoute =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthRoute) {
      const message: string =
        error.response?.data?.message?.toLowerCase() || '';

      // Only treat as token error when the message is specific to tokens/sessions.
      // "invalid" alone is NOT used here because the backend also returns
      // "Invalid email or password" for bad credentials — matching that word
      // would incorrectly trigger a session-expired toast on the login page.
      const isTokenError =
        message.includes('expired') ||
        message.includes('invalid token') ||
        message.includes('jwt') ||
        message.includes('unauthorised') ||
        message.includes('unauthorized') ||
        message.includes('token');

      if (isTokenError) {
        const isLoggingOut = sessionStorage.getItem('isLoggingOut');
        if (!isLoggingOut) {
          sessionStorage.setItem('isLoggingOut', 'true');

          toast.error('Your session has expired. Please log in again.', {
            duration: 5000,
            icon: '🔑',
          });

          localStorage.removeItem('twende_token');
          localStorage.removeItem('twende_user');
          localStorage.removeItem('twende_avatar');

          setTimeout(() => {
            window.location.href = '/login';
            sessionStorage.removeItem('isLoggingOut');
          }, 800);
        }
      }
    }

    // Always reject so individual pages can still handle errors themselves
    return Promise.reject(error);
  }
);

export default api;