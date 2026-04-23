import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import {
  Upload, Search, Pencil, EyeOff, Trash2,
  AlertCircle, Video as VideoIcon, X, Radio, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Video, type Category, VideoUploadStatus } from '../../types';
import { getVideos, updateVideoStatus, deleteVideo } from '../../api/videos';
import { getCategories } from '../../api/categories';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getCategoryLabel(video: Video, allCats: Category[]): string {
  if (!video.category) return 'Uncategorized';
  const cat = video.category;
  if (!cat.parent_category_id) return cat.name;
  const parent = allCats.find((c) => c.id === cat.parent_category_id);
  return parent ? `${parent.name} > ${cat.name}` : cat.name;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="aspect-video animate-pulse bg-lng-blue-20" />
      <div className="space-y-2 p-4">
        {bar('h-4 w-3/4')}
        {bar('h-3 w-1/2')}
        {bar('h-5 w-24 rounded-full')}
        {bar('h-3 w-28')}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 p-4">
        {bar('h-7 w-14 rounded')}
        {bar('h-7 w-20 rounded')}
        <div className="ml-auto">{bar('h-7 w-7 rounded')}</div>
      </div>
    </div>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

interface VideoCardProps {
  video: Video;
  allCategories: Category[];
  isPending: boolean;
  onGoLive: (v: Video) => void;
  onTakeOffline: (v: Video) => void;
  onDelete: (v: Video) => void;
}

function VideoCard({
  video,
  allCategories,
  isPending,
  onGoLive,
  onTakeOffline,
  onDelete,
}: VideoCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const isFailed    = video.upload_status === VideoUploadStatus.FAILED;
  const isUploading = video.upload_status === VideoUploadStatus.UPLOADING;
  const isReady     = video.upload_status === VideoUploadStatus.READY;
  const catLabel    = getCategoryLabel(video, allCategories);
  const isUncategorized = !video.category;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">

      {/* ── Thumbnail ──────────────────────────────────────────────────── */}
      <div className="relative aspect-video overflow-hidden bg-lng-blue-20">
        {!imgError ? (
          <img
            src={video.thumbnail_sas_url}
            alt={video.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <VideoIcon size={40} className="text-lng-blue-40" />
          </div>
        )}

        {/* UPLOADING overlay — semi-transparent with spinner */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 size={40} className="animate-spin text-white" />
          </div>
        )}

        {/* FAILED overlay — red tint */}
        {isFailed && (
          <div className="absolute inset-0 bg-lng-red/30" />
        )}

        {/* Upload status badge — top left */}
        {isUploading && (
          <div className="absolute left-2 top-2">
            <span className="flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-medium text-yellow-900">
              <Loader2 size={10} className="animate-spin" />
              Uploading...
            </span>
          </div>
        )}
        {isFailed && (
          <div className="absolute left-2 top-2">
            <span className="flex items-center gap-1 rounded-full bg-lng-red px-2 py-0.5 text-xs font-medium text-white">
              <AlertCircle size={10} />
              Failed
            </span>
          </div>
        )}

        {/* Live status badge — top right (READY only) */}
        {isReady && (
          <div className="absolute right-2 top-2">
            {video.is_live ? (
              <span className="flex items-center gap-1.5 rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-medium text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Live
              </span>
            ) : (
              <span className="rounded-full bg-gray-500 px-2.5 py-0.5 text-xs font-medium text-white">
                Offline
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Card body ──────────────────────────────────────────────────── */}
      <div className="flex-1 p-4">
        <h3 className="mb-1 line-clamp-2 text-sm font-bold text-lng-grey" title={video.title}>
          {video.title}
        </h3>
        <p className={`mb-2 text-xs ${isUncategorized ? 'italic text-gray-400' : 'text-lng-grey'}`}>
          {catLabel}
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {video.department_access === 'ALL' ? (
            <Badge variant="info">All Departments</Badge>
          ) : (
            <Badge variant="neutral">Restricted</Badge>
          )}
          {isFailed && <Badge variant="danger">Upload Failed</Badge>}
        </div>
        <p className="text-xs text-gray-400">{formatDate(video.created_at)}</p>
      </div>

      {/* ── Card footer ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-t border-gray-100 p-4">

        {/* Edit */}
        <Button
          variant="outline"
          size="sm"
          disabled={isPending || isFailed}
          title={isFailed ? 'Video upload failed — delete and re-upload' : undefined}
          onClick={() => navigate(`/admin/videos/${video.id}`)}
        >
          <Pencil size={13} />
          Edit
        </Button>

        {/* Live toggle */}
        {isReady ? (
          video.is_live ? (
            <Button
              variant="danger"
              size="sm"
              disabled={isPending}
              onClick={() => onTakeOffline(video)}
            >
              <EyeOff size={13} />
              Take Offline
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={() => onGoLive(video)}
            >
              <Radio size={13} />
              Go Live
            </Button>
          )
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            title={
              isFailed
                ? 'Video upload failed — delete and re-upload'
                : isUploading
                ? 'Video is still uploading'
                : 'Video is not ready yet'
            }
          >
            <Radio size={13} />
            {video.is_live ? 'Take Offline' : 'Go Live'}
          </Button>
        )}

        {/* Delete — icon-only for normal cards, full danger button for FAILED */}
        {isFailed ? (
          <Button
            variant="danger"
            size="sm"
            disabled={isPending}
            onClick={() => onDelete(video)}
            className="ml-auto"
          >
            <Trash2 size={13} />
            Delete
          </Button>
        ) : (
          <button
            title="Delete"
            disabled={isPending}
            onClick={() => onDelete(video)}
            className="ml-auto rounded p-1.5 text-lng-red transition-colors hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideosListPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // ─── URL-persisted filters ────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery        = searchParams.get('search') ?? '';
  const isLiveParam        = searchParams.get('is_live') ?? '';
  const uploadStatusFilter = searchParams.get('upload_status') ?? '';
  const categoryFilter     = searchParams.get('category_id') ?? '';
  const accessFilter       = searchParams.get('access') ?? '';

  const [searchInput, setSearchInput] = useState(() => searchQuery);

  // Debounce search → URL (300 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput) next.set('search', searchInput);
          else next.delete('search');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, setSearchParams]);

  const setFilter = (key: string, value: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const hasFilters = !!(searchInput || isLiveParam || uploadStatusFilter || categoryFilter || accessFilter);

  // ─── Dialog & pending state ───────────────────────────────────────────
  const [offlineTarget, setOfflineTarget] = useState<Video | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Video | null>(null);
  const [pendingIds,    setPendingIds]    = useState<Set<string>>(new Set());

  const addPending    = (id: string) => setPendingIds((p) => new Set(p).add(id));
  const removePending = (id: string) =>
    setPendingIds((p) => { const n = new Set(p); n.delete(id); return n; });

  // ─── Page title ───────────────────────────────────────────────────────
  useEffect(() => {
    document.title = 'Videos — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // ─── API params ───────────────────────────────────────────────────────
  const isLiveForApi =
    isLiveParam === 'true' ? true : isLiveParam === 'false' ? false : undefined;

  // ─── Queries ──────────────────────────────────────────────────────────

  const {
    data: videos,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['videos', { search: searchQuery, is_live: isLiveParam, category_id: categoryFilter }],
    queryFn:  () =>
      getVideos({
        ...(searchQuery              && { search: searchQuery }),
        ...(isLiveForApi !== undefined && { is_live: isLiveForApi }),
        ...(categoryFilter           && { category_id: categoryFilter }),
      } as Parameters<typeof getVideos>[0]),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const data = query.state.data as Video[] | undefined;
      return data?.some((v) => v.upload_status === VideoUploadStatus.UPLOADING)
        ? 10_000
        : false;
    },
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  getCategories,
  });

  const rootCategories = useMemo(
    () =>
      [...allCategories]
        .filter((c) => c.parent_category_id === null)
        .sort((a, b) => a.sort_order - b.sort_order),
    [allCategories],
  );

  // ─── Client-side filters ──────────────────────────────────────────────

  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    let result = videos;
    if (uploadStatusFilter) result = result.filter((v) => v.upload_status === uploadStatusFilter);
    if (accessFilter)       result = result.filter((v) => v.department_access === accessFilter);
    return result;
  }, [videos, uploadStatusFilter, accessFilter]);

  // ─── Mutations ────────────────────────────────────────────────────────

  const liveMutation = useMutation({
    mutationFn: ({ id, is_live }: { id: string; is_live: boolean }) =>
      updateVideoStatus(id, is_live),
    onMutate:  ({ id }) => addPending(id),
    onSuccess: (_, { is_live }) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setOfflineTarget(null);
      toast.success(is_live ? 'Video is now live' : 'Video taken offline');
    },
    onError:   () => toast.error('Failed to update video status. Please try again.'),
    onSettled: (_, __, { id }) => removePending(id),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVideo(id),
    onMutate:  (id) => addPending(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video deleted successfully');
      setDeleteTarget(null);
    },
    onError:   () => toast.error('Failed to delete video. Please try again.'),
    onSettled: (_, __, id) => removePending(id),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleGoLive      = (v: Video) => liveMutation.mutate({ id: v.id, is_live: true });
  const handleTakeOffline = (v: Video) => setOfflineTarget(v);
  const handleDelete      = (v: Video) => setDeleteTarget(v);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Videos"
        subtitle="Manage platform videos"
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/videos/upload')}>
            <Upload size={15} />
            Upload Video
          </Button>
        }
      />

      {/* ── Search & filter bar ──────────────────────────────────────────── */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm space-y-3">

        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            placeholder="Search by video title"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Live status */}
          <select
            value={isLiveParam}
            onChange={(e) => setFilter('is_live', e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          >
            <option value="">All</option>
            <option value="true">Live</option>
            <option value="false">Offline</option>
          </select>

          {/* Upload status */}
          <select
            value={uploadStatusFilter}
            onChange={(e) => setFilter('upload_status', e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          >
            <option value="">All Statuses</option>
            <option value="READY">Ready</option>
            <option value="UPLOADING">Uploading</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setFilter('category_id', e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          >
            <option value="">All Categories</option>
            {rootCategories.map((root) => (
              <optgroup key={root.id} label={root.name}>
                <option value={root.id}>{root.name}</option>
                {(root.subcategories ?? [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {'  '}› {sub.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>

          {/* Access */}
          <select
            value={accessFilter}
            onChange={(e) => setFilter('access', e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
          >
            <option value="">All Access</option>
            <option value="ALL">All Departments</option>
            <option value="RESTRICTED">Restricted</option>
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={14} />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle size={36} className="mb-3 text-lng-red" />
          <p className="mb-4 text-sm text-lng-grey">
            Failed to load videos. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!isLoading && !isError && filteredVideos.length === 0 && (
        !videos || videos.length === 0 ? (
          <div>
            <EmptyState
              icon={VideoIcon}
              title="No videos yet"
              message="Upload your first video to get started."
            />
            <div className="-mt-4 flex justify-center pb-6">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/admin/videos/upload')}
              >
                <Upload size={14} />
                Upload Video
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={VideoIcon}
            title="No videos found"
            message="Try adjusting your search or filters."
          />
        )
      )}

      {/* ── Video grid ────────────────────────────────────────────────────── */}
      {!isLoading && !isError && filteredVideos.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ${
            isFetching ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              allCategories={allCategories}
              isPending={pendingIds.has(video.id)}
              onGoLive={handleGoLive}
              onTakeOffline={handleTakeOffline}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}

      {/* Take Offline confirm */}
      <ConfirmDialog
        open={!!offlineTarget}
        onClose={() => !liveMutation.isPending && setOfflineTarget(null)}
        onConfirm={() =>
          offlineTarget &&
          liveMutation.mutate({ id: offlineTarget.id, is_live: false })
        }
        loading={liveMutation.isPending}
        title="Take Video Offline"
        message="Contractors will no longer be able to view this video."
        confirmLabel="Take Offline"
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Delete Video"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone. The video file will remain in storage.`}
        confirmLabel="Delete"
      />
    </>
  );
}
