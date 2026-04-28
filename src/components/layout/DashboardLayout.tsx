import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ChevronLeft, ChevronRight,type LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  portalName: string;
}

export default function DashboardLayout({ navItems, portalName }: DashboardLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  
  const pageTitle = navItems.find((item) => pathname.startsWith(item.to))?.label ?? portalName;
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 640);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-lng-blue transition-all duration-300 ease-in-out
          sm:relative sm:translate-x-0
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full sm:w-12 sm:translate-x-0'}
        `}
      >
        {/* Sidebar Header: Logo & Toggle */}
        <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'p-6 pt-5' : 'pt-6 px-0 items-center'}`}>
          <div className={`flex items-center w-full mb-4 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            <div className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              <span className="text-base font-bold text-white tracking-wide whitespace-nowrap">
                <span>LNG</span>
                <span className="text-lng-red"> CANADA</span>
              </span>
            </div>
            
            <button 
              onClick={toggleSidebar}
              className="text-white/70 hover:text-white transition-colors cursor-pointer"
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isSidebarOpen ? (
                <ChevronLeft size={20} className="block cursor-pointer" />
              ) : (
                <ChevronRight size={20} className="block cursor-pointer" />
              )}
            </button>
          </div>

          {isSidebarOpen && (
            <p className="text-xs text-white/50 whitespace-nowrap">Document Sharing Platform</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => window.innerWidth < 640 && setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-4 px-6 py-3 text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-lng-red bg-white/10 text-white'
                    : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                } ${!isSidebarOpen ? 'sm:justify-center sm:px-0 sm:border-l-0' : ''}`
              }
              title={!isSidebarOpen ? label : ''}
            >
              <Icon size={16} strokeWidth={1.75} className="shrink-0" />
              <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'sm:hidden'}`}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* User / logout */}
        <div className={`border-t border-white/10 px-6 py-4 transition-all duration-300 ${!isSidebarOpen ? 'sm:px-2 sm:flex sm:flex-col sm:items-center' : ''}`}>
          <p className={`truncate text-xs text-white/50 mb-2 transition-opacity ${isSidebarOpen ? 'opacity-100' : 'sm:hidden'}`}>
            {user?.email}
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors whitespace-nowrap"
            title={!isSidebarOpen ? 'Logout' : ''}
          >
            <LogOut size={14} className="shrink-0" />
            <span className={isSidebarOpen ? 'opacity-100' : 'sm:hidden'}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="sm:hidden rounded-md p-1 text-lng-blue hover:bg-gray-100 transition-colors"
                aria-label="Open Sidebar"
              >
                <Menu size={20} />
              </button>
            )}
            <h2 className="text-sm font-semibold text-lng-blue">{pageTitle}</h2>
          </div>
          <span className="text-sm text-lng-grey">{user?.name}</span>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
