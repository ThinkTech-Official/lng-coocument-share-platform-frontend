import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { type Role } from '../../types';

interface RoleRouteProps {
  allowedRoles: Role[];
}

function roleDashboard(role: Role): string {
  if (role === 'SUPERADMIN') return '/superadmin/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  return '/home';
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.force_password_reset) return <Navigate to="/force-reset" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={roleDashboard(user.role)} replace />;

  return <Outlet />;
}
