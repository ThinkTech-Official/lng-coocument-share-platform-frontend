import apiClient from './axios';
import { type Contractor, type PaginatedResponse } from '../types';

export const getContractors = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  department_id?: string;
}) =>
  apiClient
    .get<PaginatedResponse<Contractor>>('/contractors', { params })
    .then((r) => r.data);

export const getContractor = (id: string) =>
  apiClient.get<Contractor>(`/contractors/${id}`).then((r) => r.data);

export const createContractor = (data: { name: string; email: string; department_ids?: string[] }) =>
  apiClient.post<Contractor>('/contractors', data).then((r) => r.data);

export const updateContractor = (id: string, data: Partial<{ name: string; email: string }>) =>
  apiClient.patch<Contractor>(`/contractors/${id}`, data).then((r) => r.data);

export const updateContractorStatus = (id: string, is_active: boolean) =>
  apiClient.patch<Contractor>(`/contractors/${id}/status`, { is_active }).then((r) => r.data);

export const updateContractorDepartments = (id: string, department_ids: string[]) =>
  apiClient.patch<Contractor>(`/contractors/${id}/departments`, { department_ids }).then((r) => r.data);

export const deleteContractor = (id: string) =>
  apiClient.delete(`/contractors/${id}`).then((r) => r.data);
