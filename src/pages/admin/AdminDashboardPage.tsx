import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HardHat,
  Building2,
  FileText,
  Video,
  AlertCircle,
  Bell,
  ChevronRight,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { getStats, type AdminStats } from '../../api/stats';
import WeatherCards from '../../components/ui/WeatherCards';
import { getNotifications } from '../../api/Notifications';

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  icon: LucideIcon;
  count: number | undefined;
  isLoading: boolean;
  isError: boolean;
  to: string;
}

function StatCard({ label, icon: Icon, count, isLoading, isError, to }: StatCardProps) {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col gap-4">
      {/* Decorative background shape */}
      <div className="pointer-events-none absolute -right-4 -top-12 h-20 w-20 bg-[#20505F] transform rotate-60 opacity-10" />

      {/* Icon box */}
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lng-blue shrink-0">
        <Icon size={18} className="text-white" strokeWidth={1.75} />
      </div>

      {/* Count */}
      <div className="flex items-end gap-2">
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <span className="text-2xl font-bold leading-none text-lng-grey">
            {isError ? '—' : (count ?? 0)}
          </span>
        )}
      </div>

      {/* Label + manage link */}
      <div className="flex items-center justify-between mt-auto">
        <p className="text-sm text-gray-500">{label}</p>
        <button
          onClick={() => navigate(to)}
          className="text-sm font-bold text-lng-blue hover:underline"
        >
          Manage
        </button>
      </div>
    </div>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────

const categoryStyles: Record<string, { accentBg: string; badgeBg: string; label: string }> = {
  info:    { accentBg: 'bg-lng-blue',    badgeBg: 'bg-lng-blue/10 text-lng-blue',          label: 'Info' },
  warning: { accentBg: 'bg-lng-orange',  badgeBg: 'bg-lng-orange/10 text-lng-orange',       label: 'Warning' },
  danger:  { accentBg: 'bg-lng-red',     badgeBg: 'bg-lng-red/10 text-lng-red',             label: 'Danger' },
  success: { accentBg: 'bg-emerald-500', badgeBg: 'bg-emerald-50 text-emerald-700',         label: 'Success' },
  blue:    { accentBg: 'bg-blue-700',    badgeBg: 'bg-blue-700 text-white font-bold',       label: 'Blue' },
  red:     { accentBg: 'bg-red-700',     badgeBg: 'bg-red-700 text-white font-bold',        label: 'Red' },
  orange:  { accentBg: 'bg-orange-600',  badgeBg: 'bg-orange-600 text-white font-bold',     label: 'Orange' },
  yellow:  { accentBg: 'bg-yellow-500',  badgeBg: 'bg-yellow-500 text-slate-900 font-bold', label: 'Yellow' },
  green:   { accentBg: 'bg-emerald-600', badgeBg: 'bg-emerald-600 text-white font-bold',    label: 'Green' },
  black:   { accentBg: 'bg-slate-900',   badgeBg: 'bg-slate-900 text-white font-bold',      label: 'Black' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.title = 'Dashboard – LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['admin-notifications-preview'],
    queryFn: () => getNotifications({ page: 1, limit: 3 }),
  });

  const typedStats = stats as AdminStats | undefined;
  const recentNotifs = notifData?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name ?? ''}`}
      />

      <WeatherCards />

      {/* ── Stats grid ── */}
      <div
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <StatCard
          label="Total Contractors"
          icon={HardHat}
          count={typedStats?.contractors ?? 0}
          isLoading={isLoading}
          isError={isError}
          to="/admin/contractors"
        />
        <StatCard
          label="Total Departments"
          icon={Building2}
          count={typedStats?.departments ?? 0}
          isLoading={isLoading}
          isError={isError}
          to="/admin/departments"
        />
        <StatCard
          label="Total Documents"
          icon={FileText}
          count={typedStats?.documents ?? 0}
          isLoading={isLoading}
          isError={isError}
          to="/admin/documents"
        />
        <StatCard
          label="Total Videos"
          icon={Video}
          count={typedStats?.videos ?? 0}
          isLoading={isLoading}
          isError={isError}
          to="/admin/videos"
        />
      </div>

      {/* ── Error retry ── */}
      {isError && (
        <div className="mt-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-lng-red" />
          <span className="text-sm text-lng-grey">Failed to load stats. Please try again.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Recent Notifications ── */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-lng-grey">Recent Notifications</h2>
          <button
            onClick={() => navigate('/admin/notifications')}
            className="flex items-center gap-1 text-xs font-semibold text-lng-blue hover:underline"
          >
            View all
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
          {notifLoading && (
            <div className="flex items-center justify-center py-10">
              <Spinner size="sm" />
            </div>
          )}

          {!notifLoading && recentNotifs.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Bell size={24} className="text-gray-300" />
              <p className="text-sm text-gray-400">No notifications yet</p>
            </div>
          )}

          {!notifLoading && recentNotifs.length > 0 && recentNotifs.map((notif) => {
            const style = categoryStyles[notif.category] || categoryStyles.info;
            return (
              <div
                key={notif.id}
                className="group relative flex items-center border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/notifications/${notif.id}`)}
              >
                {/* Accent bar */}
                <div className={`shrink-0 self-stretch w-1 ${style.accentBg}`} />

                <div className="flex flex-1 items-center gap-4 px-5 py-4 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-lng-grey break-all leading-snug">
                      {notif.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={11} />
                      {new Date(notif.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
