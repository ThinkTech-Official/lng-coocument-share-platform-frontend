import apiClient from './axios';
import { type Video, type DepartmentAccess, type ListParams } from '../types';

interface VideoStreamResponse {
  stream_url: string;
}

export const getVideos = (params?: ListParams) =>
  apiClient.get<Video[]>('/videos', { params }).then((r) => r.data);

export const getVideo = (id: string) =>
  apiClient.get<Video>(`/videos/${id}`).then((r) => r.data);

export const getVideoStream = (id: string) =>
  apiClient.get<VideoStreamResponse>(`/videos/${id}/stream`).then((r) => r.data);

export const uploadVideo = (formData: FormData) =>
  apiClient
    .post<Video>('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

export const updateVideo = (
  id: string,
  data: Partial<{ title: string; description: string; category_id: string }>
) =>
  apiClient.patch<Video>(`/videos/${id}`, data).then((r) => r.data);

export const updateVideoStatus = (id: string, is_live: boolean) =>
  apiClient.patch<Video>(`/videos/${id}/status`, { is_live }).then((r) => r.data);

export const updateVideoDepartments = (id: string, data: { department_access: DepartmentAccess }) =>
  apiClient.patch<Video>(`/videos/${id}/departments`, data).then((r) => r.data);

export const deleteVideo = (id: string) =>
  apiClient.delete(`/videos/${id}`).then((r) => r.data);
