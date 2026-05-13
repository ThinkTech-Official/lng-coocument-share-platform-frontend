import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, ChevronRight, CornerDownRight, Pencil, Trash2 
} from 'lucide-react';
import { type Category } from '../../../../types';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Highlight from '../../../../components/ui/Highlight';

interface CategoryCardProps {
  category: Category;
  isRoot: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  hasSubcategories?: boolean;
  subcategoriesCount?: number;
  onDelete: () => void;
  isDeleting: boolean;
  searchQuery: string;
}

export default function CategoryCard({
  category,
  isRoot,
  expanded,
  onToggleExpand,
  hasSubcategories,
  subcategoriesCount,
  onDelete,
  isDeleting,
  searchQuery,
}: CategoryCardProps) {
  const navigate = useNavigate();

  if (isRoot) {
    return (
      <div className="rounded-lg border-l-4 border-lng-blue bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Expand / collapse toggle */}
            {hasSubcategories && (
          <div className="flex w-5 shrink-0 items-center justify-center">
              <button
                onClick={onToggleExpand}
                className="flex items-center justify-center text-lng-grey transition-colors hover:text-lng-blue"
                aria-label={expanded ? 'Collapse subcategories' : 'Expand subcategories'}
              >
                {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
          </div>)}

          {/* Name + badges */}
          <div className="flex min-w-0 sm:flex-1 sm:flex-row flex-col  items-center gap-3">
            <span className="truncate font-bold text-lng-grey">
              <Highlight text={category.name} query={searchQuery} />
            </span>
            <Badge variant="neutral" className='text-nowrap'>Order: {category.sort_order}</Badge>
            <span className="shrink-0 text-xs text-lng-grey opacity-60">
              {hasSubcategories
                ? `${subcategoriesCount} subcategor${subcategoriesCount === 1 ? 'y' : 'ies'}`
                : 'No subcategories'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/categories/${category.id}`)}
              disabled={isDeleting}
            >
              <Pencil size={13} />
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isDeleting}
              disabled={isDeleting}
              onClick={onDelete}
            >
              <Trash2 size={13} />
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Subcategory card
  return (
    <div className="rounded border-l-2 border-lng-blue-40 bg-lng-blue-20 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Hierarchy indicator */}
        <CornerDownRight size={15} className="shrink-0 text-lng-grey opacity-40" />

        {/* Name + badge */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="truncate text-sm text-lng-grey">
            <Highlight text={category.name} query={searchQuery} />
          </span>
          <Badge variant="neutral" className='text-nowrap'>Order: {category.sort_order}</Badge>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/categories/${category.id}`)}
            disabled={isDeleting}
          >
            <Pencil size={13} />
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isDeleting}
            disabled={isDeleting}
            onClick={onDelete}
          >
            <Trash2 size={13} />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
