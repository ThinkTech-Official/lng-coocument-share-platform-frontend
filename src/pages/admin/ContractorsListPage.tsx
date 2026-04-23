import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HardHat,
  UserPlus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Search,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Contractor, type Department } from '../../types';
import { getContractors, updateContractorStatus, deleteContractor } from '../../api/contractors';
import { getDepartments } from '../../api/departments';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
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
  open, onClose, onConfirm, title, message, confirmLabel, confirmVariant, loading = false,
}: ActionDialogProps) {
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

// ─── Department badges ────────────────────────────────────────────────────────

function DeptBadges({ departments = [] }: { departments?: Department[] }) {
  if (departments.length === 0) {
    return <span className="text-xs italic text-lng-grey">No departments</span>;
  }
  const showAll = departments.length <= 3;
  const shown   = showAll ? departments : departments.slice(0, 2);
  const extra   = departments.length - 2;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((d) => (
        <Badge key={d.id} variant="info">{d.name}</Badge>
      ))}
      {!showAll && <Badge variant="neutral">+{extra} more</Badge>}
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  const bar = (w: string, h = 'h-4') => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${h} ${w}`} />
  );
  return (
    <tr>
      <td className="px-4 py-3">{bar('w-32')}</td>
      <td className="px-4 py-3">{bar('w-48')}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">{bar('w-16 h-5 rounded-full')}{bar('w-16 h-5 rounded-full')}</div>
      </td>
      <td className="px-4 py-3">{bar('w-14 h-5 rounded-full')}</td>
      <td className="px-4 py-3">{bar('w-24')}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1.5">
          {bar('w-7 h-7 rounded')}{bar('w-7 h-7 rounded')}{bar('w-7 h-7 rounded')}
        </div>
      </td>
    </tr>
  );
}

// ─── Dialog state types ───────────────────────────────────────────────────────

interface StatusDialogState {
  open: boolean;
  contractor: Contractor | null;
  action: 'activate' | 'deactivate';
}

interface DeleteDialogState {
  open: boolean;
  contractor: Contractor | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'inactive';

export default function ContractorsListPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter]       = useState<StatusFilter>('all');
  const [deptFilter, setDeptFilter]           = useState('');

  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    open: false, contractor: null, action: 'activate',
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false, contractor: null,
  });

  useEffect(() => {
    document.title = 'Contractors — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // Debounce search 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: contractors, isLoading, isError, refetch } = useQuery({
    queryKey: ['contractors'],
    queryFn:  getContractors,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn:  getDepartments,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateContractorStatus(id, is_active),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      const verb = variables.is_active ? 'activated' : 'deactivated';
      toast.success(`Contractor ${statusDialog.contractor?.name} has been ${verb}`);
      setStatusDialog({ open: false, contractor: null, action: 'activate' });
    },
    onError: () => toast.error('Something went wrong. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContractor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor deleted successfully');
      setDeleteDialog({ open: false, contractor: null });
    },
    onError: () => toast.error('Something went wrong. Please try again.'),
  });

  // ─── Client-side filtering ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!contractors) return [];
    const q = debouncedSearch.toLowerCase();
    return contractors.filter((c) => {
      const matchesSearch =
        !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active'   && c.is_active)  ||
        (statusFilter === 'inactive' && !c.is_active);
      const matchesDept =
        !deptFilter || c.departments.some((d) => d.id === deptFilter);
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [contractors, debouncedSearch, statusFilter, deptFilter]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function openStatusDialog(contractor: Contractor) {
    setStatusDialog({
      open: true,
      contractor,
      action: contractor.is_active ? 'deactivate' : 'activate',
    });
  }

  function openDeleteDialog(contractor: Contractor) {
    setDeleteDialog({ open: true, contractor });
  }

  function confirmStatus() {
    if (!statusDialog.contractor) return;
    statusMutation.mutate({
      id: statusDialog.contractor.id,
      is_active: statusDialog.action === 'activate',
    });
  }

  function confirmDelete() {
    if (!deleteDialog.contractor) return;
    deleteMutation.mutate(deleteDialog.contractor.id);
  }

  const selectCls = 'rounded border border-gray-300 px-3 py-2 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Contractors"
        subtitle="Manage contractor accounts"
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/contractors/create')}>
            <UserPlus size={15} />
            Create Contractor
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
          className={selectCls}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className={selectCls}
        >
          <option value="">All Departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
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
                <th className="px-4 py-3 font-medium text-lng-grey">Departments</th>
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
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle size={24} className="text-lng-red" />
                      <p className="text-sm text-lng-grey">
                        Failed to load contractors. Please try again.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty — no contractors exist */}
              {!isLoading && !isError && contractors?.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={HardHat}
                      title="No contractors yet"
                      message="Create the first contractor account to get started."
                    />
                    <div className="flex justify-center pb-8 -mt-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/admin/contractors/create')}
                      >
                        <UserPlus size={14} />
                        Create Contractor
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty — search/filter returned nothing */}
              {!isLoading && !isError && contractors && contractors.length > 0 && filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={HardHat}
                      title="No contractors found"
                      message="Try adjusting your search or filters."
                    />
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading && !isError && filtered.map((contractor) => (
                <tr
                  key={contractor.id}
                  className="transition-colors hover:bg-lng-blue-20"
                >
                  <td className="px-4 py-3 font-medium text-lng-grey">{contractor.name}</td>
                  <td className="px-4 py-3 text-lng-grey">{contractor.email}</td>
                  <td className="px-4 py-3">
                    <DeptBadges departments={contractor.departments} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={contractor.is_active ? 'success' : 'neutral'}>
                      {contractor.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-lng-grey">{formatDate(contractor.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit */}
                      <button
                        title="Edit"
                        onClick={() => navigate(`/admin/contractors/${contractor.id}`)}
                        className="rounded p-1.5 text-lng-grey hover:bg-gray-100 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Toggle status */}
                      <button
                        title={contractor.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => openStatusDialog(contractor)}
                        className="rounded p-1.5 transition-colors hover:bg-gray-100"
                      >
                        {contractor.is_active ? (
                          <ToggleRight size={18} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={18} className="text-lng-grey" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        title="Delete"
                        onClick={() => openDeleteDialog(contractor)}
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
        title={statusDialog.action === 'deactivate' ? 'Deactivate Contractor' : 'Activate Contractor'}
        message={
          statusDialog.action === 'deactivate'
            ? `Are you sure you want to deactivate ${statusDialog.contractor?.name}? They will no longer be able to log in. This does not affect any admin accounts.`
            : `Are you sure you want to activate ${statusDialog.contractor?.name}?`
        }
      />

      {/* ── Delete dialog ── */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog((s) => ({ ...s, open: false }))}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
        confirmLabel="Delete"
        title="Delete Contractor"
        message={`Are you sure you want to delete ${deleteDialog.contractor?.name}? This action cannot be undone.`}
      />
    </>
  );
}
