// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { authFetch } from '@/lib/authFetch';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // ← must start TRUE

  useEffect(() => {
    const savedToken = localStorage.getItem('twende_token');
    const savedUser  = localStorage.getItem('twende_user');

    if (savedToken && savedUser) {
      try {
        // Both setters + setLoading(false) are batched by React 18 —
        // only ONE re-render fires, so RoleRoute never sees a half-ready state.
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        // Corrupted JSON in storage (can happen after Android force-close).
        // Clear it so the user gets a clean login instead of an infinite splash.
        console.warn('Twende: corrupted auth storage — clearing.');
        localStorage.removeItem('twende_token');
        localStorage.removeItem('twende_user');
        localStorage.removeItem('twende_avatar');
      }
    }

    setLoading(false); // Always runs — auth check is complete either way.
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('twende_token', newToken);
    localStorage.setItem('twende_user', JSON.stringify(newUser));
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('twende_token');
    localStorage.removeItem('twende_user');
    localStorage.removeItem('twende_avatar');
    window.location.href = '/login';
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch('/auth/me');
      if (res.ok) {
        const updatedUser: User = await res.json();
        setUser(updatedUser);
        localStorage.setItem('twende_user', JSON.stringify(updatedUser));
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Failed to refresh user session:', err);
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};