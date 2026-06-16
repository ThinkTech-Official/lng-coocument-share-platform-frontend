import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Plus, Search, Trash2, Bell, AlertCircle, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

import { type Notification } from '../../../types';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Pagination from '../../../components/ui/Pagination';
import ContentRenderer from '../../../components/ui/MarkdownRenderer';
import { deleteNotification, getNotifications } from '../../../api/Notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const categoryStyles: Record<string, { border: string; badgeBg: string; label: string }> = {
  info: {
    border: 'border-l-4 border-lng-blue border-y border-r border-gray-150',
    badgeBg: 'bg-lng-blue/10 text-lng-blue',
    label: 'Info',
  },
  warning: {
    border: 'border-l-4 border-lng-orange border-y border-r border-gray-150',
    badgeBg: 'bg-lng-orange/10 text-lng-orange',
    label: 'Warning',
  },
  danger: {
    border: 'border-l-4 border-lng-red border-y border-r border-gray-150',
    badgeBg: 'bg-lng-red/10 text-lng-red',
    label: 'Danger',
  },
  success: {
    border: 'border-l-4 border-emerald-500 border-y border-r border-gray-150',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    label: 'Success',
  },
  'blue-dark': {
    border: 'border-l-4 border-blue-700 border-y border-r border-gray-150',
    badgeBg: 'bg-blue-700 text-white font-bold',
    label: 'Blue',
  },
  'red-dark': {
    border: 'border-l-4 border-red-700 border-y border-r border-gray-150',
    badgeBg: 'bg-red-700 text-white font-bold',
    label: 'Red',
  },
  'orange-dark': {
    border: 'border-l-4 border-orange-600 border-y border-r border-gray-150',
    badgeBg: 'bg-orange-600 text-white font-bold',
    label: 'Orange',
  },
  'yellow-dark': {
    border: 'border-l-4 border-yellow-500 border-y border-r border-gray-150',
    badgeBg: 'bg-yellow-500 text-slate-900 font-bold',
    label: 'Yellow',
  },
  'green-dark': {
    border: 'border-l-4 border-emerald-600 border-y border-r border-gray-150',
    badgeBg: 'bg-emerald-600 text-white font-bold',
    label: 'Green',
  },
  'black-dark': {
    border: 'border-l-4 border-slate-900 border-y border-r border-gray-150',
    badgeBg: 'bg-slate-900 text-white font-bold',
    label: 'Black',
  },
  // ── simplified keys (current category set) ──
  blue: {
    border: 'border-l-4 border-blue-700 border-y border-r border-gray-150',
    badgeBg: 'bg-blue-700 text-white font-bold',
    label: 'Blue',
  },
  red: {
    border: 'border-l-4 border-red-700 border-y border-r border-gray-150',
    badgeBg: 'bg-red-700 text-white font-bold',
    label: 'Red',
  },
  orange: {
    border: 'border-l-4 border-orange-600 border-y border-r border-gray-150',
    badgeBg: 'bg-orange-600 text-white font-bold',
    label: 'Orange',
  },
  yellow: {
    border: 'border-l-4 border-yellow-500 border-y border-r border-gray-150',
    badgeBg: 'bg-yellow-500 text-slate-900 font-bold',
    label: 'Yellow',
  },
  green: {
    border: 'border-l-4 border-emerald-600 border-y border-r border-gray-150',
    badgeBg: 'bg-emerald-600 text-white font-bold',
    label: 'Green',
  },
  black: {
    border: 'border-l-4 border-slate-900 border-y border-r border-gray-150',
    badgeBg: 'bg-slate-900 text-white font-bold',
    label: 'Black',
  },
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-gray-200 ${cls}`} />
  );
  return (
    <div className="flex flex-col rounded bg-white p-5 shadow-sm border-l-4 border-gray-300 border-y border-r">
      <div className="mb-2 flex items-center justify-between">
        {bar('h-4 w-16')}
        {bar('h-3 w-32')}
      </div>
      <div className="space-y-2 mb-4">
        {bar('h-5 w-3/4')}
        {bar('h-4 w-full')}
        {bar('h-4 w-5/6')}
      </div>
      <div className="mt-auto pt-2">
        {bar('h-7 w-20 rounded')}
      </div>
    </div>
  );
}

// ─── Notification Item Card ───────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  onDelete: () => void;
  deleting: boolean;
}

function NotificationCard({ notification, onDelete, deleting }: NotificationCardProps) {
  const style = categoryStyles[notification.category] || categoryStyles.info;

  return (
    <div className={`flex flex-col rounded bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${style.border}`}>
      <div className="mb-2.5 flex items-center justify-between text-xs">
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${style.badgeBg}`}>
          {style.label}
        </span>
        <span className="flex items-center gap-1 text-gray-400">
          <Calendar size={12} />
          {formatDate(notification.created_at)}
        </span>
      </div>
      <h3 className="mb-3 text-sm font-bold text-lng-grey break-words">
        {notification.title}
      </h3>
      <div className="mb-4 text-xs text-lng-grey space-y-2 border-t border-gray-50 pt-3">
        <ContentRenderer content={notification.content} />
      </div>
      <div className="mt-auto pt-2 border-t border-gray-100 flex justify-end">
        <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
          <Trash2 size={13} />
          Delete
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);

  useEffect(() => {
    document.title = 'Notifications LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['admin-notifications', { page, search: debouncedSearch }],
    queryFn: () => getNotifications({ page, limit: 6, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const notifications = data?.data ?? [];
  const meta = data?.meta;

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Notification deleted successfully');
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('Failed to delete notification. Please try again.');
      setDeleteTarget(null);
    },
  });

  const hasSearch = !!debouncedSearch;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Broadcast announcements and security alerts to contractors"
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/notifications/post')}>
            <Plus size={15} />
            Post Notification
          </Button>
        }
      />

      {/* Search Filter */}
      <div className="relative mb-6 max-w-sm">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder="Search previous notifications"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
        />
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={32} className="text-lng-red" />
          <p className="text-sm text-lng-grey">Failed to load notifications. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Empty States */}
      {!isLoading && !isError && meta?.total === 0 && !hasSearch && (
        <div>
          <EmptyState
            icon={Bell}
            title="No notifications posted"
            message="Create your first notification to update contractor dashboards."
          />
          <div className="flex justify-center -mt-4">
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/notifications/post')}>
              <Plus size={14} />
              Post Notification
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !isError && notifications.length === 0 && hasSearch && (
        <EmptyState
          icon={Bell}
          title="No matching notifications"
          message="Try searching for another heading or content term."
        />
      )}

      {/* Notifications List */}
      {!isLoading && !isError && notifications.length > 0 && (
        <>
          <div
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
          >
            {notifications.map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                onDelete={() => setDeleteTarget(notif)}
                deleting={deleteMutation.isPending && deleteTarget?.id === notif.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && (
            <div className="mt-6">
              <Pagination meta={meta} onPageChange={setPage} isLoading={isFetching} />
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Delete Announcement"
        confirmLabel="Delete"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? Contractors will no longer see this announcement.`}
      />
    </>
  );
}

