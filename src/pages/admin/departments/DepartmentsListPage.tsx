import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Plus, Search, Building2, AlertCircle, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Department } from '../../../types';
import { getDepartments, deleteDepartment } from '../../../api/departments';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Modal from '../../../components/ui/Modal';
import Pagination from '../../../components/ui/Pagination';

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

// ─── Skeleton list ────────────────────────────────────────────────────────────

function SkeletonList() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-gray-200 ${cls}`} />
  );
  return (
    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex flex-1 items-center gap-4 min-w-0">
            {bar('h-4 w-40')}
            {bar('h-3 w-56')}
          </div>
          {bar('h-3 w-24')}
          <div className="flex gap-2">
            {bar('h-7 w-14 rounded-lg')}
            {bar('h-7 w-16 rounded-lg')}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Department row ───────────────────────────────────────────────────────────

interface DeptRowProps {
  dept: Department;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function DeptRow({ dept, onEdit, onDelete, deleting }: DeptRowProps) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
      deleting ? 'opacity-60' : ''
    }`}>
      {/* Name + description */}
      <div className="flex flex-1 items-center gap-4 min-w-0">
        <span className="shrink-0 font-semibold text-sm text-gray-800">{dept.name}</span>
        {dept.description ? (
          <span className="truncate text-sm text-gray-400">{dept.description}</span>
        ) : (
          <span className="text-xs italic text-gray-300">No description</span>
        )}
      </div>

      {/* Created date */}
      <span className="shrink-0 text-xs text-gray-400">{formatDate(dept.created_at)}</span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onEdit}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          Delete
        </button>
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

  const [page, setPage]                     = useState(1);
  const [search, setSearch]                 = useState('');
  const [debouncedSearch, setDebounced]     = useState('');
  const [deleteTarget, setDeleteTarget]     = useState<Department | null>(null);
  const [conflicts, setConflicts]           = useState<string[] | null>(null);

  useEffect(() => {
    document.title = 'Departments LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // Debounce search 300 ms; reset page
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Query ────────────────────────────────────────────────────────────────────

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['departments', { page, search: debouncedSearch }],
    queryFn:  () => getDepartments({ page, limit: 10, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const departments = data?.data ?? [];
  const meta        = data?.meta;

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

  const hasSearch = !!debouncedSearch;

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
      <div className="relative mb-6">
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder="Search departments"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 shadow-sm focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && <SkeletonList />}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={32} className="text-lng-red" />
          <p className="text-sm text-lng-grey">Failed to load departments. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Empty — no departments at all */}
      {!isLoading && !isError && meta?.total === 0 && !hasSearch && (
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
      {!isLoading && !isError && departments.length === 0 && hasSearch && (
        <EmptyState
          icon={Building2}
          title="No departments found"
          message="Try a different search term."
        />
      )}

      {/* Department list */}
      {!isLoading && !isError && departments.length > 0 && (
        <>
          <div
            className={`rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100 transition-opacity duration-200 ${
              isFetching ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {departments.map((dept) => (
              <DeptRow
                key={dept.id}
                dept={dept}
                onEdit={() => navigate(`/admin/departments/${dept.id}`)}
                onDelete={() => setDeleteTarget(dept)}
                deleting={deleteMutation.isPending && deleteTarget?.id === dept.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && (
            <div className="mt-6">
              <Pagination meta={meta} onPageChange={setPage} isLoading={isFetching} />
            </div>
          )}
        </>
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