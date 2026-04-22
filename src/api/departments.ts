import apiClient from './axios';
import { type Department } from '../types';

export const getDepartments = () =>
  apiClient.get<Department[]>('/departments').then((r) => r.data);

export const getDepartment = (id: string) =>
  apiClient.get<Department>(`/departments/${id}`).then((r) => r.data);

export const createDepartment = (data: { name: string; description: string }) =>
  apiClient.post<Department>('/departments', data).then((r) => r.data);

export const updateDepartment = (id: string, data: Partial<{ name: string; description: string }>) =>
  apiClient.patch<Department>(`/departments/${id}`, data).then((r) => r.data);

export const deleteDepartment = (id: string) =>
  apiClient.delete(`/departments/${id}`).then((r) => r.data);
