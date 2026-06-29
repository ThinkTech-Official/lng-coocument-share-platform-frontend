import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Plus, Search, Trash2, Bell, AlertCircle, Calendar, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import { type Notification } from '../../../types';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Pagination from '../../../components/ui/Pagination';
import { deleteNotification, getNotifications } from '../../../api/Notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const categoryStyles: Record<string, { accentBg: string; badgeBg: string; label: string }> = {
  info:       { accentBg: 'bg-lng-blue',    badgeBg: 'bg-lng-blue/10 text-lng-blue',          label: 'Info' },
  warning:    { accentBg: 'bg-lng-orange',  badgeBg: 'bg-lng-orange/10 text-lng-orange',       label: 'Warning' },
  danger:     { accentBg: 'bg-lng-red',     badgeBg: 'bg-lng-red/10 text-lng-red',             label: 'Danger' },
  success:    { accentBg: 'bg-emerald-500', badgeBg: 'bg-emerald-50 text-emerald-700',         label: 'Success' },
  blue:       { accentBg: 'bg-blue-700',    badgeBg: 'bg-blue-700 text-white font-bold',       label: 'Blue' },
  red:        { accentBg: 'bg-red-700',     badgeBg: 'bg-red-700 text-white font-bold',        label: 'Red' },
  orange:     { accentBg: 'bg-orange-600',  badgeBg: 'bg-orange-600 text-white font-bold',     label: 'Orange' },
  yellow:     { accentBg: 'bg-yellow-500',  badgeBg: 'bg-yellow-500 text-slate-900 font-bold', label: 'Yellow' },
  green:      { accentBg: 'bg-emerald-600', badgeBg: 'bg-emerald-600 text-white font-bold',    label: 'Green' },
  black:      { accentBg: 'bg-slate-900',   badgeBg: 'bg-slate-900 text-white font-bold',      label: 'Black' },
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-gray-200 ${cls}`} />
  );
  return (
    <div className="flex items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-0">
      <div className="w-1 self-stretch rounded-full bg-gray-200 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        {bar('h-4 w-2/3')}
        {bar('h-3 w-1/4')}
      </div>
      {bar('h-5 w-14 rounded')}
      {bar('h-3 w-20')}
      {bar('h-6 w-6 rounded')}
    </div>
  );
}

// ─── Notification List Row ────────────────────────────────────────────────────

interface NotificationRowProps {
  notification: Notification;
  onDelete: () => void;
  deleting: boolean;
  onView: () => void;
}

function NotificationRow({ notification, onDelete, deleting, onView }: NotificationRowProps) {
  const style = categoryStyles[notification.category] || categoryStyles.info;

  return (
    <div
      className="group relative flex items-center border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50 cursor-pointer overflow-hidden"
      onClick={onView}
    >
      {/* Coloured accent bar — separate element avoids border-color conflicts */}
      <div className={`shrink-0 self-stretch w-1 ${style.accentBg}`} />

      {/* Row content */}
      <div className="flex flex-1 items-center gap-4 px-5 py-4 min-w-0">
        {/* Title + date stacked */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-lng-grey break-all leading-snug">
            {notification.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
            <Calendar size={11} />
            {formatDate(notification.created_at)}
          </p>
        </div>

        {/* Delete */}
        <button
          className="shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-lng-red disabled:opacity-40"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={deleting}
          aria-label="Delete notification"
          title="Delete"
        >
          <Trash2 size={15} />
        </button>

        <ChevronRight size={15} className="shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
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
    document.title = 'Notifications – LNG Canada';
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
    queryFn: () => getNotifications({ page, limit: 10, search: debouncedSearch || undefined }),
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
          placeholder="Search notifications…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
        />
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-100">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
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
            className={`overflow-hidden rounded-lg bg-white shadow-sm border border-gray-100 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
          >
            {notifications.map((notif) => (
              <NotificationRow
                key={notif.id}
                notification={notif}
                onView={() => navigate(`/admin/notifications/${notif.id}`)}
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
