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

export const getNotificationById = async (id: string) => {
  await delay(200); // simulate network latency
  const all = getStoredNotifications();
  return all.find((n) => n.id === id) || null;
};

export const updateNotification = async (
  id: string,
  data: { title: string; content: string; category: NotificationCategory }
) => {
  await delay(400); // simulate network latency
  const all = getStoredNotifications();
  const idx = all.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error('Notification not found');
  all[idx] = { ...all[idx], ...data };
  saveNotifications(all);
  return all[idx];
};

