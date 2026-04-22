import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Search,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Admin } from '../../types';
import { getAdmins, updateAdminStatus, deleteAdmin } from '../../api/admins';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Action dialog (supports primary + danger confirm variants) ───────────────

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

function ActionDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmVariant,
  loading = false,
}: ActionDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-lng-grey">{message}</p>
    </Modal>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="h-4 w-32 animate-pulse rounded bg-lng-blue-20" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-48 animate-pulse rounded bg-lng-blue-20" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 animate-pulse rounded-full bg-lng-blue-20" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-lng-blue-20" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-4 w-20 animate-pulse rounded bg-lng-blue-20" />
      </td>
    </tr>
  );
}

// ─── Dialog state types ───────────────────────────────────────────────────────

interface StatusDialogState {
  open: boolean;
  admin: Admin | null;
  action: 'activate' | 'deactivate';
}

interface DeleteDialogState {
  open: boolean;
  admin: Admin | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminsListPage() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false, admin: null, action: 'activate',
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false, admin: null,
  });

  useEffect(() => {
    document.title = 'Admins — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // Debounce search input 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Query ──────────────────────────────────────────────────────────────────

  const { data: admins, isLoading, isError, refetch } = useQuery({
    queryKey: ['admins'],
    queryFn: getAdmins,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateAdminStatus(id, is_active),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      const verb = variables.is_active ? 'activated' : 'deactivated';
      toast.success(`Admin ${statusDialog.admin?.name} has been ${verb}`);
      setStatusDialog({ open: false, admin: null, action: 'activate' });
    },
    onError: () => toast.error('Something went wrong. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin deleted successfully');
      setDeleteDialog({ open: false, admin: null });
    },
    onError: () => toast.error('Something went wrong. Please try again.'),
  });

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!admins) return [];
    const q = debouncedSearch.toLowerCase();
    return admins.filter((a) => {
      const matchesSearch =
        !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && a.is_active) ||
        (statusFilter === 'inactive' && !a.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [admins, debouncedSearch, statusFilter]);


  // ─── Handlers ───────────────────────────────────────────────────────────────

  function openStatusDialog(admin: Admin) {
    setStatusDialog({
      open: true,
      admin,
      action: admin.is_active ? 'deactivate' : 'activate',
    });
  }

  function openDeleteDialog(admin: Admin) {
    setDeleteDialog({ open: true, admin });
  }

  function confirmStatus() {
    if (!statusDialog.admin) return;
    statusMutation.mutate({
      id: statusDialog.admin.id,
      is_active: statusDialog.action === 'activate',
    });
  }

  function confirmDelete() {
    if (!deleteDialog.admin) return;
    deleteMutation.mutate(deleteDialog.admin.id);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Admins"
        subtitle="Manage admin accounts"
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/superadmin/admins/create')}
          >
            <UserPlus size={15} />
            Create Admin
          </Button>
        }
      />

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-lng-grey">Name</th>
                <th className="px-4 py-3 font-medium text-lng-grey">Email</th>
                <th className="px-4 py-3 font-medium text-lng-grey">Status</th>
                <th className="px-4 py-3 font-medium text-lng-grey">Created</th>
                <th className="px-4 py-3 text-right font-medium text-lng-grey">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">

              {/* Loading skeleton */}
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}

              {/* Error state */}
              {isError && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle size={24} className="text-lng-red" />
                      <p className="text-sm text-lng-grey">
                        Failed to load admins. Please try again.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty — no admins exist */}
              {!isLoading && !isError && admins?.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Users}
                      title="No admins yet"
                      message="Create the first admin account to get started."
                    />
                    <div className="flex justify-center pb-8 -mt-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/superadmin/admins/create')}
                      >
                        <UserPlus size={14} />
                        Create Admin
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty — search/filter returned nothing */}
              {!isLoading && !isError && admins && admins.length > 0 && filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Users}
                      title="No admins found"
                      message="Try a different search term."
                    />
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading && !isError && filtered.map((admin) => (
                <tr
                  key={admin.id}
                  className="transition-colors hover:bg-lng-blue-20/40"
                >
                  <td className="px-4 py-3 font-medium text-lng-grey">{admin.name}</td>
                  <td className="px-4 py-3 text-lng-grey">{admin.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={admin.is_active ? 'success' : 'neutral'}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-lng-grey">{formatDate(admin.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit */}
                      <button
                        title="Edit"
                        onClick={() => navigate(`/superadmin/admins/${admin.id}`)}
                        className="rounded p-1.5 text-lng-grey hover:bg-gray-100 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Toggle status */}
                      <button
                        title={admin.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => openStatusDialog(admin)}
                        className="rounded p-1.5 transition-colors hover:bg-gray-100"
                      >
                        {admin.is_active ? (
                          <ToggleRight size={18} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={18} className="text-lng-grey" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        title="Delete"
                        onClick={() => openDeleteDialog(admin)}
                        className="rounded p-1.5 text-lng-red hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>

      {/* ── Status dialog ── */}
      <ActionDialog
        open={statusDialog.open}
        onClose={() => setStatusDialog((s) => ({ ...s, open: false }))}
        onConfirm={confirmStatus}
        loading={statusMutation.isPending}
        confirmVariant={statusDialog.action === 'deactivate' ? 'danger' : 'primary'}
        confirmLabel={statusDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        title={
          statusDialog.action === 'deactivate'
            ? 'Deactivate Admin'
            : 'Activate Admin'
        }
        message={
          statusDialog.action === 'deactivate'
            ? `Are you sure you want to deactivate ${statusDialog.admin?.name}? They will no longer be able to log in. This does not affect any contractors.`
            : `Are you sure you want to activate ${statusDialog.admin?.name}?`
        }
      />

      {/* ── Delete dialog ── */}
      <ActionDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog((s) => ({ ...s, open: false }))}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
        confirmVariant="danger"
        confirmLabel="Delete"
        title="Delete Admin"
        message={`Are you sure you want to delete ${deleteDialog.admin?.name}? This action cannot be undone.`}
      />
    </>
  );
}
