import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, AlertCircle, AlertTriangle, Trash2, Info,
} from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/ui/PageHeader';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Toggle from '../../../components/ui/Toggle';
import { ContractorFormSkeleton } from '../../../components/admin/contractors/ContractorFormSkeleton';
import { useContractorForm } from '../../../hooks/admin/useContractorForm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContractorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    contractor,
    contractorLoading,
    contractorError,
    departments,
    deptsLoading,
    form,
    selectedDeptIds,
    deptError,
    toggleDept,
    deptsChanged,
    isPending,
    onSubmit,
    handleSaveDepts,
    statusMutation,
    deleteMutation,
    navigate,
  } = useContractorForm(id);

  const { register, reset, formState: { errors, isDirty } } = form;

  // ─── Dialog state ─────────────────────────────────────────────────────────────

  const [statusDialog, setStatusDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // ─── Loading state ────────────────────────────────────────────────────────────

  if (contractorLoading) return <ContractorFormSkeleton />;

  // ─── Error / not found ────────────────────────────────────────────────────────

  if (contractorError || !contractor) {
    return (
      <>
        <PageHeader
          title="Contractor Details"
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/contractors')}>
              <ArrowLeft size={14} />
              Back to Contractors
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle size={40} className="text-lng-red" />
          <h2 className="text-base font-semibold text-lng-grey">Contractor Not Found</h2>
          <p className="text-sm text-gray-500">This contractor account could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate('/admin/contractors')}>
            <ArrowLeft size={14} />
            Back to Contractors
          </Button>
        </div>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Contractor Details"
        subtitle={contractor.name}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/contractors')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Contractors
          </Button>
        }
      />

      {/* Inactive banner */}
      {!contractor.is_active && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-lng-red-20 px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 text-lng-red" />
          <p className="text-sm text-lng-red">
            This contractor account is currently inactive and cannot log in.
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left column ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Edit details card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-sm font-bold text-lng-grey">Account Details</h2>
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter full name"
                maxLength={60}
                disabled={isPending}
                error={errors.name?.message}
                {...register('name')}
              />

              <div className="flex flex-col gap-1">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="Enter email address"
                  disabled={isPending}
                  error={errors.email?.message}
                  {...register('email')}
                />
                {!errors.email && (
                  <div className="mt-1 flex items-start gap-1.5">
                    <Info size={13} className="mt-0.5 shrink-0 text-lng-blue" />
                    <p className="text-xs text-lng-grey leading-relaxed">
                      Changing the email will update the contractor's login credentials.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
                {isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => reset({ name: contractor.name, email: contractor.email })}
                  >
                    Reset Changes
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  loading={isPending}
                  disabled={!isDirty || isPending}
                >
                  <Save size={14} />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Department assignment card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-sm font-bold text-lng-grey">Department Access</h2>
            </div>

            {deptsLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <span className="text-sm text-gray-400">Loading departments…</span>
              </div>
            ) : !departments || departments.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-sm text-lng-grey">
                  No departments available. Please create departments first.
                </p>
                <Link
                  to="/admin/departments"
                  className="inline-flex items-center gap-1 text-xs font-medium text-lng-blue hover:underline"
                >
                  Go to Departments
                  <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-md border border-gray-200 divide-y divide-gray-100">
                  {departments.map((dept) => {
                    const checked = selectedDeptIds.includes(dept.id);
                    return (
                      <label
                        key={dept.id}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                          checked ? 'bg-lng-blue-20' : 'hover:bg-gray-50'
                        } ${isPending ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isPending}
                          onChange={() => toggleDept(dept.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-lng-blue"
                        />
                        <span className="text-sm text-lng-grey">{dept.name}</span>
                      </label>
                    );
                  })}
                </div>

                {deptError && (
                  <p className="mb-3 text-xs text-lng-red">{deptError}</p>
                )}

                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center"
                  loading={isPending}
                  disabled={!deptsChanged || isPending}
                  onClick={handleSaveDepts}
                >
                  <Save size={14} />
                  Save Departments
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">

          {/* Account status card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-sm font-bold text-lng-grey">Account Status</h2>
            </div>

            <div className="space-y-4">
              <Badge variant={contractor.is_active ? 'success' : 'neutral'}>
                {contractor.is_active ? 'Active' : 'Inactive'}
              </Badge>

              {/* Active Status Toggle */}
              <Toggle
                label={contractor.is_active ? "Account Active" : "Account Inactive"}
                description={contractor.is_active ? "Contractor can log in and view content." : "Contractor cannot log in."}
                checked={contractor.is_active}
                onChange={() => setStatusDialog(true)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Danger zone card */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-lng-red-40">
            <div className="mb-5 border-b border-gray-200 pb-4">
              <h2 className="text-sm font-bold text-lng-red">Danger Zone</h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-lng-grey">
                Permanently delete this contractor account. This action cannot be undone.
              </p>
              <Button
                type="button"
                variant="danger"
                className="w-full justify-center"
                disabled={isPending}
                onClick={() => setDeleteDialog(true)}
              >
                <Trash2 size={14} />
                Delete Contractor Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="mt-6 flex items-center gap-6 rounded-lg border border-gray-100 bg-white px-5 py-3 text-xs text-lng-grey shadow-sm">
        <span>
          <span className="font-medium">Created</span>
          {' '}
          {formatDate(contractor.created_at)}
        </span>
        <span className="h-4 w-px bg-gray-200" aria-hidden />
        <span>
          <span className="font-medium">Account ID</span>
          {' '}
          <span className="font-mono">{contractor.id}</span>
        </span>
      </div>

      {/* ── Status confirm dialog ── */}
      <Modal
        open={statusDialog}
        onClose={() => !statusMutation.isPending && setStatusDialog(false)}
        title={contractor.is_active ? 'Deactivate Contractor' : 'Activate Contractor'}
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setStatusDialog(false)}
              disabled={statusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={contractor.is_active ? 'danger' : 'primary'}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate(!contractor.is_active, { onSuccess: () => setStatusDialog(false) })}
            >
              {contractor.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-lng-grey">
          {contractor.is_active
            ? `Are you sure you want to deactivate ${contractor.name}? They will no longer be able to log in. This does not affect any admin accounts.`
            : `Are you sure you want to activate ${contractor.name}?`}
        </p>
      </Modal>

      {/* ── Delete confirm dialog ── */}
      <ConfirmDialog
        open={deleteDialog}
        onClose={() => !deleteMutation.isPending && setDeleteDialog(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete Contractor Account"
        confirmLabel="Delete"
        message={`Are you sure you want to delete ${contractor.name}? This action cannot be undone. The contractor will lose all access immediately.`}
      />

    </>
  );
}
