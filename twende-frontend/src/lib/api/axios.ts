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

// Response interceptor - handle 401 (expired/invalid token) globally
api.interceptors.response.use(
  (response) => response,                    // Pass through successful responses
  (error) => {
    if (error.response?.status === 401) {
      const message = error.response?.data?.message?.toLowerCase() || '';

      // Check for expired or invalid token messages
      if (
        message.includes('invalid') ||
        message.includes('expired') ||
        message.includes('unauthorised') ||
        message.includes('unauthorized')
      ) {
        // Prevent multiple logout toasts
        const isLoggingOut = sessionStorage.getItem('isLoggingOut');
        if (!isLoggingOut) {
          sessionStorage.setItem('isLoggingOut', 'true');

          toast.error("Your session has expired. Please log in again.", {
            duration: 5000,
            icon: '🔑',
          });

          // Clear all auth data
          localStorage.removeItem('twende_token');
          localStorage.removeItem('twende_user');
          localStorage.removeItem('twende_avatar');

          // Redirect to login
          setTimeout(() => {
            window.location.href = '/login';
            sessionStorage.removeItem('isLoggingOut');
          }, 800);
        }
      }
    }

    // Always reject so individual components can still catch errors if needed
    return Promise.reject(error);
  }
);

export default api;