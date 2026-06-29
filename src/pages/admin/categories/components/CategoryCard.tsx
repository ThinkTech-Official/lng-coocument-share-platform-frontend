import { useNavigate } from 'react-router-dom';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { type Category } from '../../../../types';
import Highlight from '../../../../components/ui/Highlight';
import Spinner from '../../../../components/ui/Spinner';

interface CategoryCardProps {
  category: Category;
  /** 0 = root, 1 = subcategory, 2 = child */
  level: 0 | 1 | 2;
  expanded?: boolean;
  onToggleExpand?: () => void;
  hasChildren?: boolean;
  childrenCount?: number;
  onDelete: () => void;
  isDeleting: boolean;
  searchQuery: string;
}



export default function CategoryCard({
  category,
  level,
  expanded,
  onToggleExpand,
  hasChildren,
  childrenCount,
  onDelete,
  isDeleting,
  searchQuery,
}: CategoryCardProps) {
  const navigate = useNavigate();

  const isRoot = level === 0;
  const isSub = level === 1;

  /* ── padding by level ── */
  const leftPad = isRoot ? 'pl-4' : isSub ? 'pl-6' : 'pl-8';

  return (
    <div
      className={`flex items-center justify-between gap-3 pr-4 py-3 ${leftPad} ${
        isDeleting ? 'opacity-60' : ''
      } hover:bg-gray-50 transition-colors`}
    >
      {/* LEFT SIDE */}
      <div className="flex flex-1 items-center gap-2 min-w-0">

        {/* Expand / collapse chevron */}
        {hasChildren ? (
          <button
            onClick={onToggleExpand}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors"
          >
            <ChevronRight
              size={15}
              className="text-gray-500 transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>
        ) : (
          /* spacer so name stays aligned */
          <span className="shrink-0 w-6 h-6" />
        )}



        {/* Name */}
        <span
          className={`truncate ${
            isRoot ? 'font-semibold text-gray-800 text-sm' : 'font-medium text-gray-700 text-sm'
          }`}
        >
          <Highlight text={category.name} query={searchQuery} />
        </span>

        {/* "Order N" inline label */}
        <span className="shrink-0 text-xs text-gray-400 font-normal">
          Order {category.sort_order}
        </span>

        {/* Subcategory count pill */}
        {hasChildren && childrenCount !== undefined && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
            {childrenCount} subcategor{childrenCount === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>

      {/* RIGHT SIDE — actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => navigate(`/admin/categories/${category.id}`)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {isRoot && <Pencil size={11} />}
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <Spinner size="sm" color="blue" />
          ) : isRoot ? (
            <Trash2 size={11} />
          ) : null}
          Delete
        </button>
      </div>
    </div>
  );
}
