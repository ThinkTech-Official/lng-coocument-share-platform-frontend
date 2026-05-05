import { LayoutDashboard, HardHat, Building2, Tag, FileText, Video } from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Contractors', to: '/admin/contractors', icon: HardHat },
  { label: 'Departments', to: '/admin/departments', icon: Building2 },
  { label: 'Categories', to: '/admin/categories', icon: Tag },
  { label: 'Documents', to: '/admin/documents', icon: FileText },
  { label: 'Videos', to: '/admin/videos', icon: Video },
];

export default function AdminLayout() {
  return <DashboardLayout navItems={navItems} portalName="Admin Portal" />;
}
