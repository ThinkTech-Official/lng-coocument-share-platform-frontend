import apiClient from './axios';
import { type Document, type DocumentState, type DepartmentAccess, type ListParams } from '../types';

export const getDocuments = (params?: ListParams) =>
  apiClient.get<Document[]>('/documents', { params }).then((r) => r.data);

export const getDocument = (id: string) =>
  apiClient.get<Document>(`/documents/${id}`).then((r) => r.data);

export const uploadDocument = (formData: FormData) =>
  apiClient
    .post<Document>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

export const updateDocument = (
  id: string,
  data: Partial<{ title: string; description: string; category_id: string }>
) =>
  apiClient.patch<Document>(`/documents/${id}`, data).then((r) => r.data);

export const reuploadDocument = (id: string, formData: FormData) =>
  apiClient
    .patch<Document>(`/documents/${id}/reupload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

export const updateDocumentStatus = (id: string, state: DocumentState) =>
  apiClient.patch<Document>(`/documents/${id}/status`, { state }).then((r) => r.data);

export const updateDocumentDepartments = (
  id: string,
  data: {
    access_type: DepartmentAccess;
    department_ids?: string[];
  }
) =>
  apiClient.patch<Document>(`/documents/${id}/departments`, data).then((r) => r.data);

export const deleteDocument = (id: string) =>
  apiClient.delete(`/documents/${id}`).then((r) => r.data);
