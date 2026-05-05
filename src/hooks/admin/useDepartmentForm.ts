import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getDepartment, createDepartment, updateDepartment } from '../../api/departments';
import { departmentSchema } from '../../constants/schemas';
import { type DepartmentFormValues } from '../../constants/types';

export function useDepartmentForm(id?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  useEffect(() => {
    document.title = isEdit
      ? 'Edit Department — LNG Canada'
      : 'Create Department — LNG Canada';
    return () => {
      document.title = 'LNG Canada';
    };
  }, [isEdit]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const {
    data: department,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['department', id],
    queryFn: () => getDepartment(id!),
    enabled: isEdit,
  });

  // ─── Form ─────────────────────────────────────────────────────────────────

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', description: '' },
    mode: 'onSubmit',
  });

  const { reset, control, setError, handleSubmit } = form;

  // Pre-fill form when edit data arrives
  useEffect(() => {
    if (department) {
      reset({ name: department.name, description: department.description ?? '' });
    }
  }, [department, reset]);

  // Character count for description
  const descValue = useWatch({ control, name: 'description' }) ?? '';
  const charCount = descValue.length;
  const charWarning = charCount > 450;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: DepartmentFormValues) =>
      createDepartment({ name: data.name, description: data.description ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created successfully');
      navigate('/admin/departments');
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('name', { message: 'A department with this name already exists.' });
      } else {
        toast.error('Failed to create department. Please try again.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: DepartmentFormValues) =>
      updateDepartment(id!, { name: data.name, description: data.description ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department', id] });
      toast.success('Department updated successfully');
      navigate('/admin/departments');
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('name', { message: 'A department with this name already exists.' });
      } else {
        toast.error('Failed to update department. Please try again.');
      }
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;
  const isPending = mutation.isPending;

  const onSubmit = handleSubmit((data: DepartmentFormValues) => {
    mutation.mutate(data);
  });

  return {
    isEdit,
    department,
    isLoading,
    isError,
    form,
    charCount,
    charWarning,
    isPending,
    onSubmit,
    navigate,
  };
}
