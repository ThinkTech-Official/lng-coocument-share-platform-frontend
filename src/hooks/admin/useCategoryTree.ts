import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { type Category } from '../../types';
import { getCategories, deleteCategory } from '../../api/categories';

export type SortedCategory = Omit<Category, 'subcategories'> & { subcategories: Category[] };

interface DeleteTarget {
  id: string;
  name: string;
  isRoot: boolean;
}

export function useCategoryTree() {
  const queryClient = useQueryClient();

  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [page, setPage]                 = useState(1);
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Debounce search 300 ms; reset page on search change
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Query ──────────────────────────────────────────────────────────────────

  const { data: rawData, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories', { page, search: debouncedSearch }],
    queryFn:  () => getCategories({ page, limit: 20, search: debouncedSearch || undefined }),
  });

  const categories = rawData?.data ?? [];
  const meta       = rawData?.meta;

  // All categories start expanded; reset whenever page data changes
  useEffect(() => {
    if (categories.length) {
      setExpandedIds(new Set(categories.map((c) => c.id)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData]);

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
    return [...categories]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => ({
        ...cat,
        subcategories: [...(cat.subcategories ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      }));
  }, [categories]);

  const q = debouncedSearch.toLowerCase().trim();

  // Search is server-side — filtered is just the sorted current page
  const filtered = useMemo<SortedCategory[]>(() => sortedData, [sortedData]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // When search is active force-expand all matched roots
  const isExpanded = (id: string) => (q ? true : expandedIds.has(id));

  return {
    search,
    setSearch,
    debouncedSearch: q,
    isLoading,
    isError,
    refetch,
    data: categories,
    filtered,
    meta,
    page,
    setPage,
    toggleExpand,
    isExpanded,
    deleteTarget,
    setDeleteTarget,
    deleteMutation,
  };
}
