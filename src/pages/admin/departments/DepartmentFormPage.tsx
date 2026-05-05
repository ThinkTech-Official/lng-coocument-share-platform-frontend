import { useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, AlertCircle } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/ui/PageHeader';
import { DepartmentFormSkeleton } from '../../../components/admin/departments/DepartmentFormSkeleton';
import { useDepartmentForm } from '../../../hooks/admin/useDepartmentForm';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepartmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const {
    isEdit,
    department,
    isLoading,
    isError,
    form,
    charCount,
    charWarning,
    isPending,
    onSubmit,
    navigate,
  } = useDepartmentForm(id);

  const { register, formState: { errors, isDirty } } = form;

  // ─── Loading skeleton (edit mode) ────────────────────────────────────────────

  if (isEdit && isLoading) return <DepartmentFormSkeleton />;

  // ─── Error state (edit mode) ──────────────────────────────────────────────────

  if (isEdit && (isError || !department)) {
    return (
      <>
        <PageHeader
          title="Edit Department"
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/departments')}>
              <ArrowLeft size={14} />
              Back to Departments
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle size={40} className="text-lng-red" />
          <h2 className="text-base font-semibold text-lng-grey">Department Not Found</h2>
          <p className="text-sm text-gray-500">This department could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate('/admin/departments')}>
            <ArrowLeft size={14} />
            Back to Departments
          </Button>
        </div>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const title    = isEdit ? 'Edit Department' : 'Create Department';
  const subtitle = isEdit ? (department?.name ?? '') : 'Add a new department';

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/departments')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Departments
          </Button>
        }
      />

      {/* Form card */}
      <div className="max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        {/* Card heading */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-lng-grey">
            {isEdit ? 'Edit Details' : 'Department Details'}
          </h2>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-5">

          {/* Department Name */}
          <Input
            label="Department Name"
            type="text"
            placeholder="Enter department name"
            disabled={isPending}
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-lng-grey" htmlFor="description">
              Description
              <span className="ml-1 font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Enter a brief description of this department (optional)"
              disabled={isPending}
              className={`
                w-full resize-y rounded border px-3 py-2 text-sm text-lng-grey
                placeholder:text-gray-400
                border-gray-300 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                disabled:bg-gray-50 disabled:text-gray-400
                ${errors.description ? 'border-lng-red focus:border-lng-red focus:ring-lng-red' : ''}
              `}
              {...register('description')}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="text-xs text-lng-red">{errors.description.message}</p>
              ) : (
                <span />
              )}
              <p className={`text-xs ${charWarning ? 'text-lng-red' : 'text-lng-grey'}`}>
                {charCount} / 500 characters
              </p>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => navigate('/admin/departments')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              disabled={isPending || (isEdit && !isDirty)}
            >
              {!isPending && (isEdit ? <Save size={14} /> : <Plus size={14} />)}
              {isPending
                ? (isEdit ? 'Saving...' : 'Creating...')
                : (isEdit ? 'Save Changes' : 'Create Department')}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
