import { LayoutDashboard, Users, ScrollText } from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const navItems = [
  { label: 'Dashboard', to: '/superadmin/dashboard', icon: LayoutDashboard },
  { label: 'Admins', to: '/superadmin/admins', icon: Users },
  { label: 'Audit Logs', to: '/superadmin/logs', icon: ScrollText },
];

export default function SuperadminLayout() {
  return <DashboardLayout navItems={navItems} portalName="Superadmin Portal" />;
}
