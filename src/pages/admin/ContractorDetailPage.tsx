import { useState, useEffect } from 'react';
import { useParams, useNavigate, useBlocker, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, AlertCircle, AlertTriangle,
  UserX, UserCheck, Trash2, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getContractor,
  updateContractor,
  updateContractorStatus,
  updateContractorDepartments,
  deleteContractor,
} from '../../api/contractors';
import { getDepartments } from '../../api/departments';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Schema ───────────────────────────────────────────────────────────────────

const editSchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type EditForm = z.infer<typeof editSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function sameSet(a: string[], b: string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">{bar('h-6 w-48')}{bar('h-4 w-36')}</div>
        {bar('h-9 w-44 rounded')}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-36 mb-2')}<div className="border-b border-gray-200 pb-4" />
            {bar('h-10 w-full')}{bar('h-10 w-full')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-3">
            {bar('h-4 w-40 mb-2')}<div className="border-b border-gray-200 pb-4" />
            {bar('h-10 w-full')}{bar('h-10 w-full')}{bar('h-10 w-full')}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-32 mb-2')}<div className="border-b border-gray-200 pb-4" />
            {bar('h-5 w-16 rounded-full')}{bar('h-4 w-52')}{bar('h-9 w-full rounded')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-24 mb-2')}<div className="border-b border-gray-200 pb-4" />
            {bar('h-4 w-64')}{bar('h-9 w-full rounded')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContractorDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // ─── Contractor query ────────────────────────────────────────────────────────

  const {
    data: contractor,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['contractor', id],
    queryFn:  () => getContractor(id!),
    enabled:  !!id,
  });

  // ─── Departments query ────────────────────────────────────────────────────────

  const { data: departments, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn:  getDepartments,
  });

  // ─── Page title ───────────────────────────────────────────────────────────────

  useEffect(() => {
    document.title = contractor
      ? `${contractor.name} — LNG Canada`
      : 'Contractor Details — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, [contractor]);

  // ─── Edit details form ────────────────────────────────────────────────────────

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditForm>({
    resolver:      zodResolver(editSchema),
    defaultValues: { name: '', email: '' },
    mode:          'onSubmit',
  });

  useEffect(() => {
    if (contractor) {
      reset({ name: contractor.name, email: contractor.email });
    }
  }, [contractor, reset]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !submitted && currentLocation.pathname !== nextLocation.pathname
  );

  // ─── Department selection state ────────────────────────────────────────────────

  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [deptError, setDeptError]             = useState<string | null>(null);

  useEffect(() => {
    if (contractor) {
      setSelectedDeptIds(contractor.departments.map((d) => d.id));
    }
  }, [contractor]);

  const deptsChanged = contractor
    ? !sameSet(selectedDeptIds, contractor.departments.map((d) => d.id))
    : false;

  function toggleDept(deptId: string) {
    setDeptError(null);
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((x) => x !== deptId) : [...prev, deptId]
    );
  }

  // ─── Dialog state ─────────────────────────────────────────────────────────────

  const [statusDialog, setStatusDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) => updateContractor(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor', id] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setSubmitted(false);
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
    onSuccess: (_data, is_active) => {
      queryClient.invalidateQueries({ queryKey: ['contractor', id] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setStatusDialog(false);
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

  const anyPending =
    updateMutation.isPending ||
    deptMutation.isPending   ||
    statusMutation.isPending ||
    deleteMutation.isPending;

  // ─── Department save handler ───────────────────────────────────────────────────

  function handleSaveDepts() {
    if (selectedDeptIds.length === 0) {
      setDeptError('At least one department is required');
      return;
    }
    deptMutation.mutate(selectedDeptIds);
  }

  // ─── Loading state ────────────────────────────────────────────────────────────

  if (isLoading) return <PageSkeleton />;

  // ─── Error / not found ────────────────────────────────────────────────────────

  if (isError || !contractor) {
    return (
      <>
        <PageHeader
          title="Contractor Details"
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/contractors')}>
              <ArrowLeft size={14} />
              Back to Contractors
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle size={40} className="text-lng-red" />
          <h2 className="text-base font-semibold text-lng-grey">Contractor Not Found</h2>
          <p className="text-sm text-gray-500">This contractor account could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate('/admin/contractors')}>
            <ArrowLeft size={14} />
            Back to Contractors
          </Button>
        </div>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Contractor Details"
        subtitle={contractor.name}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/contractors')}
            disabled={anyPending}
          >
            <ArrowLeft size={14} />
            Back to Contractors
          </Button>
        }
      />

      {/* Inactive banner */}
      {!contractor.is_active && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-lng-red-20 px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 text-lng-red" />
          <p className="text-sm text-lng-red">
            This contractor account is currently inactive and cannot log in.
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left column ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Edit details card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-sm font-bold text-lng-grey">Account Details</h2>
            </div>

            <form
              onSubmit={handleSubmit((data) => {
                setSubmitted(true);
                updateMutation.mutate(data, {
                  onError: () => setSubmitted(false),
                });
              })}
              noValidate
              className="space-y-5"
            >
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter full name"
                disabled={anyPending}
                error={errors.name?.message}
                {...register('name')}
              />

              <div className="flex flex-col gap-1">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="Enter email address"
                  disabled={anyPending}
                  error={errors.email?.message}
                  {...register('email')}
                />
                {!errors.email && (
                  <div className="mt-1 flex items-start gap-1.5">
                    <Info size={13} className="mt-0.5 shrink-0 text-lng-blue" />
                    <p className="text-xs text-lng-grey leading-relaxed">
                      Changing the email will update the contractor's login credentials.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
                {isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={anyPending}
                    onClick={() => reset({ name: contractor.name, email: contractor.email })}
                  >
                    Reset Changes
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateMutation.isPending}
                  disabled={!isDirty || anyPending}
                >
                  <Save size={14} />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Department assignment card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-sm font-bold text-lng-grey">Department Access</h2>
            </div>

            {deptsLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <span className="text-sm text-gray-400">Loading departments…</span>
              </div>
            ) : !departments || departments.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-sm text-lng-grey">
                  No departments available. Please create departments first.
                </p>
                <Link
                  to="/admin/departments"
                  className="inline-flex items-center gap-1 text-xs font-medium text-lng-blue hover:underline"
                >
                  Go to Departments
                  <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-md border border-gray-200 divide-y divide-gray-100">
                  {departments.map((dept) => {
                    const checked = selectedDeptIds.includes(dept.id);
                    return (
                      <label
                        key={dept.id}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                          checked ? 'bg-lng-blue-20' : 'hover:bg-gray-50'
                        } ${anyPending ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={anyPending}
                          onChange={() => toggleDept(dept.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-lng-blue"
                        />
                        <span className="text-sm text-lng-grey">{dept.name}</span>
                      </label>
                    );
                  })}
                </div>

                {deptError && (
                  <p className="mb-3 text-xs text-lng-red">{deptError}</p>
                )}

                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center"
                  loading={deptMutation.isPending}
                  disabled={!deptsChanged || anyPending}
                  onClick={handleSaveDepts}
                >
                  <Save size={14} />
                  Save Departments
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">

          {/* Account status card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-sm font-bold text-lng-grey">Account Status</h2>
            </div>

            <div className="space-y-4">
              <Badge variant={contractor.is_active ? 'success' : 'neutral'}>
                {contractor.is_active ? 'Active' : 'Inactive'}
              </Badge>

              <p className="text-sm text-lng-grey">
                {contractor.is_active
                  ? 'This contractor can log in and view documents and videos.'
                  : 'This contractor cannot log in.'}
              </p>

              <Button
                type="button"
                variant={contractor.is_active ? 'danger' : 'primary'}
                className="w-full justify-center"
                disabled={anyPending}
                onClick={() => setStatusDialog(true)}
              >
                {contractor.is_active ? (
                  <><UserX size={14} /> Deactivate Contractor</>
                ) : (
                  <><UserCheck size={14} /> Activate Contractor</>
                )}
              </Button>
            </div>
          </div>

          {/* Danger zone card */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-lng-red-40">
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-sm font-bold text-lng-red">Danger Zone</h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-lng-grey">
                Permanently delete this contractor account. This action cannot be undone.
              </p>
              <Button
                type="button"
                variant="danger"
                className="w-full justify-center"
                disabled={anyPending}
                onClick={() => setDeleteDialog(true)}
              >
                <Trash2 size={14} />
                Delete Contractor Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="mt-6 flex items-center gap-6 rounded-lg border border-gray-100 bg-white px-5 py-3 text-xs text-lng-grey shadow-sm">
        <span>
          <span className="font-medium">Created</span>
          {' '}
          {formatDate(contractor.created_at)}
        </span>
        <span className="h-4 w-px bg-gray-200" aria-hidden />
        <span>
          <span className="font-medium">Account ID</span>
          {' '}
          <span className="font-mono">{contractor.id}</span>
        </span>
      </div>

      {/* ── Status confirm dialog ── */}
      <Modal
        open={statusDialog}
        onClose={() => !statusMutation.isPending && setStatusDialog(false)}
        title={contractor.is_active ? 'Deactivate Contractor' : 'Activate Contractor'}
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setStatusDialog(false)}
              disabled={statusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={contractor.is_active ? 'danger' : 'primary'}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate(!contractor.is_active)}
            >
              {contractor.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-lng-grey">
          {contractor.is_active
            ? `Are you sure you want to deactivate ${contractor.name}? They will no longer be able to log in. This does not affect any admin accounts.`
            : `Are you sure you want to activate ${contractor.name}?`}
        </p>
      </Modal>

      {/* ── Delete confirm dialog ── */}
      <ConfirmDialog
        open={deleteDialog}
        onClose={() => !deleteMutation.isPending && setDeleteDialog(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete Contractor Account"
        confirmLabel="Delete"
        message={`Are you sure you want to delete ${contractor.name}? This action cannot be undone. The contractor will lose all access immediately.`}
      />

      {/* ── Unsaved changes dialog ── */}
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
