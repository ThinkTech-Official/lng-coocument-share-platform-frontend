import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { getNotifications } from '../../api/Notifications';
import ContentRenderer from '../../components/ui/MarkdownRenderer';
import Button from '../../components/ui/Button';

const alertStyles: Record<string, { border: string; headerBg: string }> = {
  info: {
    border: 'border border-lng-blue/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-lng-blue text-white text-xs font-bold px-4 py-2.5',
  },
  warning: {
    border: 'border border-lng-orange/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-lng-orange text-white text-xs font-bold px-4 py-2.5',
  },
  danger: {
    border: 'border border-lng-red/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-lng-red text-white text-xs font-bold px-4 py-2.5',
  },
  success: {
    border: 'border border-emerald-500/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-emerald-600 text-white text-xs font-bold px-4 py-2.5',
  },
  'blue-dark': {
    border: 'border border-blue-700/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-blue-700 text-white text-xs font-bold px-4 py-2.5',
  },
  'red-dark': {
    border: 'border border-red-700/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-red-700 text-white text-xs font-bold px-4 py-2.5',
  },
  'orange-dark': {
    border: 'border border-orange-600/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-orange-600 text-white text-xs font-bold px-4 py-2.5',
  },
  'yellow-dark': {
    border: 'border border-yellow-500/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-yellow-500 text-slate-900 text-xs font-bold px-4 py-2.5',
  },
  'green-dark': {
    border: 'border border-emerald-600/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-emerald-600 text-white text-xs font-bold px-4 py-2.5',
  },
  'black-dark': {
    border: 'border border-slate-900/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-slate-900 text-white text-xs font-bold px-4 py-2.5',
  },
  // ── simplified keys (current category set) ──
  blue: {
    border: 'border border-blue-700/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-blue-700 text-white text-xs font-bold px-4 py-2.5',
  },
  red: {
    border: 'border border-red-700/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-red-700 text-white text-xs font-bold px-4 py-2.5',
  },
  orange: {
    border: 'border border-orange-600/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-orange-600 text-white text-xs font-bold px-4 py-2.5',
  },
  yellow: {
    border: 'border border-yellow-500/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-yellow-500 text-slate-900 text-xs font-bold px-4 py-2.5',
  },
  green: {
    border: 'border border-emerald-600/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-emerald-600 text-white text-xs font-bold px-4 py-2.5',
  },
  black: {
    border: 'border border-slate-900/30 rounded-sm overflow-hidden shadow-sm',
    headerBg: 'bg-slate-900 text-white text-xs font-bold px-4 py-2.5',
  },
};

export default function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['contractor-notifications'],
    queryFn: () => getNotifications({ limit: 50 }), // fetch up to 50 active notifications
  });

  const notifications = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-sm overflow-hidden shadow-sm animate-pulse">
              <div className="bg-gray-200 h-9 px-4 py-2.5" />
              <div className="bg-white p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed border-gray-200 rounded-sm bg-white p-6">
          <AlertCircle size={24} className="text-lng-red" />
          <p className="text-xs text-lng-grey">Failed to load notifications. Please check connection and try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && notifications.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-sm bg-white p-6">
          <p className="text-xs text-gray-400">No active announcements or security alerts at this time.</p>
        </div>
      )}

      {/* List of Dynamic Notifications */}
      {!isLoading && !isError && notifications.length > 0 && (
        <div className="space-y-6">
          {notifications.map((notif) => {
            const style = alertStyles[notif.category] || alertStyles.info;
            return (
              <div key={notif.id} className={style.border}>
                <div className={style.headerBg}>
                  {notif.title}
                </div>
                <div className="bg-white p-4">
                  <ContentRenderer content={notif.content} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* General HSE Info Footnote (Preserved from original design) */}
      <div className="text-xs text-lng-grey space-y-3 leading-relaxed pt-4 border-t border-gray-100">
        <p>
          Protection of both the health and well-being of all employees and contractors and protection of the environment are of utmost concern to LNG Canada. To effectively manage contractor HSE performance, we utilize the Contractor HSE Management Process (CSMP).
        </p>
        <p>
          This process describes the identification, assessment, and control of HSE-related risk incurred by using contractors to provide services.
        </p>
      </div>
    </div>
  );
}

