import apiClient from './axios';
import { type User } from '../types';

export const login = (email: string, password: string) =>
  apiClient.post<{ user: User }>('/auth/login', { email, password }).then((r) => r.data);

export const forgotPassword = (email: string) =>
  apiClient.post('/auth/forgot-password', { email }).then((r) => r.data);

export const resetPassword = (token: string, new_password: string, confirm_password: string) =>
  apiClient.post('/auth/reset-password', { token, new_password, confirm_password }).then((r) => r.data);

export const logout = () =>
  apiClient.post('/auth/logout').then((r) => r.data);

export const changePassword = (new_password: string, confirm_password: string) =>
  apiClient.patch('/auth/change-password', { new_password, confirm_password }).then((r) => r.data);
