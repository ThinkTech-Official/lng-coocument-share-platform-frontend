import apiClient from './axios';
import { type Log, type LogsPage } from '../types';

export interface LogsParams {
  actor_role?: string;
  action_type?: string;
  date_from?: string;
  date_to?: string;
  cursor?: string;
  limit?: number;
}

export const getLogs = (params?: LogsParams) =>
  apiClient.get<LogsPage>('/logs', { params }).then((r) => r.data);

export const getLog = (id: string) =>
  apiClient.get<Log>(`/logs/${id}`).then((r) => r.data);
