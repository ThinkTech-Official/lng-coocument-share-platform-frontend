import { useState, useEffect } from 'react';
import { useNavigate, useBlocker, Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, UserPlus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { createContractor } from '../../api/contractors';
import { getDepartments } from '../../api/departments';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:           z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email:          z.string().min(1, 'Email is required').email('Enter a valid email address'),
  department_ids: z.array(z.string()).min(1, 'Please select at least one department'),
});

type CreateForm = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateContractorPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Create Contractor — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // ─── Departments query ──────────────────────────────────────────────────────

  const { data: departments, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn:  getDepartments,
  });

  // ─── Form ───────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isDirty },
  } = useForm<CreateForm>({
    resolver:      zodResolver(schema),
    defaultValues: { name: '', email: '', department_ids: [] },
    mode:          'onSubmit',
  });

  const selectedIds = (useWatch({ control, name: 'department_ids' }) as string[]) ?? [];

  // ─── Unsaved changes blocker ────────────────────────────────────────────────

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !submitted && currentLocation.pathname !== nextLocation.pathname
  );

  // ─── Mutation ───────────────────────────────────────────────────────────────

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateForm) =>
      createContractor({ name: data.name, email: data.email, department_ids: data.department_ids }),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setSubmitted(true);
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Create Contractor"
        subtitle="Add a new contractor account"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/contractors')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Contractors
          </Button>
        }
      />

      {/* Form card */}
      <div className="max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        {/* Card heading */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-lng-grey">Contractor Details</h2>
        </div>

        <form onSubmit={handleSubmit((data) => mutate(data))} noValidate className="space-y-5">

          {/* Full Name */}
          <Input
            label="Full Name"
            type="text"
            placeholder="Enter full name"
            disabled={isPending}
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Email + helper text */}
          <div className="flex flex-col gap-1">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter email address"
              disabled={isPending}
              error={errors.email?.message}
              {...register('email')}
            />
            {!errors.email && (
              <div className="mt-1 flex items-start gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0 text-lng-blue" />
                <p className="text-xs text-lng-grey leading-relaxed">
                  A temporary password will be automatically generated and sent to this email
                  address. The contractor will be prompted to reset their password on first login.
                </p>
              </div>
            )}
          </div>

          {/* Departments */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lng-grey">Departments</label>

            {/* Loading */}
            {deptsLoading && (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <span className="text-sm text-gray-400">Loading departments…</span>
              </div>
            )}

            {/* No departments exist */}
            {!deptsLoading && departments?.length === 0 && (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-sm text-lng-grey">
                  No departments available. Please create a department first.
                </p>
                <Link
                  to="/admin/departments"
                  className="inline-flex items-center gap-1 text-xs font-medium text-lng-blue hover:underline"
                >
                  Go to Departments
                  <ArrowRight size={12} />
                </Link>
              </div>
            )}

            {/* Checkbox list */}
            {!deptsLoading && departments && departments.length > 0 && (
              <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
                {departments.map((dept) => {
                  const checked = selectedIds.includes(dept.id);
                  return (
                    <label
                      key={dept.id}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                        checked ? 'bg-lng-blue-20' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={dept.id}
                        disabled={isPending}
                        className="h-4 w-4 rounded border-gray-300 accent-lng-blue"
                        {...register('department_ids')}
                      />
                      <span className="text-sm text-lng-grey">{dept.name}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Validation error */}
            {errors.department_ids && (
              <p className="text-xs text-lng-red">{errors.department_ids.message}</p>
            )}
          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => navigate('/admin/contractors')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              disabled={isPending}
            >
              <UserPlus size={14} />
              Create Contractor
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
