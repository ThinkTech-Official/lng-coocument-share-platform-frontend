import apiClient from './axios';
import {
  type Notification,
  type NotificationCategory,
  type PaginatedResponse,
} from '../types';

export const getNotifications = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) =>
  apiClient
    .get<PaginatedResponse<Notification>>('/notifications', { params })
    .then((r) => r.data);

export const createNotification = (data: {
  title: string;
  content: string;
  category: NotificationCategory;
}) =>
  apiClient
    .post<Notification>('/notifications', data)
    .then((r) => r.data);

export const deleteNotification = (id: string) =>
  apiClient
    .delete<{ message: string }>(`/notifications/${id}`)
    .then((r) => r.data);

export const uploadNotificationImage = async (
  file: File,
): Promise<{ url: string }> => {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await apiClient.post<{ url: string }>(
    '/notifications/upload-image',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
};
