import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { type Document, DocumentState, DepartmentAccess } from '../../types';
import { getCategoriesPublic } from '../../api/categories';
import { flattenCategories } from '../../utils/categoryHelpers';
import { getDepartments } from '../../api/departments';
import { getDocument, updateDocument, updateDocumentStatus, deleteDocument } from '../../api/documents';
import apiClient from '../../api/axios';
import { documentUploadSchema, documentEditSchema } from '../../constants/schemas';
import { type DocumentUploadValues, type DocumentEditValues } from '../../constants/types';

function sameSet(a: string[], b: string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

export function useDocumentForm(id?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  useEffect(() => {
    document.title = isEdit
      ? 'Edit Document LNG Canada'
      : 'Upload Document LNG Canada';
    return () => {
      document.title = 'LNG Canada';
    };
  }, [isEdit]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const {
    data: docData,
    isLoading: docLoading,
    isError: docError,
  } = useQuery({
    queryKey: ['document', id],
    queryFn: () => getDocument(id!),
    enabled: isEdit,
  });

  const { data: allCategories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['categories-public'],
    queryFn: getCategoriesPublic,
  });

  const { data: deptsResponse, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => getDepartments({ limit: 100 }),
  });
  const departments = deptsResponse?.data ?? [];

  const flatCategories = flattenCategories(allCategories);

  // ─── Form ─────────────────────────────────────────────────────────────────

  const uploadForm = useForm<DocumentUploadValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      docType: 'file',
      title: '',
      description: '',
      category_id: '',
      department_access: 'ALL',
      department_ids: [],
      external_url: '',
    },
    mode: 'onSubmit',
  });

  const editForm = useForm<DocumentEditValues>({
    resolver: zodResolver(documentEditSchema),
    defaultValues: { title: '', description: '', category_id: '' },
    mode: 'onSubmit',
  });

  const form = (isEdit ? editForm : uploadForm) as any;
  const { reset } = form;

  useEffect(() => {
    if (isEdit && docData) {
      editForm.reset({
        title: docData.title,
        description: docData.description ?? '',
        category_id: docData.category_id ?? docData.category?.id ?? '',
      });
      const access = (docData.access_type ?? DepartmentAccess.ALL) as DepartmentAccess;
      const ids = (docData.document_departments ?? []).map((dd: any) => dd.department_id);
      setLocalAccess(access);
      setOrigAccess(access);
      setSelectedDeptIds(ids);
      setOrigDeptIds(ids);
    }
  }, [isEdit, docData, editForm]);

  // ─── File handling ────────────────────────────────────────────────────────

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadFileError, setReuploadFileError] = useState<string | null>(null);
  const [reuploadProgress, setReuploadProgress] = useState<number | null>(null);

  // ─── Department Access state (for Edit) ───────────────────────────────────

  const [origAccess, setOrigAccess] = useState<DepartmentAccess>(DepartmentAccess.ALL);
  const [localAccess, setLocalAccess] = useState<DepartmentAccess>(DepartmentAccess.ALL);
  const [origDeptIds, setOrigDeptIds] = useState<string[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  const deptsDirty = localAccess !== origAccess || !sameSet(selectedDeptIds, origDeptIds);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setProgress(0);
      const resp = await apiClient.post<Document>('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total ?? evt.loaded));
          setProgress(pct);
        },
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
      navigate('/admin/documents');
    },
    onError: (error: unknown) => {
      const resp = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
      toast.error(resp?.data?.message ?? 'Upload failed. Please try again.');
      setProgress(null);
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: (vals: DocumentEditValues) => updateDocument(id!, vals),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document details updated');
      reset({
        title: data.title,
        description: data.description ?? '',
        category_id: data.category_id,
      });
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error('A document with this title already exists.');
      } else {
        toast.error('Failed to update. Please try again.');
      }
    },
  });

  const reuploadMutation = useMutation({
    mutationFn: async () => {
      if (!reuploadFile) return;
      setReuploadProgress(0);
      const fd = new FormData();
      fd.append('file', reuploadFile);
      const resp = await apiClient.patch<Document>(`/documents/${id}/reupload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total ?? evt.loaded));
          setReuploadProgress(pct);
        },
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document file updated successfully');
      setReuploadFile(null);
      setReuploadProgress(null);
    },
    onError: () => {
      toast.error('Reupload failed. Please try again.');
      setReuploadProgress(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newState: DocumentState) => updateDocumentStatus(id!, newState),
    onSuccess: (_, newState) => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(newState === DocumentState.PUBLISHED ? 'Document published' : 'Document unpublished');
    },
    onError: () => toast.error('Failed to update status. Please try again.'),
  });

  const deptsMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/documents/${id}/departments`, {
        access_type: localAccess,
        department_ids: localAccess === DepartmentAccess.RESTRICTED ? selectedDeptIds : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Department access updated');
      setOrigAccess(localAccess);
      setOrigDeptIds(localAccess === DepartmentAccess.RESTRICTED ? [...selectedDeptIds] : []);
    },
    onError: () => toast.error('Failed to update access. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
      navigate('/admin/documents');
    },
    onError: () => toast.error('Failed to delete. Please try again.'),
  });

  const onSubmit = form.handleSubmit((data: any) => {
    if (isEdit) {
      updateDetailsMutation.mutate(data);
    } else {
      if (data.docType === 'file' && !file) {
        setFileError('Please select a file to upload.');
        return;
      }
      const fd = new FormData();
      if (data.docType === 'file') {
        fd.append('file', file!);
      } else {
        fd.append('external_url', data.external_url!.trim());
      }
      fd.append('title', data.title);
      if (data.description) fd.append('description', data.description);
      fd.append('category_id', data.category_id);
      fd.append('access_type', data.department_access);
      if (data.department_access === 'RESTRICTED' && data.department_ids) {
        data.department_ids.forEach((did: string) => fd.append('department_ids', did));
      }
      uploadMutation.mutate(fd);
    }
  });

  const isPending =
    uploadMutation.isPending ||
    updateDetailsMutation.isPending ||
    reuploadMutation.isPending ||
    statusMutation.isPending ||
    deptsMutation.isPending ||
    deleteMutation.isPending;

  return {
    isEdit,
    document: docData,
    docLoading,
    docError,
    flatCategories,
    catsLoading,
    departments,
    deptsLoading,
    form,
    file,
    setFile,
    fileError,
    setFileError,
    progress,
    reuploadFile,
    setReuploadFile,
    reuploadFileError,
    setReuploadFileError,
    reuploadProgress,
    localAccess,
    setLocalAccess,
    selectedDeptIds,
    setSelectedDeptIds,
    deptsDirty,
    isPending,
    onSubmit,
    uploadMutation,
    updateDetailsMutation,
    reuploadMutation,
    statusMutation,
    deptsMutation,
    deleteMutation,
    navigate,
  };
}
