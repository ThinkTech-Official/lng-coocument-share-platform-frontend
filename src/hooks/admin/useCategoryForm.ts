import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getCategory, getCategoriesPublic, createCategory, updateCategory } from '../../api/categories';
import { categorySchema } from '../../constants/schemas';
import { type CategoryFormValues } from '../../constants/schemas';

export function useCategoryForm(id?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  useEffect(() => {
    document.title = isEdit
      ? 'Edit Category LNG Canada'
      : 'Create Category LNG Canada';
    return () => {
      document.title = 'LNG Canada';
    };
  }, [isEdit]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const {
    data: category,
    isLoading: categoryLoading,
    isError: categoryError,
  } = useQuery({
    queryKey: ['category', id],
    queryFn: () => getCategory(id!),
    enabled: isEdit,
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories-public'],
    queryFn: getCategoriesPublic,
  });

  // Root categories only for parent dropdown; exclude self in edit mode
  const rootCategories = useMemo(() => {
    return allCategories
      .filter((c) => c.parent_category_id === null && c.id !== id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allCategories, id]);

  // ─── Form ─────────────────────────────────────────────────────────────────

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: 'root', parent_category_id: null, name: '', sort_order: 1 },
    mode: 'onSubmit',
  });

  const { reset, control, setError, handleSubmit } = form;

  // Pre-fill form when edit data arrives
  useEffect(() => {
    if (category && allCategories.length > 0) {
      let resolvedType: 'root' | 'subcategory' | 'childSubcategory' = 'root';
      if (category.parent_category_id) {
        const isParentRoot = allCategories.some((c) => c.id === category.parent_category_id);
        resolvedType = isParentRoot ? 'subcategory' : 'childSubcategory';
      }

      reset({
        type: resolvedType,
        parent_category_id: category.parent_category_id,
        name: category.name,
        sort_order: category.sort_order,
      });
    }
  }, [category, allCategories, reset]);

  // ─── Controlled fields ────────────────────────────────────────────────────

  const { field: typeField } = useController({ name: 'type', control });

  const {
    field: parentField,
    fieldState: { error: parentError },
  } = useController({ name: 'parent_category_id', control, defaultValue: null });

  const watchType = typeField.value;

  const handleTypeChange = (t: 'root' | 'subcategory' | 'childSubcategory') => {
    typeField.onChange(t);
    parentField.onChange(null);
  };

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (vals: CategoryFormValues) =>
      createCategory({
        name: vals.name,
        sort_order: vals.sort_order,
        parent_category_id: vals.type !== 'root' ? vals.parent_category_id : null,
      }),
    onSuccess: (_, vals) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(
        vals.type === 'root'
          ? 'Category created successfully'
          : 'Subcategory created successfully'
      );
      navigate('/admin/categories');
    },
    onError: (error: unknown) => {
      const resp = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
      const status = resp?.status;
      const message = resp?.data?.message;

      if (status === 409) {
        toast.error(message ?? 'A category with this name already exists.');
        setError('name', { message: message ?? 'A category with this name already exists.' });
      } else if (status === 400) {
        toast.error(message ?? 'Subcategories cannot have children.');
        setError('parent_category_id', { message: message ?? 'Subcategories cannot have children.' });
      } else {
        toast.error(message ?? 'Failed to create category. Please try again.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vals: CategoryFormValues) =>
      updateCategory(id!, { name: vals.name, sort_order: vals.sort_order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', id] });
      toast.success('Category updated successfully');
      navigate('/admin/categories');
    },
    onError: (error: unknown) => {
      const resp = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
      const status = resp?.status;
      const message = resp?.data?.message;

      if (status === 409) {
        toast.error(message ?? 'A category with this name already exists.');
        setError('name', { message: message ?? 'A category with this name already exists.' });
      } else {
        toast.error(message ?? 'Failed to update category. Please try again.');
      }
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;
  const isPending = mutation.isPending;

  const onSubmit = handleSubmit((data: CategoryFormValues) => {
    mutation.mutate(data);
  });

  return {
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
  };
}
