import { useState, useEffect } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertCircle,
  Video as VideoIcon,
  EyeOff,
  Save,
  Trash2,
  Radio,
  Loader2,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  type Video,
  type Department,
  type Category,
  VideoUploadStatus,
  DepartmentAccess,
} from '../../types';
import { getVideo, updateVideo, updateVideoStatus, deleteVideo } from '../../api/videos';
import { getCategories } from '../../api/categories';
import { getDepartments } from '../../api/departments';
import apiClient from '../../api/axios';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Local types ──────────────────────────────────────────────────────────────

interface VideoFull extends Video {
  departments?: Department[];
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const editSchema = z.object({
  title:       z.string().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
  category_id: z.string().min(1, 'Please select a category'),
});
type EditForm = z.infer<typeof editSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function sameSet(a: string[], b: string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

function getCategoryLabel(video: Video, allCats: Category[]): string {
  if (!video.category) return 'Uncategorized';
  const cat = video.category;
  if (!cat.parent_category_id) return cat.name;
  const parent = allCats.find((c) => c.id === cat.parent_category_id);
  return parent ? `${parent.name} > ${cat.name}` : cat.name;
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
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // ─── Department access state ───────────────────────────────────────────
  const [origAccess, setOrigAccess]           = useState<DepartmentAccess>(DepartmentAccess.ALL);
  const [localAccess, setLocalAccess]         = useState<DepartmentAccess>(DepartmentAccess.ALL);
  const [origDeptIds, setOrigDeptIds]         = useState<string[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  // ─── Dialog state ──────────────────────────────────────────────────────
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
  const [showAllDeptConfirm, setShowAllDeptConfirm] = useState(false);

  // ─── Inline error state ────────────────────────────────────────────────
  const [detailsConflictError, setDetailsConflictError] = useState<string | null>(null);

  // ─── Thumbnail error fallback ──────────────────────────────────────────
  const [thumbError, setThumbError] = useState(false);

  // ─── Queries ───────────────────────────────────────────────────────────

  const {
    data: video,
    isLoading: videoLoading,
    isError:   videoError,
    isFetching,
  } = useQuery({
    queryKey: ['video', id],
    queryFn:  () => getVideo(id!),
    enabled:  !!id,
    refetchInterval: (query) => {
      const data = query.state.data as Video | undefined;
      return data?.upload_status === VideoUploadStatus.UPLOADING ? 5_000 : false;
    },
  });

  const { data: allCategories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  getCategories,
  });

  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn:  getDepartments,
  });

  const rootCategories = allCategories
    .filter((c) => c.parent_category_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  // ─── Edit form ─────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditForm>({
    resolver:      zodResolver(editSchema),
    defaultValues: { title: '', description: '', category_id: '' },
    mode: 'onSubmit',
  });

  const descValue = useWatch({ control, name: 'description' }) ?? '';
  const charCount = descValue.length;

  // ─── Initialise form & dept state when video loads ─────────────────────

  useEffect(() => {
    if (!video) return;
    reset({
      title:       video.title,
      description: video.description ?? '',
      category_id: video.category_id,
    });
    const access = video.department_access as DepartmentAccess;
    const ids    = ((video as VideoFull).departments ?? []).map((d) => d.id);
    setOrigAccess(access);
    setLocalAccess(access);
    setOrigDeptIds(ids);
    setSelectedDeptIds(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id]);

  // ─── Browser tab title ─────────────────────────────────────────────────

  useEffect(() => {
    if (video) document.title = `${video.title} — LNG Canada`;
    return () => { document.title = 'LNG Canada'; };
  }, [video?.title]);

  // ─── Mutations ─────────────────────────────────────────────────────────

  const updateDetailsMutation = useMutation({
    mutationFn: (data: EditForm) =>
      updateVideo(id!, {
        title:       data.title,
        description: data.description,
        category_id: data.category_id,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video details updated');
      setDetailsConflictError(null);
      reset({
        title:       data.title,
        description: data.description ?? '',
        category_id: data.category_id,
      });
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setDetailsConflictError('A video with this title already exists.');
      } else {
        toast.error('Failed to update. Please try again.');
      }
    },
  });

  const liveMutation = useMutation({
    mutationFn: (is_live: boolean) => updateVideoStatus(id!, is_live),
    onSuccess: (_, is_live) => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setShowOfflineConfirm(false);
      toast.success(is_live ? 'Video is now live' : 'Video taken offline');
    },
    onError: () => toast.error('Failed to update live status. Please try again.'),
  });

  const deptsMutation = useMutation({
    mutationFn: () =>
      apiClient
        .patch(`/videos/${id}/departments`, {
          access_type:    localAccess,
          department_ids: localAccess === DepartmentAccess.RESTRICTED ? selectedDeptIds : [],
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Department access updated');
      setOrigAccess(localAccess);
      setOrigDeptIds(localAccess === DepartmentAccess.RESTRICTED ? [...selectedDeptIds] : []);
    },
    onError: () => toast.error('Failed to update access. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVideo(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video deleted successfully');
      navigate('/admin/videos');
    },
    onError: () => toast.error('Failed to delete. Please try again.'),
  });

  // ─── Derived ───────────────────────────────────────────────────────────

  const anyPending =
    updateDetailsMutation.isPending ||
    liveMutation.isPending          ||
    deptsMutation.isPending         ||
    deleteMutation.isPending;

  const deptsDirty =
    localAccess !== origAccess || !sameSet(selectedDeptIds, origDeptIds);

  // ─── Blocker (unsaved edit form) ───────────────────────────────────────

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  // ─── Department access handlers ────────────────────────────────────────

  const handleAccessToggle = (value: DepartmentAccess) => {
    if (value === DepartmentAccess.ALL && localAccess === DepartmentAccess.RESTRICTED) {
      setShowAllDeptConfirm(true);
    } else {
      setLocalAccess(value);
      if (value === DepartmentAccess.ALL) setSelectedDeptIds([]);
    }
  };

  const confirmChangeToAll = () => {
    setLocalAccess(DepartmentAccess.ALL);
    setSelectedDeptIds([]);
    setShowAllDeptConfirm(false);
  };

  const toggleDeptSelection = (deptId: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId],
    );
  };

  // ─── Loading ───────────────────────────────────────────────────────────

  if (videoLoading) return <PageSkeleton />;

  // ─── Error ─────────────────────────────────────────────────────────────

  if (videoError || !video) {
    return (
      <>
        <PageHeader
          title="Video Details"
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/videos')}>
              <ArrowLeft size={14} />
              Back to Videos
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle size={48} className="mb-4 text-lng-red" />
          <h2 className="mb-2 text-lg font-bold text-lng-grey">Video Not Found</h2>
          <p className="mb-6 text-sm text-gray-500">This video could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate('/admin/videos')}>
            <ArrowLeft size={14} />
            Back to Videos
          </Button>
        </div>
      </>
    );
  }

  // ─── Derived from video ────────────────────────────────────────────────

  const isReady     = video.upload_status === VideoUploadStatus.READY;
  const isFailed    = video.upload_status === VideoUploadStatus.FAILED;
  const isUploading = video.upload_status === VideoUploadStatus.UPLOADING;

  const catLabel = getCategoryLabel(video, allCategories);

  const cardHeading = (label: string, danger = false) => (
    <div className="mb-6 border-b border-gray-200 pb-4">
      <h2 className={`text-sm font-bold ${danger ? 'text-lng-red' : 'text-lng-grey'}`}>
        {label}
      </h2>
    </div>
  );

  // Overlay for non-READY cards
  const notReadyOverlay = !isReady ? (
    <div
      className="absolute inset-0 z-10 flex cursor-not-allowed items-center justify-center rounded-lg bg-white/70"
      title="Available once video upload is complete"
    >
      <p className="rounded bg-white px-3 py-1.5 text-xs text-lng-grey shadow">
        Available once video upload is complete
      </p>
    </div>
  ) : null;

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
            disabled={anyPending}
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
          {isFetching && (
            <p className="pl-1 text-xs text-gray-400">Checking status…</p>
          )}
        </div>
      )}

      {isFailed && (
        <div className="mb-6 flex items-center gap-3 rounded bg-lng-red-20 px-4 py-3">
          <AlertCircle size={18} className="shrink-0 text-lng-red" />
          <p className="text-sm text-lng-red">
            Video upload failed. Please delete this video and upload again.
          </p>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left column (2/3) ─────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Video preview card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Video Preview')}

            {/* Thumbnail */}
            <div className="aspect-video overflow-hidden rounded-lg bg-lng-blue-20">
              {!thumbError ? (
                <img
                  src={video.thumbnail_sas_url}
                  alt={video.title}
                  className="h-full w-full object-cover"
                  onError={() => setThumbError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <VideoIcon size={48} className="text-lng-blue-40" />
                </div>
              )}
            </div>

            {/* Info row */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-lng-grey">
              <span>
                <span className="text-gray-400">Category: </span>
                {catLabel}
              </span>
              {video.department_access === 'ALL' ? (
                <Badge variant="info">All Departments</Badge>
              ) : (
                <Badge variant="neutral">Restricted</Badge>
              )}
              <span>
                <span className="text-gray-400">Uploaded: </span>
                {formatDate(video.created_at)}
              </span>
            </div>

            {/* Security note */}
            <div className="mt-3 flex items-start gap-2">
              <Info size={13} className="mt-0.5 shrink-0 text-lng-blue" />
              <p className="text-xs italic text-lng-grey">
                Direct video URL is not exposed for security. Contractors stream via signed URLs.
              </p>
            </div>
          </div>

          {/* Edit details card */}
          <div className="relative">
            {notReadyOverlay}
            <div className={`rounded-lg bg-white p-6 shadow-sm ${!isReady ? 'pointer-events-none select-none opacity-60' : ''}`}>
              {cardHeading('Video Details')}

              <form
                onSubmit={handleSubmit((data) => updateDetailsMutation.mutate(data))}
                noValidate
              >
                <div className="space-y-5">

                  {/* Title */}
                  <Input
                    label="Title"
                    type="text"
                    placeholder="Enter video title"
                    disabled={anyPending || !isReady}
                    error={errors.title?.message}
                    {...register('title')}
                  />

                  {/* Description */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-lng-grey" htmlFor="vid-desc">
                      Description
                      <span className="ml-1 font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      id="vid-desc"
                      rows={3}
                      placeholder="Enter a brief description of this video (optional)"
                      disabled={anyPending || !isReady}
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
                      <p className={`text-xs ${charCount > 450 ? 'text-lng-red' : 'text-lng-grey'}`}>
                        {charCount} / 500 characters
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-lng-grey" htmlFor="vid-cat">
                      Category <span className="text-lng-red">*</span>
                    </label>
                    {catsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Spinner size="sm" />
                        <span className="text-sm text-gray-400">Loading categories…</span>
                      </div>
                    ) : (
                      <select
                        id="vid-cat"
                        disabled={anyPending || !isReady}
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
                        {rootCategories.map((root) => (
                          <optgroup key={root.id} label={root.name}>
                            <option value={root.id}>{root.name}</option>
                            {(root.subcategories ?? [])
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((sub) => (
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

                  {/* Inline conflict error */}
                  {detailsConflictError && (
                    <p className="text-sm text-lng-red">{detailsConflictError}</p>
                  )}

                </div>

                {/* Form actions */}
                <div className="mt-6 flex items-center justify-end gap-3">
                  {isDirty && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={anyPending || !isReady}
                      onClick={() => {
                        reset({
                          title:       video.title,
                          description: video.description ?? '',
                          category_id: video.category_id,
                        });
                        setDetailsConflictError(null);
                      }}
                    >
                      Reset Changes
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!isDirty || anyPending || !isReady}
                    loading={updateDetailsMutation.isPending}
                  >
                    <Save size={14} />
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ── Right column (1/3) ────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Live status card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Live Status')}

            <div className="space-y-4">
              {/* Current status display */}
              <div>
                {isReady ? (
                  video.is_live ? (
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm font-bold text-green-600">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-gray-400" />
                      <span className="text-sm font-bold text-lng-grey">Offline</span>
                    </div>
                  )
                ) : (
                  <Badge variant={isUploading ? 'warning' : 'danger'}>
                    {isUploading ? 'Uploading…' : 'Upload Failed'}
                  </Badge>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-lng-grey">
                {isReady
                  ? video.is_live
                    ? 'Contractors with access can stream this video.'
                    : 'Video is hidden from contractors.'
                  : 'Live toggle unavailable until upload is complete.'}
              </p>

              {/* Toggle button */}
              {isReady ? (
                video.is_live ? (
                  <Button
                    type="button"
                    variant="danger"
                    className="w-full"
                    disabled={anyPending}
                    loading={liveMutation.isPending}
                    onClick={() => setShowOfflineConfirm(true)}
                  >
                    <EyeOff size={14} />
                    Take Offline
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    disabled={anyPending}
                    loading={liveMutation.isPending}
                    onClick={() => liveMutation.mutate(true)}
                  >
                    <Radio size={14} />
                    Go Live
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled
                  title="Video must be ready before it can be made live"
                >
                  Not Available
                </Button>
              )}
            </div>
          </div>

          {/* Department access card */}
          <div className="relative">
            {notReadyOverlay}
            <div className={`rounded-lg bg-white p-6 shadow-sm ${!isReady ? 'pointer-events-none select-none opacity-60' : ''}`}>
              {cardHeading('Department Access')}

              <div className="space-y-4">
                {/* Current access badge */}
                <div>
                  {localAccess === DepartmentAccess.ALL
                    ? <Badge variant="info">All Departments</Badge>
                    : <Badge variant="neutral">Restricted</Badge>}
                </div>

                {/* Segmented toggle */}
                <div className="inline-flex w-full overflow-hidden rounded border border-gray-300">
                  {([DepartmentAccess.ALL, DepartmentAccess.RESTRICTED] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={anyPending || !isReady}
                      onClick={() => handleAccessToggle(val)}
                      className={`
                        flex-1 py-2 text-sm font-medium transition-colors
                        ${localAccess === val
                          ? 'bg-lng-blue text-white'
                          : 'bg-white text-lng-grey hover:bg-gray-50'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {val === DepartmentAccess.ALL ? 'All Departments' : 'Restricted'}
                    </button>
                  ))}
                </div>

                {/* Department checkboxes */}
                <div
                  style={{
                    maxHeight:  localAccess === DepartmentAccess.RESTRICTED ? '300px' : '0',
                    overflow:   'hidden',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  <div className="flex flex-col gap-2 pt-1">
                    <label className="text-sm font-medium text-lng-grey">
                      Allowed Departments <span className="text-lng-red">*</span>
                    </label>
                    {deptsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Spinner size="sm" />
                        <span className="text-sm text-gray-400">Loading departments…</span>
                      </div>
                    ) : departments.length === 0 ? (
                      <p className="text-sm text-gray-400">No departments available.</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto rounded border border-gray-200">
                        {departments.map((dept) => {
                          const checked = selectedDeptIds.includes(dept.id);
                          return (
                            <label
                              key={dept.id}
                              className={`
                                flex cursor-pointer items-center gap-3 px-3 py-2 text-sm
                                transition-colors select-none
                                ${checked ? 'bg-lng-blue-20' : 'hover:bg-gray-50'}
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={anyPending || !isReady}
                                onChange={() => toggleDeptSelection(dept.id)}
                                className="h-4 w-4 rounded border-gray-300 text-lng-blue focus:ring-lng-blue"
                              />
                              <span className="text-lng-grey">{dept.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={!deptsDirty || anyPending || !isReady}
                  loading={deptsMutation.isPending}
                  onClick={() => deptsMutation.mutate()}
                >
                  <Save size={14} />
                  Save Access
                </Button>
              </div>
            </div>
          </div>

          {/* Danger zone card */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-lng-red-40">
            {cardHeading('Danger Zone', true)}

            <div className="space-y-4">
              <p className="text-sm text-lng-grey">
                Permanently delete this video. The video file will remain in Azure storage
                but will no longer be accessible.
              </p>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                disabled={anyPending}
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

      {/* Unsaved edit form changes */}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Unsaved Changes"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>Keep Editing</Button>
            <Button variant="danger"  onClick={() => blocker.proceed?.()}>Discard Changes</Button>
          </>
        }
      >
        <p className="text-sm text-lng-grey">
          You have unsaved changes in the video details form. Are you sure you want to leave?
        </p>
      </Modal>

      {/* Take Offline confirm */}
      <ConfirmDialog
        open={showOfflineConfirm}
        onClose={() => !liveMutation.isPending && setShowOfflineConfirm(false)}
        onConfirm={() => liveMutation.mutate(false)}
        loading={liveMutation.isPending}
        title="Take Video Offline"
        message="Contractors will no longer be able to stream this video."
        confirmLabel="Take Offline"
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => !deleteMutation.isPending && setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete Video"
        message={`Are you sure you want to delete "${video.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      {/* Change to All Departments confirm (primary variant) */}
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
