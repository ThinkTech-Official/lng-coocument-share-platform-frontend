import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function ContractorLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Top nav bar */}
      <header className="flex h-16 items-center gap-4 bg-lng-blue px-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-bold text-white tracking-wide">
            LNG<span className="text-lng-red"> CANADA</span>
          </span>
        </div>

        {/* Search — center */}
        <div className="flex flex-1 justify-center px-4">
          <div className="relative w-full max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search documents and videos…"
              className="
                w-full rounded border border-white/20 bg-white/10 py-2 pl-9 pr-3
                text-sm text-white placeholder:text-white/50
                focus:border-white/40 focus:bg-white/15 focus:outline-none
              "
            />
          </div>
        </div>

        {/* User + logout — right */}
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-sm text-white/80">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
