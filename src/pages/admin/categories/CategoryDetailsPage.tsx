import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, AlertCircle, Info, FolderPlus, GitBranch } from 'lucide-react';
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
    allCategories,
    form,
    watchType,
    handleTypeChange,
    parentField,
    parentError,
    isPending,
    onSubmit,
    navigate,
  } = useCategoryForm(id);

  const [selectedRootId, setSelectedRootId] = useState<string>('');

  // Find the root category ID for level 2 category edit mode
  useEffect(() => {
    if (watchType === 'childSubcategory' && parentField.value && allCategories.length > 0) {
      for (const root of allCategories) {
        const sub = (root.subcategories ?? []).find((s) => s.id === parentField.value);
        if (sub) {
          setSelectedRootId(root.id);
          break;
        }
      }
    }
  }, [watchType, parentField.value, allCategories]);

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

      <div className="max-w-2xl rounded-lg bg-white p-3 sm:p-8 shadow-sm">
        {/* Card heading */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-lng-grey">
            {isEdit ? 'Edit Details' : 'Category Details'}
          </h2>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">

          {/* ── Category Type ──────────────────────────────────────────────── */}
          {!isEdit ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-lng-grey">Category Type</span>

              {/* ── Arrow-style tab selector ── */}
              <div className="inline-flex items-center gap-1 rounded bg-gray-50 border border-gray-200 w-fit">
                {(['root', 'subcategory', 'childSubcategory'] as const).map((t, idx) => {
                  const isActive = watchType === t;
                  let activeStyle = '';
                  if (t === 'root')   activeStyle = 'bg-lng-blue text-white shadow-sm';
                  if (t === 'subcategory') activeStyle = 'bg-[#0070c0] text-white shadow-sm';
                  if (t === 'childSubcategory') activeStyle = 'bg-[#009beb] text-white shadow-sm';

                  return (
                    <div key={t} className="flex items-center">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          handleTypeChange(t);
                          setSelectedRootId('');
                        }}
                        className={`
                          flex items-center gap-2 rounded px-2 sm:px-4 py-2 text-[9px] sm:text-xs font-semibold uppercase tracking-wider transition-all duration-200
                          ${isActive
                            ? activeStyle
                            : 'bg-transparent text-lng-grey hover:bg-gray-100'}
                        `}
                      >
                        {t === 'root'   && 'Root Category'}
                        {t === 'subcategory' && 'Subcategory'}
                        {t === 'childSubcategory' && 'Child Subcategory'}
                      </button>
                      {idx < 2 && (
                        <span className="text-gray-500 font-bold select-none text-xs px-1">➔</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Quick-action buttons (root tab) ── */}
              {watchType === 'root' && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => { handleTypeChange('subcategory'); setSelectedRootId(''); }}
                    className="inline-flex items-center gap-1.5 rounded bg-[#0070c0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#005fa3] disabled:opacity-50"
                  >
                    <FolderPlus size={13} />
                    Add Subcategory
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => { handleTypeChange('childSubcategory'); setSelectedRootId(''); }}
                    className="inline-flex items-center gap-1.5 rounded bg-[#009beb] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#007ec2] disabled:opacity-50"
                  >
                    <GitBranch size={13} />
                    Add Child Subcategory
                  </button>
                </div>
              )}

              {/* ── Back / switch buttons (subcategory tabs) ── */}
              {(watchType === 'subcategory' || watchType === 'childSubcategory') && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => { handleTypeChange('root'); setSelectedRootId(''); }}
                    className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ArrowLeft size={12} />
                    Back to Category
                  </button>
                  {watchType === 'subcategory' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => { handleTypeChange('childSubcategory'); setSelectedRootId(''); }}
                      className="inline-flex items-center gap-1.5 rounded bg-[#009beb] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#007ec2] disabled:opacity-50"
                    >
                      <GitBranch size={13} />
                      Add Child Subcategory
                    </button>
                  )}
                  {watchType === 'childSubcategory' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => { handleTypeChange('subcategory'); setSelectedRootId(''); }}
                      className="inline-flex items-center gap-1.5 rounded bg-[#0070c0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#005fa3] disabled:opacity-50"
                    >
                      <FolderPlus size={13} />
                      Add Subcategory
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-lng-grey">Category Type:</span>
              <Badge variant="neutral">
                {watchType === 'childSubcategory' ? 'Child Subcategory' : watchType === 'subcategory' ? 'Subcategory' : 'Category'}
              </Badge>
            </div>
          )}

          {/* ── Level 1 Parent Category Select ──────────────────────────────── */}
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
                htmlFor="parent_category_id_l1"
                className="text-sm font-medium text-lng-grey"
              >
                Parent Category <span className="text-lng-red">*</span>
              </label>
              <select
                id="parent_category_id_l1"
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
                  ${parentError && watchType === 'subcategory'
                    ? 'border-lng-red focus:border-lng-red focus:ring-lng-red'
                    : 'border-gray-300'}
                `}
              >
                <option value="">Select a parent category</option>
                {rootCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {parentError && watchType === 'subcategory' && (
                <p className="text-xs text-lng-red">{parentError.message}</p>
              )}
              <div className="mt-1 flex items-center gap-1.5 text-xs text-lng-blue">
                <Info size={12} />
                <span>Select a root category as the parent.</span>
              </div>
            </div>
          </div>

          {/* ── Level 2 Parent Category Selects ─────────────────────────────── */}
          <div
            style={{
              maxHeight:  watchType === 'childSubcategory' ? '300px' : '0',
              opacity:    watchType === 'childSubcategory' ? 1 : 0,
              overflow:   'hidden',
              transition: 'max-height 0.2s ease, opacity 0.2s ease',
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Dropdown 1: Root Category */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="root_category_select"
                  className="text-sm font-medium text-lng-grey"
                >
                  Root Category <span className="text-lng-red">*</span>
                </label>
                <select
                  id="root_category_select"
                  value={selectedRootId}
                  onChange={(e) => {
                    setSelectedRootId(e.target.value);
                    parentField.onChange(null); // Reset child selection on root change
                  }}
                  disabled={isEdit || isPending}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select root category</option>
                  {rootCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Subcategory */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="parent_category_id_l2"
                  className="text-sm font-medium text-lng-grey"
                >
                  Subcategory <span className="text-lng-red">*</span>
                </label>
                <select
                  id="parent_category_id_l2"
                  ref={parentField.ref}
                  name={parentField.name}
                  value={parentField.value ?? ''}
                  onChange={(e) => parentField.onChange(e.target.value || null)}
                  onBlur={parentField.onBlur}
                  disabled={isEdit || isPending || !selectedRootId}
                  className={`
                    w-full rounded border px-3 py-2 text-sm text-lng-grey
                    focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                    disabled:bg-gray-50 disabled:text-gray-400
                    ${parentError && watchType === 'childSubcategory'
                      ? 'border-lng-red focus:border-lng-red focus:ring-lng-red'
                      : 'border-gray-300'}
                  `}
                >
                  <option value="">Select subcategory</option>
                  {selectedRootId &&
                    (rootCategories.find((r) => r.id === selectedRootId)?.subcategories ?? [])
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                </select>
                {parentError && watchType === 'childSubcategory' && (
                  <p className="text-xs text-lng-red">{parentError.message}</p>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-lng-blue">
              <Info size={12} />
              <span>First pick the parent category, then select the subcategory under it.</span>
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
              max={999}
              step={1}
              disabled={isPending}
              error={errors.sort_order?.message}
              onKeyDown={(e) => {
                const target = e.target as HTMLInputElement;
                if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                  e.preventDefault();
                  return;
                }
                if (
                  target.value.length >= 3 &&
                  !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) &&
                  !e.ctrlKey &&
                  !e.metaKey
                ) {
                  e.preventDefault();
                }
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
