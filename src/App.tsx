import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Role } from './types';
import Spinner from './components/ui/Spinner';

import RoleRoute from './components/guards/RoleRoute';
import ForceResetRoute from './components/guards/ForceResetRoute';

import AuthLayout from './components/layout/AuthLayout';
import SuperadminLayout from './components/layout/SuperadminLayout';
import AdminLayout from './components/layout/AdminLayout';
import ContractorLayout from './components/layout/ContractorLayout';

// ─── Lazy page imports ────────────────────────────────────────────────────────

const LoginPage            = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage   = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage    = lazy(() => import('./pages/auth/ResetPasswordPage'));
const ForceResetPasswordPage = lazy(() => import('./pages/auth/ForceResetPasswordPage'));

const SuperadminDashboardPage = lazy(() => import('./pages/superadmin/SuperadminDashboardPage'));
const AdminsListPage          = lazy(() => import('./pages/superadmin/AdminsListPage'));
const CreateAdminPage         = lazy(() => import('./pages/superadmin/CreateAdminPage'));
const AdminDetailPage         = lazy(() => import('./pages/superadmin/AdminDetailPage'));
const AuditLogsPage           = lazy(() => import('./pages/superadmin/AuditLogsPage'));

const AdminDashboardPage    = lazy(() => import('./pages/admin/AdminDashboardPage'));
const ContractorsListPage   = lazy(() => import('./pages/admin/ContractorsListPage'));
const CreateContractorPage  = lazy(() => import('./pages/admin/CreateContractorPage'));
const ContractorDetailPage  = lazy(() => import('./pages/admin/ContractorDetailPage'));
const DepartmentsListPage   = lazy(() => import('./pages/admin/DepartmentsListPage'));
const CreateDepartmentPage  = lazy(() => import('./pages/admin/CreateDepartmentPage'));
const DepartmentDetailPage  = lazy(() => import('./pages/admin/DepartmentDetailPage'));
const CategoriesListPage    = lazy(() => import('./pages/admin/CategoriesListPage'));
const CreateCategoryPage    = lazy(() => import('./pages/admin/CreateCategoryPage'));
const CategoryDetailPage    = lazy(() => import('./pages/admin/CategoryDetailPage'));
const DocumentsListPage     = lazy(() => import('./pages/admin/DocumentsListPage'));
const UploadDocumentPage    = lazy(() => import('./pages/admin/UploadDocumentPage'));
const DocumentDetailPage    = lazy(() => import('./pages/admin/DocumentDetailPage'));
const VideosListPage        = lazy(() => import('./pages/admin/VideosListPage'));
const UploadVideoPage       = lazy(() => import('./pages/admin/UploadVideoPage'));
const VideoDetailPage       = lazy(() => import('./pages/admin/VideoDetailPage'));

const HomePage             = lazy(() => import('./pages/contractor/HomePage'));
const DocumentViewerPage   = lazy(() => import('./pages/contractor/DocumentViewerPage'));
const VideoPlayerPage      = lazy(() => import('./pages/contractor/VideoPlayerPage'));

// ─── Root redirect ────────────────────────────────────────────────────────────

function RootRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.force_password_reset) return <Navigate to="/force-reset" replace />;
  if (user.role === Role.SUPERADMIN) return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === Role.ADMIN) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/home" replace />;
}

// ─── Suspense fallback ────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// Wraps all routes so lazy-loaded pages get a Suspense boundary
function SuspenseOutlet() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

// ─── Router (data router — required for useBlocker) ───────────────────────────

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<SuspenseOutlet />}>
      <Route path="/" element={<RootRedirect />} />

      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />
      </Route>

      {/* Force password reset */}
      <Route element={<ForceResetRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/force-reset" element={<ForceResetPasswordPage />} />
        </Route>
      </Route>

      {/* Superadmin routes */}
      <Route element={<RoleRoute allowedRoles={[Role.SUPERADMIN]} />}>
        <Route element={<SuperadminLayout />}>
          <Route path="/superadmin/dashboard"       element={<SuperadminDashboardPage />} />
          <Route path="/superadmin/admins"           element={<AdminsListPage />} />
          <Route path="/superadmin/admins/create"    element={<CreateAdminPage />} />
          <Route path="/superadmin/admins/:id"       element={<AdminDetailPage />} />
          <Route path="/superadmin/logs"             element={<AuditLogsPage />} />
        </Route>
      </Route>

      {/* Admin routes */}
      <Route element={<RoleRoute allowedRoles={[Role.ADMIN]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard"            element={<AdminDashboardPage />} />
          <Route path="/admin/contractors"           element={<ContractorsListPage />} />
          <Route path="/admin/contractors/create"    element={<CreateContractorPage />} />
          <Route path="/admin/contractors/:id"       element={<ContractorDetailPage />} />
          <Route path="/admin/departments"           element={<DepartmentsListPage />} />
          <Route path="/admin/departments/create"    element={<CreateDepartmentPage />} />
          <Route path="/admin/departments/:id"       element={<DepartmentDetailPage />} />
          <Route path="/admin/categories"            element={<CategoriesListPage />} />
          <Route path="/admin/categories/create"     element={<CreateCategoryPage />} />
          <Route path="/admin/categories/:id"        element={<CategoryDetailPage />} />
          <Route path="/admin/documents"             element={<DocumentsListPage />} />
          <Route path="/admin/documents/upload"      element={<UploadDocumentPage />} />
          <Route path="/admin/documents/:id"         element={<DocumentDetailPage />} />
          <Route path="/admin/videos"                element={<VideosListPage />} />
          <Route path="/admin/videos/upload"         element={<UploadVideoPage />} />
          <Route path="/admin/videos/:id"            element={<VideoDetailPage />} />
        </Route>
      </Route>

      {/* Contractor routes */}
      <Route element={<RoleRoute allowedRoles={[Role.CONTRACTOR]} />}>
        <Route element={<ContractorLayout />}>
          <Route path="/home"            element={<HomePage />} />
          <Route path="/documents/:id"   element={<DocumentViewerPage />} />
          <Route path="/videos/:id"      element={<VideoPlayerPage />} />
        </Route>
      </Route>
    </Route>
  )
);

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return <RouterProvider router={router} />;
}
