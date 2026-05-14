import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, LayoutGrid } from 'lucide-react';

import { useCategoryTree } from '../../../hooks/admin/useCategoryTree';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import Pagination from '../../../components/ui/Pagination';

import CategoryCard from './components/CategoryCard';
import CategorySearch from './components/CategorySearch';
import CategorySkeleton from './components/CategorySkeleton';
import DeleteCategoryDialog from './components/DeleteCategoryDialog';

export default function CategoriesListPage() {
  const navigate = useNavigate();
  const {
    search,
    setSearch,
    debouncedSearch,
    isLoading,
    isError,
    refetch,
    data,
    filtered,
    meta,
    setPage,
    toggleExpand,
    isExpanded,
    deleteTarget,
    setDeleteTarget,
    deleteMutation,
  } = useCategoryTree();

  useEffect(() => {
    document.title = 'Categories — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

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

      <CategorySearch value={search} onChange={setSearch} />

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <CategorySkeleton key={i} />)}
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
      {!isLoading && !isError && data.length === 0 && !debouncedSearch && (
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
      {!isLoading && !isError && data.length === 0 && !!debouncedSearch && (
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
            const hasSubs = cat.subcategories.length > 0;
            const expanded = isExpanded(cat.id);
            const isDeleting = deleteMutation.isPending && deleteTarget?.id === cat.id;

            return (
              <div key={cat.id}>
                <CategoryCard
                  category={cat}
                  isRoot={true}
                  expanded={expanded}
                  onToggleExpand={() => toggleExpand(cat.id)}
                  hasSubcategories={hasSubs}
                  subcategoriesCount={cat.subcategories.length}
                  searchQuery={debouncedSearch}
                  isDeleting={isDeleting}
                  onDelete={() => setDeleteTarget({ id: cat.id, name: cat.name, isRoot: true })}
                />

                {/* Subcategories — animated expand / collapse */}
                <div
                  style={{
                    maxHeight: expanded ? '9999px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  {hasSubs && (
                    <div className="ml-6 sm:ml-12 mt-2 space-y-2">
                      {cat.subcategories.map((sub) => {
                        const isSubDeleting = deleteMutation.isPending && deleteTarget?.id === sub.id;
                        return (
                          <CategoryCard
                            key={sub.id}
                            category={sub}
                            isRoot={false}
                            searchQuery={debouncedSearch}
                            isDeleting={isSubDeleting}
                            onDelete={() => setDeleteTarget({ id: sub.id, name: sub.name, isRoot: false })}
                          />
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

      {/* Pagination */}
      {!isLoading && !isError && meta && meta.total > 0 && (
        <div className="mt-6">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}

      <DeleteCategoryDialog
        target={deleteTarget}
        isLoading={deleteMutation.isPending}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, isRoot: deleteTarget.isRoot })}
      />
    </>
  );
}
