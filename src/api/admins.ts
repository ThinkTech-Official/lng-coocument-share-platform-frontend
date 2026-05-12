import apiClient from './axios';
import { type Admin, type PaginatedResponse } from '../types';

export const getAdmins = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) =>
  apiClient
    .get<PaginatedResponse<Admin>>('/admin', { params })
    .then((r) => r.data);

export const getAdmin = (id: string) =>
  apiClient.get<Admin>(`/admin/${id}`).then((r) => r.data);

export const createAdmin = (data: { name: string; email: string }) =>
  apiClient.post<Admin>('/admin', data).then((r) => r.data);

export const updateAdmin = (id: string, data: Partial<{ name: string; email: string }>) =>
  apiClient.patch<Admin>(`/admin/${id}`, data).then((r) => r.data);

export const updateAdminStatus = (id: string, is_active: boolean) =>
  apiClient.patch<Admin>(`/admin/${id}/status`, { is_active }).then((r) => r.data);

export const deleteAdmin = (id: string) =>
  apiClient.delete(`/admin/${id}`).then((r) => r.data);
