import { useParams } from 'react-router-dom';
import { useWatch } from 'react-hook-form';
import {
  ArrowLeft,
  AlertCircle,
  Video as VideoIcon,
  Save,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  type Video,
  type Category,
  VideoUploadStatus,
  DepartmentAccess,
  VideoState,
} from '../../../types';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import Spinner from '../../../components/ui/Spinner';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Toggle from '../../../components/ui/Toggle';
import Input from '../../../components/ui/Input';
import { useVideoForm } from '../../../hooks/admin/useVideoForm';
import { useState } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          {bar('h-7 w-40')}
          {bar('h-4 w-64')}
        </div>
        {bar('h-9 w-40 rounded')}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left skeleton */}
        <div className="space-y-6 lg:col-span-2">
          {/* Preview card */}
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-32')}
            <div className="border-b border-gray-200 pb-2" />
            <div className="aspect-video animate-pulse rounded-lg bg-lng-blue-20" />
            {bar('h-4 w-full')}
          </div>
          {/* Edit card */}
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-36')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-10 w-full')}
            {bar('h-24 w-full')}
            {bar('h-10 w-full')}
            <div className="flex justify-end gap-3 pt-2">
              {bar('h-9 w-32 rounded')}
            </div>
          </div>
        </div>

        {/* Right skeleton */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-28')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-5 w-20')}
            {bar('h-4 w-48')}
            {bar('h-9 w-full rounded')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-40')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-6 w-28 rounded-full')}
            {bar('h-9 w-full rounded')}
            {bar('h-9 w-full rounded')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4 border border-lng-red-40">
            {bar('h-4 w-28')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-4 w-full')}
            {bar('h-9 w-full rounded')}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    video,
    videoLoading,
    videoError,
    rootCategories,
    catsLoading,
    departments,
    deptsLoading,
    form,
    localAccess,
    setLocalAccess,
    selectedDeptIds,
    deptsDirty,
    isPending,
    onSubmit,
    statusMutation,
    deptsMutation,
    deleteMutation,
    navigate,
    setSelectedDeptIds,
    toggleDeptSelection,
  } = useVideoForm(id);

  const { register, control, reset, formState: { errors, isDirty } } = form;

  // ─── Dialog state ──────────────────────────────────────────────────────
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
  const [showAllDeptConfirm, setShowAllDeptConfirm] = useState(false);


  const descValue = useWatch({ control, name: 'description' }) ?? '';

  // ─── Department access handlers ────────────────────────────────────────

  const handleAccessToggle = (value: DepartmentAccess) => {
    if (value === DepartmentAccess.ALL && localAccess === DepartmentAccess.RESTRICTED) {
      setShowAllDeptConfirm(true);
    } else {
      setLocalAccess(value);
    }
  };

  const confirmChangeToAll = () => {
    setLocalAccess(DepartmentAccess.ALL);
    setSelectedDeptIds([]);
    setShowAllDeptConfirm(false);
  };
  const isReady     = video?.upload_status === VideoUploadStatus.READY;
  const isUploading = video?.upload_status === VideoUploadStatus.UPLOADING;

  const cardHeading = (label: string, danger = false) => (
    <div className="mb-6 border-b border-gray-200 pb-4">
      <h2 className={`text-sm font-bold ${danger ? 'text-lng-red' : 'text-lng-grey'}`}>
        {label}
      </h2>
    </div>
  );

  // ─── Loading ───────────────────────────────────────────────────────────

  if (videoLoading) return <PageSkeleton />;

  // ─── Error ─────────────────────────────────────────────────────────────

  if (videoError || !video) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle size={48} className="mb-4 text-lng-red" />
        <h2 className="mb-2 text-lg font-bold text-lng-grey">Video Not Found</h2>
        <p className="mb-6 text-sm text-gray-500">This video could not be loaded.</p>
        <Button variant="outline" onClick={() => navigate('/admin/videos')}>
          <ArrowLeft size={14} />
          Back to Videos
        </Button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Video Details"
        subtitle={video.title}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/videos')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Videos
          </Button>
        }
      />

      {/* ── Upload status banners ─────────────────────────────────────────── */}
      {isUploading && (
        <div className="mb-6 space-y-1">
          <div className="flex items-center gap-3 rounded bg-lng-yellow px-4 py-3">
            <Loader2 size={18} className="shrink-0 animate-spin text-lng-grey" />
            <p className="text-sm text-lng-grey">
              This video is still being uploaded. Please wait before making changes.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Video Preview Card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Video Preview')}
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              {isReady ? (
                <div className="flex h-full w-full items-center justify-center text-white">
                  <VideoIcon size={48} className="opacity-20" />
                  <p className="absolute mt-20 text-xs opacity-50">Video player available in contractor view</p>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/50">
                  <p className="text-sm italic">Preview will be available once upload is complete</p>
                </div>
              )}
            </div>
          </div>

          {/* Edit Details card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Video Details')}
            <form onSubmit={onSubmit} noValidate>
              <div className="space-y-5">
                <Input
                  label="Title"
                  type="text"
                  placeholder="Enter video title"
                  disabled={isPending}
                  error={errors.title?.message}
                  {...register('title')}
                />

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-lng-grey" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Enter a brief description of this video"
                    disabled={isPending}
                    className={`
                      w-full resize-y rounded border px-3 py-2 text-sm text-lng-grey
                      placeholder:text-gray-400
                      focus:outline-none focus:ring-1
                      disabled:bg-gray-50 disabled:text-gray-400
                      ${errors.description
                        ? 'border-lng-red focus:border-lng-red focus:ring-lng-red'
                        : 'border-gray-300 focus:border-lng-blue focus:ring-lng-blue'}
                    `}
                    {...register('description')}
                  />
                  <div className="flex items-center justify-between">
                    {errors.description
                      ? <p className="text-xs text-lng-red">{errors.description.message}</p>
                      : <span />}
                    <p className={`text-xs ${(descValue.length > 450) ? 'text-lng-red' : 'text-lng-grey'}`}>
                      {descValue.length} / 500 characters
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-lng-grey" htmlFor="category_id">
                    Category <span className="text-lng-red">*</span>
                  </label>
                  {catsLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Spinner size="sm" />
                      <span className="text-sm text-gray-400">Loading categories…</span>
                    </div>
                  ) : (
                    <select
                      id="category_id"
                      disabled={isPending}
                      className={`
                        w-full rounded border px-3 py-2 text-sm text-lng-grey
                        focus:outline-none focus:ring-1
                        disabled:bg-gray-50 disabled:text-gray-400
                        ${errors.category_id
                          ? 'border-lng-red focus:border-lng-red focus:ring-lng-red'
                          : 'border-gray-300 focus:border-lng-blue focus:ring-lng-blue'}
                      `}
                      {...register('category_id')}
                    >
                      <option value="">Select a category</option>
                      {rootCategories.map((root: any) => (
                        <optgroup key={root.id} label={root.name}>
                          <option value={root.id}>{root.name}</option>
                          {(root.subcategories ?? [])
                            .sort((a: any, b: any) => a.sort_order - b.sort_order)
                            .map((sub: any) => (
                              <option key={sub.id} value={sub.id}>{'  '}› {sub.name}</option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                  {errors.category_id && (
                    <p className="text-xs text-lng-red">{errors.category_id.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                {isDirty && (
                  <Button type="button" variant="ghost" disabled={isPending} onClick={() => reset()}>
                    Reset Changes
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isDirty || isPending}
                  loading={isPending && !statusMutation.isPending && !deptsMutation.isPending && !deleteMutation.isPending}
                >
                  <Save size={14} />
                  Update Details
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Visibility card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Visibility')}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-lng-grey">Live Status</p>
                  <p className="text-xs text-gray-500">
                    {video.is_live ? 'Visible to contractors' : 'Hidden from contractors'}
                  </p>
                </div>
                <Toggle
                  checked={video.is_live}
                  onChange={(val) => {
                    if (!val) setShowOfflineConfirm(true);
                    else statusMutation.mutate(VideoState.PUBLISHED);
                  }}
                  disabled={isPending || !isReady}
                />
              </div>
            </div>
          </div>

          {/* Department Access card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Department Access')}
            <div className="space-y-5">
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="access"
                    checked={localAccess === DepartmentAccess.ALL}
                    onChange={() => handleAccessToggle(DepartmentAccess.ALL)}
                    disabled={isPending || !isReady}
                    className="h-4 w-4 border-gray-300 text-lng-blue focus:ring-lng-blue"
                  />
                  <span className="text-sm text-lng-grey">All Departments</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="access"
                    checked={localAccess === DepartmentAccess.RESTRICTED}
                    onChange={() => handleAccessToggle(DepartmentAccess.RESTRICTED)}
                    disabled={isPending || !isReady}
                    className="h-4 w-4 border-gray-300 text-lng-blue focus:ring-lng-blue"
                  />
                  <span className="text-sm text-lng-grey">Specific Departments</span>
                </label>
              </div>

              {localAccess === DepartmentAccess.RESTRICTED && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Select Departments
                  </p>
                  {deptsLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                      {departments.map((dept: any) => {
                        const checked = selectedDeptIds.includes(dept.id);
                        return (
                          <label key={dept.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-white">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isPending || !isReady}
                              onChange={() => toggleDeptSelection(dept.id)}
                              className="h-4 w-4 rounded border-gray-300 text-lng-blue focus:ring-lng-blue"
                            />
                            <span className="text-sm text-lng-grey">{dept.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={!deptsDirty || isPending || !isReady}
                loading={deptsMutation.isPending}
                onClick={() => deptsMutation.mutate()}
              >
                <Save size={14} />
                Save Access
              </Button>
            </div>
          </div>

          {/* Danger zone card */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-lng-red-40">
            {cardHeading('Danger Zone', true)}
            <div className="space-y-4">
              <p className="text-sm text-lng-grey">
                Permanently delete this video. This action cannot be undone.
              </p>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                disabled={isPending}
                loading={deleteMutation.isPending}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} />
                Delete Video
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info strip ────────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <span className="text-xs text-lng-grey">
          ID: <span className="font-mono">{video.id}</span>
        </span>
        <span className="hidden text-gray-300 sm:block">|</span>
        <span className="flex items-center gap-1.5 text-xs text-lng-grey">
          Status:{' '}
          <Badge
            variant={
              isReady     ? 'success'
              : isUploading ? 'warning'
              : 'danger'
            }
          >
            {isReady ? 'Ready' : isUploading ? 'Uploading' : 'Failed'}
          </Badge>
        </span>
        <span className="hidden text-gray-300 sm:block">|</span>
        <span className="text-xs text-lng-grey">
          Uploaded: <span className="font-medium">{formatDate(video.created_at)}</span>
        </span>
        <span className="hidden text-gray-300 sm:block">|</span>
        <span className="text-xs text-lng-grey">
          Last Updated: <span className="font-medium">{formatDate(video.updated_at)}</span>
        </span>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}

      <ConfirmDialog
        open={showOfflineConfirm}
        onClose={() => !statusMutation.isPending && setShowOfflineConfirm(false)}
        onConfirm={() => {
          statusMutation.mutate(VideoState.UNPUBLISHED);
          setShowOfflineConfirm(false);
        }}
        loading={statusMutation.isPending}
        title="Take Video Offline"
        message="Contractors will no longer be able to view this video."
        confirmLabel="Take Offline"
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => !deleteMutation.isPending && setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete Video"
        message={`Are you sure you want to delete "${video.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      <Modal
        open={showAllDeptConfirm}
        onClose={() => setShowAllDeptConfirm(false)}
        title="Change to All Departments"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAllDeptConfirm(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmChangeToAll}>Change Access</Button>
          </>
        }
      >
        <p className="text-sm text-lng-grey">
          All department restrictions will be removed. Every contractor will be able
          to view this video.
        </p>
      </Modal>
    </>
  );
}
