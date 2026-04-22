import { useState, useEffect } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  UserX,
  UserCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdmin, updateAdmin, updateAdminStatus, deleteAdmin } from '../../api/admins';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type EditForm = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Action dialog (supports primary + danger confirm) ────────────────────────

interface ActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'primary' | 'danger';
  loading?: boolean;
}

function ActionDialog({ open, onClose, onConfirm, title, message, confirmLabel, confirmVariant, loading = false }: ActionDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-lng-grey">{message}</p>
    </Modal>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  const bar = (w: string, h = 'h-4') => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${h} ${w}`} />
  );
  return (
    <div className="space-y-6">
      {/* header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">{bar('w-40 h-6')}{bar('w-56')}</div>
        {bar('w-32 h-9')}
      </div>
      {/* two-col skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
          {bar('w-36 h-5')}<div className="border-t border-gray-100 pt-4 space-y-4">
            {bar('w-full h-10')}{bar('w-full h-10')}
            <div className="flex justify-end gap-3 pt-2">{bar('w-24 h-9')}{bar('w-32 h-9')}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-3">
            {bar('w-32 h-5')}<div className="border-t border-gray-100 pt-3 space-y-3">
              {bar('w-16 h-6 rounded-full')}{bar('w-full')}{bar('w-full h-9')}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-3">
            {bar('w-28 h-5')}<div className="border-t border-gray-100 pt-3 space-y-3">
              {bar('w-full')}{bar('w-full h-9')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertCircle size={32} className="mb-3 text-lng-red" />
      <h2 className="mb-1 text-base font-semibold text-lng-grey">Admin Not Found</h2>
      <p className="mb-6 text-sm text-gray-400">This admin account could not be loaded.</p>
      <Button variant="outline" onClick={onBack}><ArrowLeft size={14} />Back to Admins</Button>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-white p-6 shadow-sm ${className}`}>{children}</div>
  );
}

function CardHeading({ label, icon: Icon, iconClass }: { label: string; icon?: LucideIcon; iconClass?: string }) {
  return (
    <div className="mb-4 border-b border-gray-200 pb-3">
      <h2 className={`flex items-center gap-2 text-sm font-bold ${iconClass ?? 'text-lng-grey'}`}>
        {Icon && <Icon size={14} />}{label}
      </h2>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDetailPage() {
  const { id = '' }  = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editSubmitted, setEditSubmitted]       = useState(false);

  // ─── Query ──────────────────────────────────────────────────────────────────

  const { data: admin, isLoading, isError } = useQuery({
    queryKey: ['admin', id],
    queryFn: () => getAdmin(id),
    enabled: !!id,
  });

  // ─── Edit form ──────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (admin) reset({ name: admin.name, email: admin.email });
  }, [admin, reset]);

  // ─── Page title ─────────────────────────────────────────────────────────────

  useEffect(() => {
    document.title = admin ? `${admin.name} — LNG Canada` : 'Admin Details — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, [admin]);

  // ─── Unsaved changes blocker ────────────────────────────────────────────────

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !editSubmitted && currentLocation.pathname !== nextLocation.pathname
  );

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) => updateAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', id] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin details updated');
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

  const statusMutation = useMutation({
    mutationFn: (is_active: boolean) => updateAdminStatus(id, is_active),
    onSuccess: (_data, is_active) => {
      queryClient.invalidateQueries({ queryKey: ['admin', id] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success(`Admin ${is_active ? 'activated' : 'deactivated'} successfully`);
      setStatusDialogOpen(false);
    },
    onError: () => toast.error('Something went wrong. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin account deleted');
      setEditSubmitted(true);
      navigate('/superadmin/admins');
    },
    onError: () => toast.error('Failed to delete. Please try again.'),
  });

  const anyPending = updateMutation.isPending || statusMutation.isPending || deleteMutation.isPending;

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <PageSkeleton />;
  if (isError || !admin) return <ErrorState onBack={() => navigate('/superadmin/admins')} />;

  const isActive = admin.is_active;

  return (
    <>
      <PageHeader
        title="Admin Details"
        subtitle={admin.name}
        actions={
          <Button variant="outline" onClick={() => navigate('/superadmin/admins')} disabled={anyPending}>
            <ArrowLeft size={14} />Back to Admins
          </Button>
        }
      />

      {/* Inactive banner */}
      {!isActive && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg bg-lng-red-20 px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 text-lng-red" />
          <p className="text-sm text-lng-red">
            This admin account is currently inactive and cannot log in.
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left: Edit details ── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeading label="Account Details" />
            <form
              onSubmit={handleSubmit((data) => {
                updateMutation.mutate(data);
              })}
              noValidate
              className="space-y-5"
            >
              <Input
                label="Full Name"
                type="text"
                disabled={anyPending}
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Email Address"
                type="email"
                disabled={anyPending}
                error={errors.email?.message}
                {...register('email')}
              />
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                {isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={anyPending}
                    onClick={() => reset({ name: admin.name, email: admin.email })}
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
                  <Save size={14} />Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* ── Right: Status + Danger ── */}
        <div className="flex flex-col gap-6">

          {/* Account status card */}
          <Card>
            <CardHeading label="Account Status" />
            <div className="space-y-3">
              <Badge variant={isActive ? 'success' : 'neutral'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
              <p className="text-sm text-gray-400">
                {isActive
                  ? 'This admin can log in and manage the platform.'
                  : 'This admin cannot log in.'}
              </p>
              <Button
                variant={isActive ? 'danger' : 'primary'}
                className="w-full"
                disabled={anyPending}
                loading={statusMutation.isPending}
                onClick={() => setStatusDialogOpen(true)}
              >
                {isActive
                  ? <><UserX size={14} />Deactivate Admin</>
                  : <><UserCheck size={14} />Activate Admin</>}
              </Button>
            </div>
          </Card>

          {/* Danger zone card */}
          <Card className="border border-lng-red-40">
            <CardHeading label="Danger Zone" icon={AlertTriangle} iconClass="text-lng-red" />
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Permanently delete this admin account. This action cannot be undone.
              </p>
              <Button
                variant="danger"
                className="w-full"
                disabled={anyPending}
                loading={deleteMutation.isPending}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={14} />Delete Admin Account
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Info strip */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-white px-6 py-4 shadow-sm text-xs text-gray-400">
        <span>
          Created:{' '}
          <span className="font-medium text-lng-grey">{formatDate(admin.created_at)}</span>
        </span>
        <span className="hidden sm:block text-gray-200">|</span>
        <span>
          Account ID:{' '}
          <code className="font-mono text-xs text-lng-grey">{admin.id}</code>
        </span>
      </div>

      {/* ── Status dialog ── */}
      <ActionDialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={() => statusMutation.mutate(!isActive)}
        loading={statusMutation.isPending}
        confirmVariant={isActive ? 'danger' : 'primary'}
        confirmLabel={isActive ? 'Deactivate' : 'Activate'}
        title={isActive ? 'Deactivate Admin' : 'Activate Admin'}
        message={
          isActive
            ? `Are you sure you want to deactivate ${admin.name}? They will no longer be able to log in. This does not affect any contractors.`
            : `Are you sure you want to activate ${admin.name}?`
        }
      />

      {/* ── Delete dialog ── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        confirmLabel="Delete"
        title="Delete Admin Account"
        message={`Are you sure you want to delete ${admin.name}? This action cannot be undone. The admin will lose all access immediately.`}
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
