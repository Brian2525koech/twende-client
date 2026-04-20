// src/lib/authFetch.ts
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL;

let isLoggingOut = false;

export const authFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('twende_token') || '';

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);

    // ── Handle Token Expiration / Invalid Token ──
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));

      const errorMsg = data.message?.toLowerCase() || '';

      if (errorMsg.includes('invalid') || 
          errorMsg.includes('expired') || 
          errorMsg.includes('unauthorised')) {

        if (!isLoggingOut) {
          isLoggingOut = true;

          toast.error("Your session has expired. Please log in again.", {
            duration: 5000,
            icon: '🔑',
          });

          // Clear everything
          localStorage.removeItem('twende_token');
          localStorage.removeItem('twende_user');
          localStorage.removeItem('twende_avatar');

          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login';
            isLoggingOut = false;
          }, 1000);
        }

        throw new Error('Token expired');
      }
    }

    return res;
  } catch (err: any) {
    if (err.message !== 'Token expired') {
      console.error(`authFetch error on ${endpoint}:`, err);
    }
    throw err;
  }
};