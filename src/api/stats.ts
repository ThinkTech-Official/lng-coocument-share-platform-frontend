import apiClient from './axios';

export interface AdminStats {
  contractors: number;
  departments: number;
  documents: number;
  videos: number;
}

export interface SuperadminStats extends AdminStats {
  admins: number;
}

export const getStats = () =>
  apiClient
    .get<AdminStats | SuperadminStats>('/stats')
    .then((r) => r.data);
