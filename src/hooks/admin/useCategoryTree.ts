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
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Debounce search 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch } = useQuery<Category[]>({
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

  return {
    search,
    setSearch,
    debouncedSearch: q,
    isLoading,
    isError,
    refetch,
    data,
    filtered,
    toggleExpand,
    isExpanded,
    deleteTarget,
    setDeleteTarget,
    deleteMutation,
  };
}
