import { useState, useEffect } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCategory, getCategories, createCategory, updateCategory } from '../../api/categories';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    type: z.enum(['root', 'subcategory']),
    parent_category_id: z.string().nullable(),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long'),
    sort_order: z
      .number({ error: 'Sort order must be a number' })
      .int('Sort order must be a whole number')
      .min(1, 'Sort order must be at least 1'),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'subcategory' && !data.parent_category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a parent category',
        path: ['parent_category_id'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FormSkeleton() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          {bar('h-6 w-48')}
          {bar('h-4 w-64')}
        </div>
        {bar('h-9 w-44 rounded')}
      </div>
      <div className="max-w-2xl space-y-5 rounded-lg bg-white p-8 shadow-sm">
        {bar('h-4 w-32')}
        <div className="border-b border-gray-200 pb-1" />
        {bar('h-9 w-56 rounded')}
        {bar('h-10 w-full')}
        {bar('h-10 w-full')}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
          {bar('h-9 w-20 rounded')}
          {bar('h-9 w-36 rounded')}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoryFormPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const isEdit      = !!id;

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = isEdit
      ? 'Edit Category — LNG Canada'
      : 'Create Category — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, [isEdit]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const {
    data:    category,
    isLoading: categoryLoading,
    isError:   categoryError,
  } = useQuery({
    queryKey: ['category', id],
    queryFn:  () => getCategory(id!),
    enabled:  isEdit,
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  getCategories,
  });

  // Root categories only for parent dropdown; exclude self in edit mode
  const rootCategories = allCategories.filter(
    (c) => c.parent_category_id === null && c.id !== id,
  );

  // ─── Form ─────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: { type: 'root', parent_category_id: null, name: '', sort_order: 1 },
    mode:          'onSubmit',
  });

  // Pre-fill form when edit data arrives
  useEffect(() => {
    if (category) {
      reset({
        type:               category.parent_category_id ? 'subcategory' : 'root',
        parent_category_id: category.parent_category_id,
        name:               category.name,
        sort_order:         category.sort_order,
      });
    }
  }, [category, reset]);

  // ─── Controlled fields ────────────────────────────────────────────────────

  const { field: typeField } = useController({ name: 'type', control });

  const {
    field:      parentField,
    fieldState: { error: parentError },
  } = useController({ name: 'parent_category_id', control, defaultValue: null });

  const watchType = typeField.value;

  const handleTypeChange = (t: 'root' | 'subcategory') => {
    typeField.onChange(t);
    if (t === 'root') parentField.onChange(null);
  };

  // ─── Unsaved changes blocker ──────────────────────────────────────────────

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !submitted &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (vals: FormValues) =>
      createCategory({
        name:               vals.name,
        sort_order:         vals.sort_order,
        parent_category_id: vals.type === 'subcategory' ? vals.parent_category_id : null,
      }),
    onSuccess: (_, vals) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setSubmitted(true);
      toast.success(
        vals.type === 'subcategory'
          ? 'Subcategory created successfully'
          : 'Category created successfully',
      );
      navigate('/admin/categories');
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('name', { message: 'A category with this name already exists.' });
      } else if (status === 400) {
        setError('parent_category_id', { message: 'Subcategories cannot have children.' });
      } else {
        toast.error('Failed to create category. Please try again.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vals: FormValues) =>
      updateCategory(id!, { name: vals.name, sort_order: vals.sort_order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', id] });
      setSubmitted(true);
      toast.success('Category updated successfully');
      navigate('/admin/categories');
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('name', { message: 'A category with this name already exists.' });
      } else {
        toast.error('Failed to update category. Please try again.');
      }
    },
  });

  const mutation  = isEdit ? updateMutation : createMutation;
  const isPending = mutation.isPending;

  function onSubmit(data: FormValues) {
    mutation.mutate(data);
  }

  // ─── Loading / error guards (edit mode) ──────────────────────────────────

  if (isEdit && categoryLoading) return <FormSkeleton />;

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

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

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
              {isEdit ? <Save size={14} /> : <Plus size={14} />}
              {isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>

      {/* Unsaved changes dialog */}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Discard Changes"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Keep Editing
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              Discard
            </Button>
          </>
        }
      >
        <p className="text-sm text-lng-grey">
          You have unsaved changes. Are you sure you want to leave?
        </p>
      </Modal>
    </>
  );
}
