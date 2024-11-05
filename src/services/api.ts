import axios from 'axios';
import { User, Post } from '../types/api';
import { LoginCredentials, RegisterCredentials, AuthResponse } from '../types/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', credentials);
  const { token, user } = response.data;
  localStorage.setItem('token', token);
  return { token, user };
};

export const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', credentials);
  const { token, user } = response.data;
  localStorage.setItem('token', token);
  return { token, user };
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const verifyToken = async (): Promise<boolean> => {
  try {
    await api.get('/auth/verify');
    return true;
  } catch {
    return false;
  }
};

// Game data endpoints
export const saveGameData = async (gameData: any) => {
  await api.post('/user/save-game', gameData);
};

export const loadGameData = async () => {
  const response = await api.get('/user/game-data');
  return response.data;
};

// Other API endpoints
export const fetchUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const fetchPosts = async (): Promise<Post[]> => {
  const response = await api.get('/posts');
  return response.data;
};