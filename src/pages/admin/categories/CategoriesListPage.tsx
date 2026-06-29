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
    document.title = 'Categories LNG Canada';
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
            Create category
          </Button>
        }
      />

      <CategorySearch value={search} onChange={setSearch} />

      {/* Loading skeletons */}
      {isLoading && <CategorySkeleton />}

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

      {/* Category tree — flat list in a white card */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {filtered.map((cat, catIdx) => {
            const hasSubs = cat.subcategories.length > 0;
            const expanded = isExpanded(cat.id);
            const isDeleting = deleteMutation.isPending && deleteTarget?.id === cat.id;

            return (
              <div key={cat.id} className={catIdx > 0 ? 'border-t border-gray-100' : ''}>
                {/* Root category row */}
                <CategoryCard
                  category={cat}
                  level={0}
                  expanded={expanded}
                  onToggleExpand={() => toggleExpand(cat.id)}
                  hasChildren={hasSubs}
                  childrenCount={cat.subcategories.length}
                  searchQuery={debouncedSearch}
                  isDeleting={isDeleting}
                  onDelete={() => setDeleteTarget({ id: cat.id, name: cat.name, level: 'root' })}
                />

                {/* Subcategories — animated expand / collapse */}
                <div
                  style={{
                    maxHeight: expanded ? '9999px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                  }}
                >
                  {hasSubs && (
                    <div className="border-t border-gray-100 border-l-2 border-l-gray-200 ml-10">
                      {cat.subcategories.map((sub) => {
                        const isSubDeleting = deleteMutation.isPending && deleteTarget?.id === sub.id;
                        const hasChildren = (sub.subcategories ?? []).length > 0;
                        const subExpanded = isExpanded(sub.id);

                        return (
                          <div key={sub.id}>
                            <CategoryCard
                              category={sub}
                              level={1}
                              expanded={subExpanded}
                              onToggleExpand={() => toggleExpand(sub.id)}
                              hasChildren={hasChildren}
                              childrenCount={(sub.subcategories ?? []).length}
                              searchQuery={debouncedSearch}
                              isDeleting={isSubDeleting}
                              onDelete={() => setDeleteTarget({ id: sub.id, name: sub.name, level: 'sub' })}
                            />

                            {/* Child categories */}
                            <div
                              style={{
                                maxHeight: subExpanded ? '9999px' : '0',
                                overflow: 'hidden',
                                transition: 'max-height 0.3s ease',
                              }}
                            >
                              {hasChildren && (
                                <div className="border-t border-gray-100 border-l-2 border-l-gray-200 ml-10">
                                  {(sub.subcategories ?? []).map((child) => {
                                    const isChildDeleting = deleteMutation.isPending && deleteTarget?.id === child.id;
                                    return (
                                      <CategoryCard
                                        key={child.id}
                                        category={child}
                                        level={2}
                                        searchQuery={debouncedSearch}
                                        isDeleting={isChildDeleting}
                                        onDelete={() => setDeleteTarget({ id: child.id, name: child.name, level: 'child' })}
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
        onConfirm={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, level: deleteTarget.level })}
      />
    </>
  );
}
