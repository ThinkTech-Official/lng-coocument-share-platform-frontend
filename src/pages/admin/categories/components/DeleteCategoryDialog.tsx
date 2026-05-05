import ConfirmDialog from '../../../../components/ui/ConfirmDialog';

interface DeleteTarget {
  id: string;
  name: string;
  isRoot: boolean;
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
  return (
    <ConfirmDialog
      open={!!target}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={isLoading}
      title={target?.isRoot ? 'Delete Category' : 'Delete Subcategory'}
      confirmLabel="Delete"
      message={
        target?.isRoot
          ? `Are you sure you want to delete ${target.name}? All subcategories will also be deleted. Documents and videos in this category will become uncategorized.`
          : `Are you sure you want to delete ${target?.name}? Documents and videos in this subcategory will become uncategorized.`
      }
    />
  );
}
