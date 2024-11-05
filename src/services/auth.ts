import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthResponse } from '../types/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await api.post('/auth/login', credentials);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return { token, user };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

export const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  try {
    const response = await api.post('/auth/register', credentials);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return { token, user };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  delete api.defaults.headers.common['Authorization'];
};