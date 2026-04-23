import { useState, useEffect } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDepartment, createDepartment, updateDepartment } from '../../api/departments';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
});

type FormValues = z.infer<typeof schema>;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FormSkeleton() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">{bar('h-6 w-48')}{bar('h-4 w-36')}</div>
        {bar('h-9 w-44 rounded')}
      </div>
      <div className="max-w-2xl rounded-lg bg-white p-8 shadow-sm space-y-5">
        {bar('h-4 w-32 mb-2')}
        <div className="border-b border-gray-200 pb-1" />
        {bar('h-10 w-full')}
        {bar('h-28 w-full')}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
          {bar('h-9 w-20 rounded')}{bar('h-9 w-36 rounded')}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepartmentFormPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const isEdit      = !!id;

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = isEdit
      ? 'Edit Department — LNG Canada'
      : 'Create Department — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, [isEdit]);

  // ─── Edit: fetch existing department ──────────────────────────────────────────

  const { data: department, isLoading, isError } = useQuery({
    queryKey: ['department', id],
    queryFn:  () => getDepartment(id!),
    enabled:  isEdit,
  });

  // ─── Form ─────────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: { name: '', description: '' },
    mode:          'onSubmit',
  });

  // Pre-fill form when edit data arrives
  useEffect(() => {
    if (department) {
      reset({ name: department.name, description: department.description ?? '' });
    }
  }, [department, reset]);

  // Character count for description
  const descValue = useWatch({ control, name: 'description' }) ?? '';
  const charCount  = descValue.length;
  const charWarning = charCount > 450;

  // ─── Unsaved changes blocker ──────────────────────────────────────────────────

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !submitted && currentLocation.pathname !== nextLocation.pathname
  );

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      createDepartment({ name: data.name, description: data.description ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setSubmitted(true);
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
    mutationFn: (data: FormValues) =>
      updateDepartment(id!, { name: data.name, description: data.description ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department', id] });
      setSubmitted(true);
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

  const mutation   = isEdit ? updateMutation : createMutation;
  const isPending  = mutation.isPending;

  function onSubmit(data: FormValues) {
    mutation.mutate(data);
  }

  // ─── Loading skeleton (edit mode) ────────────────────────────────────────────

  if (isEdit && isLoading) return <FormSkeleton />;

  // ─── Error state (edit mode) ──────────────────────────────────────────────────

  if (isEdit && (isError || !department)) {
    return (
      <>
        <PageHeader
          title="Edit Department"
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/departments')}>
              <ArrowLeft size={14} />
              Back to Departments
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle size={40} className="text-lng-red" />
          <h2 className="text-base font-semibold text-lng-grey">Department Not Found</h2>
          <p className="text-sm text-gray-500">This department could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate('/admin/departments')}>
            <ArrowLeft size={14} />
            Back to Departments
          </Button>
        </div>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const title    = isEdit ? 'Edit Department' : 'Create Department';
  const subtitle = isEdit ? (department?.name ?? '') : 'Add a new department';

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/departments')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Departments
          </Button>
        }
      />

      {/* Form card */}
      <div className="max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        {/* Card heading */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-lng-grey">
            {isEdit ? 'Edit Details' : 'Department Details'}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* Department Name */}
          <Input
            label="Department Name"
            type="text"
            placeholder="Enter department name"
            disabled={isPending}
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-lng-grey" htmlFor="description">
              Description
              <span className="ml-1 font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Enter a brief description of this department (optional)"
              disabled={isPending}
              className={`
                w-full resize-y rounded border px-3 py-2 text-sm text-lng-grey
                placeholder:text-gray-400
                border-gray-300 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                disabled:bg-gray-50 disabled:text-gray-400
                ${errors.description ? 'border-lng-red focus:border-lng-red focus:ring-lng-red' : ''}
              `}
              {...register('description')}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="text-xs text-lng-red">{errors.description.message}</p>
              ) : (
                <span />
              )}
              <p className={`text-xs ${charWarning ? 'text-lng-red' : 'text-lng-grey'}`}>
                {charCount} / 500 characters
              </p>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => navigate('/admin/departments')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              disabled={isPending || (isEdit && !isDirty)}
            >
              {isEdit ? <Save size={14} /> : <Plus size={14} />}
              {isEdit ? 'Save Changes' : 'Create Department'}
            </Button>
          </div>
        </form>
      </div>

      {/* Unsaved changes dialog */}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Discard Changes"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>Keep Editing</Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>Discard</Button>
          </>
        }
      >
        <p className="text-sm text-lng-grey">
          You have unsaved changes. Are you sure you want to leave?
        </p>
      </Modal>
    </>
  );
}
