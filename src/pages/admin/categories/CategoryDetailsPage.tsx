import { useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, AlertCircle, Info } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import { CategoryFormSkeleton } from '../../../components/admin/categories/CategoryFormSkeleton';
import { useCategoryForm } from '../../../hooks/admin/useCategoryForm';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const {
    isEdit,
    category,
    categoryLoading,
    categoryError,
    rootCategories,
    form,
    watchType,
    handleTypeChange,
    parentField,
    parentError,
    isPending,
    onSubmit,
    navigate,
  } = useCategoryForm(id);

  const { register, formState: { errors, isDirty } } = form;

  // ─── Loading / error guards (edit mode) ──────────────────────────────────

  if (isEdit && categoryLoading) return <CategoryFormSkeleton />;

  if (isEdit && (categoryError || !category)) {
    return (
      <>
        <PageHeader
          title="Edit Category"
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/categories')}>
              <ArrowLeft size={14} />
              Back to Categories
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <AlertCircle size={40} className="text-lng-red" />
          <h2 className="text-base font-semibold text-lng-grey">Category Not Found</h2>
          <p className="text-sm text-gray-500">This category could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate('/admin/categories')}>
            <ArrowLeft size={14} />
            Back to Categories
          </Button>
        </div>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const title    = isEdit ? 'Edit Category' : 'Create Category';
  const subtitle = isEdit
    ? (category?.name ?? '')
    : 'Add a new category or subcategory';

  const editType = category
    ? (category.parent_category_id ? 'subcategory' : 'root')
    : null;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/categories')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Categories
          </Button>
        }
      />

      <div className="max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        {/* Card heading */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-lng-grey">
            {isEdit ? 'Edit Details' : 'Category Details'}
          </h2>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-5">

          {/* ── Category Type ──────────────────────────────────────────────── */}
          {!isEdit ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-lng-grey">Category Type</span>
              <div className="inline-flex overflow-hidden rounded border border-gray-300">
                {(['root', 'subcategory'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleTypeChange(t)}
                    className={`
                      px-5 py-2 text-sm font-medium transition-colors
                      ${watchType === t
                        ? 'bg-lng-blue text-white'
                        : 'bg-white text-lng-grey hover:bg-gray-50'}
                    `}
                  >
                    {t === 'root' ? 'Root Category' : 'Subcategory'}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-lng-grey">Category Type:</span>
              <Badge variant="neutral">
                {editType === 'subcategory' ? 'Subcategory' : 'Root Category'}
              </Badge>
            </div>
          )}

          {/* ── Parent Category ─────────────────────────────────────────────── */}
          <div
            style={{
              maxHeight:  watchType === 'subcategory' ? '300px' : '0',
              opacity:    watchType === 'subcategory' ? 1 : 0,
              overflow:   'hidden',
              transition: 'max-height 0.2s ease, opacity 0.2s ease',
            }}
          >
            <div className="flex flex-col gap-1">
              <label
                htmlFor="parent_category_id"
                className="text-sm font-medium text-lng-grey"
              >
                Parent Category
              </label>
              <select
                id="parent_category_id"
                ref={parentField.ref}
                name={parentField.name}
                value={parentField.value ?? ''}
                onChange={(e) => parentField.onChange(e.target.value || null)}
                onBlur={parentField.onBlur}
                disabled={isEdit || isPending}
                className={`
                  w-full rounded border px-3 py-2 text-sm text-lng-grey
                  focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                  disabled:bg-gray-50 disabled:text-gray-400
                  ${parentError
                    ? 'border-lng-red focus:border-lng-red focus:ring-lng-red'
                    : 'border-gray-300'}
                `}
              >
                <option value="">Select a parent category</option>
                {rootCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {parentError && (
                <p className="text-xs text-lng-red">{parentError.message}</p>
              )}
              <div className="mt-1 flex items-center gap-1.5 text-xs text-lng-blue">
                <Info size={12} />
                <span>Subcategories cannot have their own subcategories.</span>
              </div>
            </div>
          </div>

          {/* ── Category Name ───────────────────────────────────────────────── */}
          <Input
            label="Category Name"
            type="text"
            placeholder="Enter category name"
            disabled={isPending}
            error={errors.name?.message}
            {...register('name')}
          />

          {/* ── Sort Order ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1">
            <Input
              label="Sort Order"
              type="number"
              placeholder="1"
              min={1}
              step={1}
              disabled={isPending}
              error={errors.sort_order?.message}
              onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
              }}
              {...register('sort_order', { valueAsNumber: true })}
            />
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-lng-blue">
              <Info size={12} />
              <span>Lower numbers appear first on the homepage.</span>
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => navigate('/admin/categories')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              disabled={isPending || (isEdit && !isDirty)}
            >
              {!isPending && (isEdit ? <Save size={14} /> : <Plus size={14} />)}
              {isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
