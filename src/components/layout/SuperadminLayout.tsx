import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ScrollText, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { label: 'Dashboard', to: '/superadmin/dashboard', icon: LayoutDashboard },
  { label: 'Admins', to: '/superadmin/admins', icon: Users },
  { label: 'Audit Logs', to: '/superadmin/logs', icon: ScrollText },
];

function usePageTitle() {
  const { pathname } = useLocation();
  return navItems.find((item) => pathname.startsWith(item.to))?.label ?? 'Superadmin Portal';
}

export default function SuperadminLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-lng-blue">
        {/* Logo */}
        <div className="px-6 py-5">
          <span className="text-base font-bold text-white tracking-wide">
            <span>LNG</span>
            <span className="text-lng-red"> CANADA</span>
          </span>
          <p className="mt-0.5 text-xs text-white/50">Document Sharing Platform</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-4 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'border-lng-red bg-white/10 text-white'
                    : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User / logout */}
        <div className="border-t border-white/10 px-6 py-4">
          <p className="truncate text-xs text-white/50 mb-2">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          <h2 className="text-sm font-semibold text-lng-blue">{pageTitle}</h2>
          <span className="text-sm text-lng-grey">{user?.name}</span>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
