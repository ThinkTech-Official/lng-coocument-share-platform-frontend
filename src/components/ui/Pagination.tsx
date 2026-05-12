import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type PaginatedMeta } from '../../types';
import Button from './Button';

interface PaginationProps {
  meta: PaginatedMeta;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function Pagination({ meta, onPageChange, isLoading = false }: PaginationProps) {
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end   = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-400">
        Showing {start}–{end} of {meta.total} result{meta.total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1 || isLoading}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft size={14} />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage || isLoading}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
