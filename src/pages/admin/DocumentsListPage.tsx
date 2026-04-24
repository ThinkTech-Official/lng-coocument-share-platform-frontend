import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import {
  Upload, Search, Pencil, Send, EyeOff, Trash2,
  AlertCircle, FileText, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Document, type Category, type DocumentState } from '../../types';
import {
  getDocuments, updateDocumentStatus, deleteDocument,
} from '../../api/documents';
import { getCategories } from '../../api/categories';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getCategoryLabel(doc: Document, allCats: Category[]): string {
  if (!doc.category) return 'Uncategorized';
  const cat = doc.category;
  if (!cat.parent_category_id) return cat.name;
  const parent = allCats.find((c) => c.id === cat.parent_category_id);
  return parent ? `${parent.name} > ${cat.name}` : cat.name;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <tr>
      <td className="px-4 py-3">{bar('h-4 w-4')}</td>
      <td className="px-4 py-3">{bar('h-4 w-52')}</td>
      <td className="px-4 py-3">{bar('h-4 w-36')}</td>
      <td className="px-4 py-3">{bar('h-5 w-20 rounded-full')}</td>
      <td className="px-4 py-3">{bar('h-5 w-28 rounded-full')}</td>
      <td className="px-4 py-3">{bar('h-4 w-24')}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          {bar('h-7 w-7 rounded')}
          {bar('h-7 w-7 rounded')}
          {bar('h-7 w-7 rounded')}
        </div>
      </td>
    </tr>
  );
}

// ─── State badge ──────────────────────────────────────────────────────────────

function StateBadge({ state }: { state: DocumentState }) {
  if (state === 'PUBLISHED')   return <Badge variant="success">Published</Badge>;
  if (state === 'UNPUBLISHED') return <Badge variant="warning">Unpublished</Badge>;
  return <Badge variant="neutral">Draft</Badge>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsListPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // ─── URL-persisted filters ────────────────────────────────────────────────

  const [searchParams, setSearchParams] = useSearchParams();

  const stateFilter    = searchParams.get('state') ?? '';
  const categoryFilter = searchParams.get('category_id') ?? '';
  const accessFilter   = searchParams.get('access') ?? '';
  const searchQuery    = searchParams.get('search') ?? '';

  const [searchInput, setSearchInput] = useState(() => searchQuery);

  // Debounce search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput) next.set('search', searchInput);
          else next.delete('search');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, setSearchParams]);

  const setFilter = (key: string, value: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const hasFilters = !!(stateFilter || categoryFilter || accessFilter || searchInput);

  // ─── Local UI state ───────────────────────────────────────────────────────

  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds]           = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending]         = useState(false);
  const [unpublishTarget, setUnpublishTarget] = useState<Document | null>(null);
  const [deleteTarget, setDeleteTarget]       = useState<Document | null>(null);
  const [showBulkDelete, setShowBulkDelete]   = useState(false);

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Documents — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const {
    data: documents,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['documents', { search: searchQuery, state: stateFilter, category_id: categoryFilter }],
    queryFn: () =>
      getDocuments({
        ...(searchQuery    && { search: searchQuery }),
        ...(stateFilter    && { state: stateFilter }),
        ...(categoryFilter && { category_id: categoryFilter }),
      } as Parameters<typeof getDocuments>[0]),
    placeholderData: keepPreviousData,
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  getCategories,
  });

  // Root categories for the filter dropdown
  const rootCategories = useMemo(
    () => [...allCategories]
      .filter((c) => c.parent_category_id === null)
      .sort((a, b) => a.sort_order - b.sort_order),
    [allCategories],
  );

  // ─── Client-side access filter ────────────────────────────────────────────

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    if (!accessFilter) return documents;
    return documents.filter((d) => d.access_type === accessFilter);
  }, [documents, accessFilter]);

  // ─── Selection helpers ────────────────────────────────────────────────────

  const allSelected   = filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedIds.has(d.id));
  const someSelected  = filteredDocuments.some((d) => selectedIds.has(d.id));
  const selectedCount = filteredDocuments.filter((d) => selectedIds.has(d.id)).length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  // Clear selection when filter/data changes
  useEffect(() => { setSelectedIds(new Set()); }, [documents, stateFilter, categoryFilter, accessFilter, searchQuery]);

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const hasBulkPublishable = filteredDocuments.some(
    (d) => selectedIds.has(d.id) && (d.state === 'DRAFT' || d.state === 'UNPUBLISHED'),
  );

  // ─── Pending helpers ──────────────────────────────────────────────────────

  const addPending    = (id: string) => setPendingIds((p) => new Set(p).add(id));
  const removePending = (id: string) => setPendingIds((p) => { const n = new Set(p); n.delete(id); return n; });

  // ─── Status mutation ──────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ id, newState }: { id: string; newState: DocumentState; prevState: DocumentState }) =>
      updateDocumentStatus(id, newState),
    onMutate: ({ id }) => addPending(id),
    onSuccess: (_, { newState, prevState }) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (newState === 'PUBLISHED' && prevState === 'DRAFT')        toast.success('Document published successfully');
      else if (newState === 'PUBLISHED' && prevState === 'UNPUBLISHED') toast.success('Document re-published');
      else if (newState === 'UNPUBLISHED')                          toast.success('Document unpublished');
      setUnpublishTarget(null);
    },
    onError: () => toast.error('Failed to update document status. Please try again.'),
    onSettled: (_, __, { id }) => removePending(id),
  });

  // ─── Delete mutation ──────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onMutate: (id) => addPending(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete document. Please try again.'),
    onSettled: (_, __, id) => removePending(id),
  });

  // ─── Bulk operations ──────────────────────────────────────────────────────

  const handleBulkPublish = async () => {
    const targets = filteredDocuments.filter(
      (d) => selectedIds.has(d.id) && (d.state === 'DRAFT' || d.state === 'UNPUBLISHED'),
    );
    if (!targets.length) return;
    const ids = targets.map((d) => d.id);
    setBulkPending(true);
    setPendingIds((p) => { const n = new Set(p); ids.forEach((id) => n.add(id)); return n; });
    try {
      await Promise.all(ids.map((id) => updateDocumentStatus(id, 'PUBLISHED')));
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`${targets.length} document(s) published`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to publish some documents. Please try again.');
    } finally {
      setBulkPending(false);
      setPendingIds((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n; });
    }
  };

  const handleBulkDelete = async () => {
    const ids = filteredDocuments.filter((d) => selectedIds.has(d.id)).map((d) => d.id);
    if (!ids.length) return;
    setBulkPending(true);
    setPendingIds((p) => { const n = new Set(p); ids.forEach((id) => n.add(id)); return n; });
    try {
      await Promise.all(ids.map((id) => deleteDocument(id)));
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`${ids.length} document(s) deleted`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
    } catch {
      toast.error('Failed to delete some documents. Please try again.');
    } finally {
      setBulkPending(false);
      setPendingIds((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n; });
    }
  };

  // ─── Status toggle handler ────────────────────────────────────────────────

  const handleStatusToggle = (doc: Document) => {
    if (doc.state === 'PUBLISHED') {
      setUnpublishTarget(doc);
    } else {
      statusMutation.mutate({ id: doc.id, newState: 'PUBLISHED', prevState: doc.state });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Manage platform documents"
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/documents/upload')}>
            <Upload size={15} />
            Upload Document
          </Button>
        }
      />

      {/* ── Search & filter bar ────────────────────────────────────────────── */}
      <div className="mb-4 rounded-lg bg-white p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            placeholder="Search by document title"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* State */}
          <select
            value={stateFilter}
            onChange={(e) => setFilter('state', e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          >
            <option value="">All States</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNPUBLISHED">Unpublished</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setFilter('category_id', e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          >
            <option value="">All Categories</option>
            {rootCategories.map((root) => (
              <optgroup key={root.id} label={root.name}>
                <option value={root.id}>{root.name}</option>
                {(root.subcategories ?? [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {'  '}› {sub.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>

          {/* Access */}
          <select
            value={accessFilter}
            onChange={(e) => setFilter('access', e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          >
            <option value="">All Access</option>
            <option value="ALL">All Departments</option>
            <option value="RESTRICTED">Restricted</option>
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={14} />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ────────────────────────────────────────────────── */}
      {someSelected && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-lng-blue-20 bg-lng-blue-20 px-4 py-2.5">
          <span className="text-sm font-medium text-lng-grey">
            {selectedCount} document{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              className="text-sm text-lng-grey underline hover:text-lng-blue"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect all
            </button>
            {hasBulkPublishable && (
              <Button
                variant="primary"
                size="sm"
                loading={bulkPending}
                disabled={bulkPending}
                onClick={handleBulkPublish}
              >
                <Send size={13} />
                Publish
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              disabled={bulkPending}
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 size={13} />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={isLoading || filteredDocuments.length === 0}
                  className="h-4 w-4 rounded border-gray-300 text-lng-blue focus:ring-lng-blue"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-lng-grey">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-lng-grey">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-lng-grey">State</th>
              <th className="px-4 py-3 text-left font-semibold text-lng-grey">Access</th>
              <th className="px-4 py-3 text-left font-semibold text-lng-grey whitespace-nowrap">Uploaded At</th>
              <th className="px-4 py-3 text-right font-semibold text-lng-grey">Actions</th>
            </tr>
          </thead>

          {/* Skeleton */}
          {isLoading && (
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          )}

          {/* Error */}
          {isError && (
            <tbody>
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center gap-3 py-20">
                    <AlertCircle size={32} className="text-lng-red" />
                    <p className="text-sm text-lng-grey">Failed to load documents. Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          )}

          {/* Empty */}
          {!isLoading && !isError && filteredDocuments.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={7}>
                  {!documents || documents.length === 0 ? (
                    <div>
                      <EmptyState
                        icon={FileText}
                        title="No documents yet"
                        message="Upload your first document to get started."
                      />
                      <div className="-mt-4 flex justify-center pb-6">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/admin/documents/upload')}
                        >
                          <Upload size={14} />
                          Upload Document
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="No documents found"
                      message="Try adjusting your search or filters."
                    />
                  )}
                </td>
              </tr>
            </tbody>
          )}

          {/* Data rows */}
          {!isLoading && !isError && filteredDocuments.length > 0 && (
            <tbody
              className={`divide-y divide-gray-50 transition-opacity duration-200 ${
                isFetching ? 'opacity-60' : 'opacity-100'
              }`}
            >
              {filteredDocuments.map((doc) => {
                const isPending  = pendingIds.has(doc.id) || bulkPending;
                const isSelected = selectedIds.has(doc.id);
                const catLabel   = getCategoryLabel(doc, allCategories);

                return (
                  <tr
                    key={doc.id}
                    className={`transition-colors hover:bg-lng-blue-20 ${isSelected ? 'bg-lng-blue-20' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(doc.id)}
                        disabled={isPending}
                        className="h-4 w-4 rounded border-gray-300 text-lng-blue focus:ring-lng-blue"
                        aria-label={`Select ${doc.title}`}
                      />
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 max-w-xs">
                      <span
                        className="block truncate font-bold text-lng-grey"
                        title={doc.title}
                      >
                        {doc.title}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <span
                        className="block truncate italic text-lng-grey"
                        title={catLabel}
                      >
                        {catLabel}
                      </span>
                    </td>

                    {/* State */}
                    <td className="px-4 py-3">
                      <StateBadge state={doc.state} />
                    </td>

                    {/* Access */}
                    <td className="px-4 py-3">
                      {doc.access_type === 'ALL' ? (
                        <Badge variant="info">All Departments</Badge>
                      ) : (
                        <Badge variant="neutral">Restricted</Badge>
                      )}
                    </td>

                    {/* Uploaded At */}
                    <td className="px-4 py-3 whitespace-nowrap text-lng-grey">
                      {formatDate(doc.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <button
                          title="Edit"
                          disabled={isPending}
                          onClick={() => navigate(`/admin/documents/${doc.id}`)}
                          className="rounded p-1.5 text-lng-grey transition-colors hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Publish / Unpublish */}
                        <button
                          title={
                            doc.state === 'PUBLISHED' ? 'Unpublish'
                            : doc.state === 'UNPUBLISHED' ? 'Re-publish'
                            : 'Publish'
                          }
                          disabled={isPending}
                          onClick={() => handleStatusToggle(doc)}
                          className={`rounded p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-40 ${
                            doc.state === 'PUBLISHED' ? 'text-lng-grey' : 'text-lng-blue'
                          }`}
                        >
                          {doc.state === 'PUBLISHED'
                            ? <EyeOff size={15} />
                            : <Send size={15} />}
                        </button>

                        {/* Delete */}
                        <button
                          title="Delete"
                          disabled={isPending}
                          onClick={() => setDeleteTarget(doc)}
                          className="rounded p-1.5 text-lng-red transition-colors hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {/* ── Unpublish confirm ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!unpublishTarget}
        onClose={() => !statusMutation.isPending && setUnpublishTarget(null)}
        onConfirm={() =>
          unpublishTarget &&
          statusMutation.mutate({
            id: unpublishTarget.id,
            newState: 'UNPUBLISHED',
            prevState: 'PUBLISHED',
          })
        }
        loading={statusMutation.isPending}
        title="Unpublish Document"
        confirmLabel="Unpublish"
        message={`Are you sure you want to unpublish ${unpublishTarget?.title}? Contractors will no longer be able to view this document.`}
      />

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Delete Document"
        confirmLabel="Delete"
        message={`Are you sure you want to delete ${deleteTarget?.title}? This action cannot be undone.`}
      />

      {/* ── Bulk delete confirm ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showBulkDelete}
        onClose={() => !bulkPending && setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        loading={bulkPending}
        title="Delete Documents"
        confirmLabel="Delete"
        message={`Delete ${selectedCount} selected document${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
      />
    </>
  );
}
