// src/lib/api/authApi.ts
import api from './axios';

export const login = async (credentials: { email: string; password: string }) => {
  const res = await api.post('/auth/login', credentials);
  return res.data; // { message, token, user }
};

export const register = async (data: any) => {
  const res = await api.post('/auth/register', data);
  return res.data; // { message, token, user }
};