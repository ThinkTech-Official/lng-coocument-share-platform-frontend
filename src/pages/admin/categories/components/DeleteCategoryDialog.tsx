import ConfirmDialog from '../../../../components/ui/ConfirmDialog';

interface DeleteTarget {
  id: string;
  name: string;
  level: 'root' | 'sub' | 'child';
}

interface DeleteCategoryDialogProps {
  target: DeleteTarget | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function DeleteCategoryDialog({
  target,
  onClose,
  onConfirm,
  isLoading,
}: DeleteCategoryDialogProps) {
  const title =
    target?.level === 'root'
      ? 'Delete Category'
      : target?.level === 'sub'
      ? 'Delete Subcategory'
      : 'Delete Child Subcategory';

  const message =
    target?.level === 'root'
      ? `Are you sure you want to delete ${target.name}? All subcategories and child subcategories will also be deleted. Documents and videos in this category will become uncategorized.`
      : target?.level === 'sub'
      ? `Are you sure you want to delete ${target?.name}? All child subcategories will also be deleted. Documents and videos in this subcategory will become uncategorized.`
      : `Are you sure you want to delete ${target?.name}? Documents and videos in this child subcategory will become uncategorized.`;

  return (
    <ConfirmDialog
      open={!!target}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={isLoading}
      title={title}
      confirmLabel="Delete"
      message={message}
    />
  );
}
