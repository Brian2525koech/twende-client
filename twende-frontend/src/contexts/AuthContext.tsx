// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';

const API = import.meta.env.VITE_API_URL;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>; // Added this
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from storage
  useEffect(() => {
    const savedToken = localStorage.getItem('twende_token');
    const savedUser = localStorage.getItem('twende_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('twende_token', newToken);
    localStorage.setItem('twende_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('twende_token');
    localStorage.removeItem('twende_user');
    localStorage.removeItem('twende_avatar'); // Clean up profile cache too
  };

  /**
   * Fetches the latest user profile from the server
   * and syncs it with state and localStorage.
   */
  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API}/auth/me`, { // Adjust endpoint as per your API (e.g., /passenger/me)
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const updatedUser: User = await res.json();
        setUser(updatedUser);
        localStorage.setItem('twende_user', JSON.stringify(updatedUser));
      } else if (res.status === 401) {
        logout(); // Token might be expired
      }
    } catch (error) {
      console.error('Failed to refresh user session:', error);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};