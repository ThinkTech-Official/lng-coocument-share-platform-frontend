import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getContractor,
  createContractor,
  updateContractor,
  updateContractorStatus,
  updateContractorDepartments,
  deleteContractor,
} from '../../api/contractors';
import { getDepartments } from '../../api/departments';
import { contractorCreateSchema, contractorEditSchema } from '../../constants/schemas';
import { type ContractorCreateValues, type ContractorEditValues } from '../../constants/types';

function sameSet(a: string[], b: string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

export function useContractorForm(id?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  useEffect(() => {
    document.title = isEdit
      ? 'Edit Contractor — LNG Canada'
      : 'Create Contractor — LNG Canada';
    return () => {
      document.title = 'LNG Canada';
    };
  }, [isEdit]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const {
    data: contractor,
    isLoading: contractorLoading,
    isError: contractorError,
  } = useQuery({
    queryKey: ['contractor', id],
    queryFn: () => getContractor(id!),
    enabled: isEdit,
  });

  const { data: departments, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  // ─── Form ─────────────────────────────────────────────────────────────────

  const createForm = useForm<ContractorCreateValues>({
    resolver: zodResolver(contractorCreateSchema),
    defaultValues: { name: '', email: '', department_ids: [] },
    mode: 'onSubmit',
  });

  const editForm = useForm<ContractorEditValues>({
    resolver: zodResolver(contractorEditSchema),
    defaultValues: { name: '', email: '' },
    mode: 'onSubmit',
  });

  const form = (isEdit ? editForm : createForm) as any;
  const { reset, control, setError } = form;

  useEffect(() => {
    if (isEdit && contractor) {
      editForm.reset({ name: contractor.name, email: contractor.email });
    }
  }, [isEdit, contractor, editForm]);

  // ─── Department selection state ───────────────────────────────────────────

  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [deptError, setDeptError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && contractor) {
      setSelectedDeptIds(contractor.departments.map((d) => d.id));
    }
  }, [isEdit, contractor]);

  const deptsChanged = contractor
    ? !sameSet(selectedDeptIds, contractor.departments.map((d) => d.id))
    : false;

  function toggleDept(deptId: string) {
    setDeptError(null);
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((x) => x !== deptId) : [...prev, deptId]
    );
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (vals: ContractorCreateValues) => createContractor(vals),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success(
        `Contractor account created. A temporary password has been sent to ${variables.email}.`
      );
      navigate('/admin/contractors');
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('email', { message: 'An account with this email already exists.' });
      } else {
        toast.error('Failed to create contractor. Please try again.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vals: ContractorEditValues) => updateContractor(id!, vals),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor', id] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor details updated');
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('email', { message: 'An account with this email already exists.' });
      } else {
        toast.error('Failed to update. Please try again.');
      }
    },
  });

  const deptMutation = useMutation({
    mutationFn: (ids: string[]) => updateContractorDepartments(id!, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor', id] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Department access updated');
    },
    onError: () => toast.error('Failed to update departments. Please try again.'),
  });

  const statusMutation = useMutation({
    mutationFn: (is_active: boolean) => updateContractorStatus(id!, is_active),
    onSuccess: (_, is_active) => {
      queryClient.invalidateQueries({ queryKey: ['contractor', id] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success(`Contractor ${is_active ? 'activated' : 'deactivated'} successfully`);
    },
    onError: () => toast.error('Something went wrong. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContractor(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor account deleted');
      navigate('/admin/contractors');
    },
    onError: () => toast.error('Failed to delete. Please try again.'),
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deptMutation.isPending ||
    statusMutation.isPending ||
    deleteMutation.isPending;

  const onSubmit = form.handleSubmit((data: any) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  });

  function handleSaveDepts() {
    if (selectedDeptIds.length === 0) {
      setDeptError('At least one department is required');
      return;
    }
    deptMutation.mutate(selectedDeptIds);
  }

  return {
    isEdit,
    contractor,
    contractorLoading,
    contractorError,
    departments,
    deptsLoading,
    form,
    selectedDeptIds,
    setSelectedDeptIds,
    deptError,
    setDeptError,
    toggleDept,
    deptsChanged,
    isPending,
    onSubmit,
    handleSaveDepts,
    statusMutation,
    deleteMutation,
    navigate,
  };
}
