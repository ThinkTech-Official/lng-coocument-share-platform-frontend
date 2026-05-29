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

  const getPages = () => {
    const total = meta.totalPages;
    const current = meta.page;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row items-center justify-between border-t border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-400">
        Showing {start}–{end} of {meta.total} result{meta.total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          disabled={meta.page <= 1 || isLoading}
          onClick={() => onPageChange(meta.page - 1)}
           className="hidden sm:inline-flex items-center justify-center gap-2 rounded font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-lng-blue focus:ring-offset-1 border border-lng-blue text-lng-blue hover:bg-lng-blue-20 disabled:opacity-60 px-3 py-1.5 text-xs"
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        {/* Mobile-only compact prev */}
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1 || isLoading}
          onClick={() => onPageChange(meta.page - 1)}
          className="sm:hidden"
        >
          <ChevronLeft size={14} />
        </Button>

        <div className="flex items-center gap-1">
          {getPages().map((p, i) => (
            p === '...' ? (
              <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
            ) : (
              <Button
                key={p}
                variant={meta.page === p ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onPageChange(p as number)}
                disabled={isLoading}
                className="h-8 w-8 min-w-0 p-0"
              >
                {p}
              </Button>
            )
          ))}
        </div>

        <button
          disabled={!meta.hasNextPage || isLoading}
          onClick={() => onPageChange(meta.page + 1)}
          className="hidden sm:inline-flex items-center justify-center gap-2 rounded font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-lng-blue focus:ring-offset-1 border border-lng-blue text-lng-blue hover:bg-lng-blue-20 disabled:opacity-60 px-3 py-1.5 text-xs"
        >
          Next
          <ChevronRight size={14} />
        </button>

        {/* Mobile-only compact next */}
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage || isLoading}
          onClick={() => onPageChange(meta.page + 1)}
          className="sm:hidden"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
