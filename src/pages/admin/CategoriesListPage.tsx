import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, ChevronDown, ChevronRight,
  CornerDownRight, AlertCircle, LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Category } from '../../types';
import { getCategories, deleteCategory } from '../../api/categories';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DeleteTarget {
  id: string;
  name: string;
  isRoot: boolean;
}

// ─── Highlight helper ──────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-lng-yellow text-lng-grey">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <div>
      <div className="rounded-lg border-l-4 border-lng-blue bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="shrink-0">{bar('h-5 w-5')}</div>
          <div className="flex flex-1 items-center gap-3">
            {bar('h-5 w-48')}
            {bar('h-4 w-20 rounded-full')}
            {bar('h-3 w-28')}
          </div>
          <div className="flex gap-2">
            {bar('h-7 w-14 rounded')}
            {bar('h-7 w-14 rounded')}
          </div>
        </div>
      </div>
      <div className="ml-12 mt-2 animate-pulse rounded bg-lng-blue-20 px-4 py-3">
        <div className="flex items-center gap-3">
          {bar('h-4 w-4')}
          {bar('h-4 w-36')}
          {bar('h-3 w-16 rounded-full')}
        </div>
      </div>
    </div>
  );
}

// ─── Sorted category type ──────────────────────────────────────────────────────

type SortedCategory = Omit<Category, 'subcategories'> & { subcategories: Category[] };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesListPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    document.title = 'Categories — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // Debounce search 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn:  getCategories,
  });

  // All categories start expanded; reset whenever data arrives / is refetched
  useEffect(() => {
    if (data) {
      setExpandedIds(new Set(data.map((c) => c.id)));
    }
  }, [data]);

  // ─── Delete mutation ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; isRoot: boolean }) => deleteCategory(id),
    onSuccess: (_, { isRoot }) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(isRoot ? 'Category and subcategories deleted' : 'Subcategory deleted');
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('Failed to delete. Please try again.');
      setDeleteTarget(null);
    },
  });

  // ─── Derived data ───────────────────────────────────────────────────────────

  const sortedData = useMemo<SortedCategory[]>(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => ({
        ...cat,
        subcategories: [...(cat.subcategories ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      }));
  }, [data]);

  const q = debouncedSearch.toLowerCase().trim();

  const filtered = useMemo<SortedCategory[]>(() => {
    if (!q) return sortedData;
    return sortedData.filter((cat) => {
      const nameMatch = cat.name.toLowerCase().includes(q);
      const subMatch  = cat.subcategories.some((s) => s.name.toLowerCase().includes(q));
      return nameMatch || subMatch;
    });
  }, [sortedData, q]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // When search is active force-expand all matched roots
  const isExpanded = (id: string) => (q ? true : expandedIds.has(id));

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Manage document and video categories"
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/categories/create')}>
            <Plus size={15} />
            Create Category
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
          placeholder="Search categories"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
        />
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <AlertCircle size={32} className="text-lng-red" />
          <p className="text-sm text-lng-grey">Failed to load categories. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Empty — no categories exist */}
      {!isLoading && !isError && data?.length === 0 && (
        <div>
          <EmptyState
            icon={LayoutGrid}
            title="No categories yet"
            message="Create your first category to organise documents and videos."
          />
          <div className="-mt-4 flex justify-center">
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/categories/create')}>
              <Plus size={14} />
              Create Category
            </Button>
          </div>
        </div>
      )}

      {/* Empty — search returned nothing */}
      {!isLoading && !isError && data && data.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={LayoutGrid}
          title="No categories found"
          message="Try a different search term."
        />
      )}

      {/* Category tree */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((cat) => {
            const hasSubs    = cat.subcategories.length > 0;
            const expanded   = isExpanded(cat.id);
            const isDeleting = deleteMutation.isPending && deleteTarget?.id === cat.id;

            return (
              <div key={cat.id}>
                {/* Root category card */}
                <div className="rounded-lg border-l-4 border-lng-blue bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    {/* Expand / collapse toggle */}
                    <div className="flex w-5 shrink-0 items-center justify-center">
                      {hasSubs ? (
                        <button
                          onClick={() => toggleExpand(cat.id)}
                          className="flex items-center justify-center text-lng-grey transition-colors hover:text-lng-blue"
                          aria-label={expanded ? 'Collapse subcategories' : 'Expand subcategories'}
                        >
                          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      ) : (
                        <span className="w-5" />
                      )}
                    </div>

                    {/* Name + badges */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="truncate font-bold text-lng-grey">
                        <Highlight text={cat.name} query={q} />
                      </span>
                      <Badge variant="neutral">Order: {cat.sort_order}</Badge>
                      <span className="shrink-0 text-xs text-lng-grey opacity-60">
                        {hasSubs
                          ? `${cat.subcategories.length} subcategor${cat.subcategories.length === 1 ? 'y' : 'ies'}`
                          : 'No subcategories'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/categories/${cat.id}`)}
                        disabled={isDeleting}
                      >
                        <Pencil size={13} />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={isDeleting}
                        disabled={isDeleting}
                        onClick={() =>
                          setDeleteTarget({ id: cat.id, name: cat.name, isRoot: true })
                        }
                      >
                        <Trash2 size={13} />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Subcategories — animated expand / collapse */}
                <div
                  style={{
                    maxHeight: expanded ? '9999px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  {hasSubs && (
                    <div className="ml-12 mt-2 space-y-2">
                      {cat.subcategories.map((sub) => {
                        const isSubDeleting =
                          deleteMutation.isPending && deleteTarget?.id === sub.id;
                        return (
                          <div
                            key={sub.id}
                            className="rounded border-l-2 border-lng-blue-40 bg-lng-blue-20 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              {/* Hierarchy indicator */}
                              <CornerDownRight
                                size={15}
                                className="shrink-0 text-lng-grey opacity-40"
                              />

                              {/* Name + badge */}
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <span className="truncate text-sm text-lng-grey">
                                  <Highlight text={sub.name} query={q} />
                                </span>
                                <Badge variant="neutral">Order: {sub.sort_order}</Badge>
                              </div>

                              {/* Actions */}
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/admin/categories/${sub.id}`)}
                                  disabled={isSubDeleting}
                                >
                                  <Pencil size={13} />
                                  Edit
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  loading={isSubDeleting}
                                  disabled={isSubDeleting}
                                  onClick={() =>
                                    setDeleteTarget({
                                      id: sub.id,
                                      name: sub.name,
                                      isRoot: false,
                                    })
                                  }
                                >
                                  <Trash2 size={13} />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          deleteMutation.mutate({ id: deleteTarget.id, isRoot: deleteTarget.isRoot })
        }
        loading={deleteMutation.isPending}
        title={deleteTarget?.isRoot ? 'Delete Category' : 'Delete Subcategory'}
        confirmLabel="Delete"
        message={
          deleteTarget?.isRoot
            ? `Are you sure you want to delete ${deleteTarget.name}? All subcategories will also be deleted. Documents and videos in this category will become uncategorized.`
            : `Are you sure you want to delete ${deleteTarget?.name}? Documents and videos in this subcategory will become uncategorized.`
        }
      />
    </>
  );
}
