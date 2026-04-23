import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, Building2, AlertCircle, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Department } from '../../types';
import { getDepartments, deleteDepartment } from '../../api/departments';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function extractConflicts(error: unknown): string[] | null {
  const data = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (data?.status !== 409) return null;
  const msg = data?.data?.message;
  if (Array.isArray(msg)) return msg as string[];
  if (typeof msg === 'string') return [msg];
  return ['This department cannot be deleted because it has active associations.'];
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <div className="flex flex-col rounded-lg border-l-4 border-lng-blue bg-white p-6 shadow-sm">
      <div className="mb-3 space-y-2">
        {bar('h-5 w-3/4')}
        {bar('h-4 w-full')}
        {bar('h-4 w-2/3')}
      </div>
      <div className="mt-auto pt-4 space-y-3">
        {bar('h-3 w-28')}
        <div className="flex gap-2">{bar('h-7 w-16 rounded')}{bar('h-7 w-16 rounded')}</div>
      </div>
    </div>
  );
}

// ─── Department card ──────────────────────────────────────────────────────────

interface DeptCardProps {
  dept: Department;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function DeptCard({ dept, onEdit, onDelete, deleting }: DeptCardProps) {
  return (
    <div className="flex flex-col rounded-lg border-l-4 border-lng-blue bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Name */}
      <h3 className="mb-1 line-clamp-2 text-base font-bold text-lng-grey break-words">
        {dept.name}
      </h3>

      {/* Description */}
      <p className={`mb-4 line-clamp-2 text-sm ${dept.description ? 'italic text-lng-grey' : 'text-lng-grey opacity-50'}`}>
        {dept.description || 'No description'}
      </p>

      {/* Created date */}
      <p className="mb-3 mt-auto text-xs text-lng-grey">
        Created {formatDate(dept.created_at)}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} disabled={deleting}>
          <Pencil size={13} />
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} loading={deleting} disabled={deleting}>
          <Trash2 size={13} />
          Delete
        </Button>
      </div>
    </div>
  );
}

// ─── Conflict modal ───────────────────────────────────────────────────────────

interface ConflictModalProps {
  conflicts: string[];
  onClose: () => void;
}

function ConflictModal({ conflicts, onClose }: ConflictModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Cannot Delete Department"
      maxWidth="sm"
      footer={
        <Button variant="outline" onClick={onClose}>Close</Button>
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-lng-red" />
        <div className="space-y-1">
          {conflicts.map((msg, i) => (
            <p key={i} className="text-sm text-lng-grey">{msg}</p>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepartmentsListPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [conflicts, setConflicts]       = useState<string[] | null>(null);

  useEffect(() => {
    document.title = 'Departments — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // Debounce search 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Query ────────────────────────────────────────────────────────────────────

  const { data: departments, isLoading, isError, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn:  getDepartments,
  });

  // ─── Delete mutation ──────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted successfully');
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      const conflictMsgs = extractConflicts(error);
      if (conflictMsgs) {
        setDeleteTarget(null);
        setConflicts(conflictMsgs);
      } else {
        toast.error('Failed to delete department. Please try again.');
        setDeleteTarget(null);
      }
    },
  });

  // ─── Client-side filtering ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!departments) return [];
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }, [departments, debouncedSearch]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Departments"
        subtitle="Manage departments"
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/departments/create')}>
            <Plus size={15} />
            Create Department
          </Button>
        }
      />

      {/* Search bar */}
      <div className="relative mb-6 max-w-sm">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder="Search departments"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
        />
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={32} className="text-lng-red" />
          <p className="text-sm text-lng-grey">Failed to load departments. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Empty — no departments at all */}
      {!isLoading && !isError && departments?.length === 0 && (
        <div>
          <EmptyState
            icon={Building2}
            title="No departments yet"
            message="Create your first department to start assigning contractors."
          />
          <div className="flex justify-center -mt-4">
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/departments/create')}>
              <Plus size={14} />
              Create Department
            </Button>
          </div>
        </div>
      )}

      {/* Empty — search returned nothing */}
      {!isLoading && !isError && departments && departments.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No departments found"
          message="Try a different search term."
        />
      )}

      {/* Department cards */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dept) => (
            <DeptCard
              key={dept.id}
              dept={dept}
              onEdit={() => navigate(`/admin/departments/${dept.id}`)}
              onDelete={() => setDeleteTarget(dept)}
              deleting={deleteMutation.isPending && deleteTarget?.id === dept.id}
            />
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Delete Department"
        confirmLabel="Delete"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
      />

      {/* Conflict modal */}
      {conflicts && (
        <ConflictModal conflicts={conflicts} onClose={() => setConflicts(null)} />
      )}
    </>
  );
}
