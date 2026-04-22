import apiClient from './axios';
import { type Category } from '../types';

export const getCategories = () =>
  apiClient.get<Category[]>('/categories').then((r) => r.data);

export const getCategoriesPublic = () =>
  apiClient.get<Category[]>('/categories/public').then((r) => r.data);

export const getCategory = (id: string) =>
  apiClient.get<Category>(`/categories/${id}`).then((r) => r.data);

export const createCategory = (data: {
  name: string;
  parent_category_id?: string | null;
  sort_order?: number;
}) =>
  apiClient.post<Category>('/categories', data).then((r) => r.data);

export const updateCategory = (
  id: string,
  data: Partial<{ name: string; parent_category_id: string | null; sort_order: number }>
) =>
  apiClient.patch<Category>(`/categories/${id}`, data).then((r) => r.data);

export const deleteCategory = (id: string) =>
  apiClient.delete(`/categories/${id}`).then((r) => r.data);
