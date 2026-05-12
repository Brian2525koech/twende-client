// src/lib/authFetch.ts
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL;

let isLoggingOut = false;

export const authFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
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

    if (res.status === 401) {
      // Auth endpoints returning 401 mean wrong credentials, not an expired
      // session. Skip the logout flow entirely for those routes.
      const isAuthEndpoint =
        endpoint.includes('/auth/login') ||
        endpoint.includes('/auth/register');

      if (!isAuthEndpoint) {
        // Clone the response before reading the body so the caller can still
        // read it if needed (Response body can only be consumed once).
        const data = await res.clone().json().catch(() => ({}));
        const errorMsg: string = data.message?.toLowerCase() || '';

        // Only trigger the session-expired flow when the message is clearly
        // about the token itself — not about wrong credentials.
        // "invalid" alone is intentionally excluded here because the backend
        // returns "Invalid email or password" for credential failures.
        const isTokenError =
          errorMsg.includes('expired') ||
          errorMsg.includes('invalid token') ||
          errorMsg.includes('jwt') ||
          errorMsg.includes('token') ||
          errorMsg.includes('unauthorised');

        if (isTokenError && !isLoggingOut) {
          isLoggingOut = true;

          toast.error('Your session has expired. Please log in again.', {
            duration: 5000,
            icon: '🔑',
          });

          localStorage.removeItem('twende_token');
          localStorage.removeItem('twende_user');
          localStorage.removeItem('twende_avatar');

          setTimeout(() => {
            window.location.href = '/login';
            isLoggingOut = false;
          }, 1000);

          throw new Error('Token expired');
        }
      }

      // Not a token error (e.g. wrong credentials on login page) — return the
      // response normally so the calling code can read the message itself.
      return res;
    }

    return res;
  } catch (err: any) {
    if (err.message !== 'Token expired') {
      console.error(`authFetch error on ${endpoint}:`, err);
    }
    throw err;
  }
};