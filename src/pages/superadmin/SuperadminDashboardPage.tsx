import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  HardHat,
  Building2,
  FileText,
  Video,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { getAdmins } from '../../api/admins';
import { getContractors } from '../../api/contractors';
import { getDepartments } from '../../api/departments';
import { getDocuments } from '../../api/documents';
import { getVideos } from '../../api/videos';

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  icon: LucideIcon;
  count: number | undefined;
  isLoading: boolean;
  isError: boolean;
}

function StatCard({ label, icon: Icon, count, isLoading, isError }: StatCardProps) {
  return (
    <div className="relative rounded-lg bg-white p-6 shadow-sm border-l-4 border-lng-blue">
      <div className="absolute right-5 top-5">
        <Icon size={22} className="text-lng-blue-40" strokeWidth={1.5} />
      </div>

      <div className="mb-1 flex h-9 items-center">
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <span className="text-3xl font-bold leading-none text-lng-blue">
            {isError ? '—' : (count ?? 0)}
          </span>
        )}
      </div>

      <p className="text-sm text-lng-grey">{label}</p>

      {isError && !isLoading && (
        <p className="mt-1 text-xs text-lng-red">Failed to load</p>
      )}
    </div>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel: string;
  to: string;
}

function QuickActionCard({ icon: Icon, title, description, buttonLabel, to }: QuickActionCardProps) {
  const navigate = useNavigate();
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-lng-blue-20">
        <Icon size={18} className="text-lng-blue" strokeWidth={1.75} />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-lng-grey">{title}</h3>
      <p className="mb-5 text-xs text-gray-400">{description}</p>
      <Button variant="outline" size="sm" onClick={() => navigate(to)}>
        {buttonLabel}
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperadminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.title = 'Dashboard — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // Trigger fade-in after first paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ─── Queries (independent per card) ────────────────────────────────────────

  const admins      = useQuery({ queryKey: ['admins'],      queryFn: getAdmins });
  const contractors = useQuery({ queryKey: ['contractors'], queryFn: getContractors });
  const departments = useQuery({ queryKey: ['departments'], queryFn: getDepartments });
  const documents   = useQuery({ queryKey: ['documents'],   queryFn: () => getDocuments() });
  const videos      = useQuery({ queryKey: ['videos'],      queryFn: () => getVideos() });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name ?? ''}`}
      />

      {/* ── Stats grid ── */}
      <div
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <StatCard
          label="Total Admins"
          icon={Users}
          count={admins.data?.length}
          isLoading={admins.isLoading}
          isError={admins.isError}
        />
        <StatCard
          label="Total Contractors"
          icon={HardHat}
          count={contractors.data?.length}
          isLoading={contractors.isLoading}
          isError={contractors.isError}
        />
        <StatCard
          label="Total Departments"
          icon={Building2}
          count={departments.data?.length}
          isLoading={departments.isLoading}
          isError={departments.isError}
        />
        <StatCard
          label="Total Documents"
          icon={FileText}
          count={documents.data?.length}
          isLoading={documents.isLoading}
          isError={documents.isError}
        />
        <StatCard
          label="Total Videos"
          icon={Video}
          count={videos.data?.length}
          isLoading={videos.isLoading}
          isError={videos.isError}
        />
      </div>

      {/* ── Quick actions ── */}
      <div className="mt-10">
        <h2 className="mb-4 text-sm font-bold text-lng-grey">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 max-w-xl">
          <QuickActionCard
            icon={Users}
            title="Manage Admins"
            description="View and manage admin accounts"
            buttonLabel="Go to Admins"
            to="/superadmin/admins"
          />
          <QuickActionCard
            icon={ScrollText}
            title="View Audit Logs"
            description="Browse all platform activity logs"
            buttonLabel="Go to Logs"
            to="/superadmin/logs"
          />
        </div>
      </div>
    </div>
  );
}
