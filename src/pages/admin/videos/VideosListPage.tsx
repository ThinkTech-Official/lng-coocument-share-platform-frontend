import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import {
  Upload, Search,
  AlertCircle, Video as VideoIcon, X, Loader2,
} from 'lucide-react';

import toast from 'react-hot-toast';
import { type Video, VideoUploadStatus, type PaginatedResponse } from '../../../types';
import { getVideos, updateVideoStatus, deleteVideo } from '../../../api/videos';
import { getCategoriesPublic } from '../../../api/categories';
import { getCategoryLabel, flattenCategories } from '../../../utils/categoryHelpers';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Pagination from '../../../components/ui/Pagination';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="aspect-video animate-pulse bg-lng-blue-20" />
      <div className="p-4 space-y-3">
        {bar('h-5 w-3/4')}
        <div className="flex gap-2">
          {bar('h-6 w-20 rounded-full')}
          {bar('h-6 w-24 rounded-full')}
        </div>
        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          {bar('h-4 w-28')}
          <div className="flex gap-2">
            {bar('h-7 w-14 rounded-lg')}
            {bar('h-7 w-16 rounded-lg')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

interface VideoCardProps {
  video: Video;
  isPending: boolean;
  onGoLive: (v: Video) => void;
  onTakeOffline: (v: Video) => void;
  onDelete: (v: Video) => void;
}

function VideoCard({
  video,
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
  const catLabel    = getCategoryLabel(video.category);
  const isRestricted = video.department_access !== 'ALL';

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">

      {/* ── Thumbnail ──────────────────────────────────────────────────── */}
      <div className="relative aspect-video overflow-hidden bg-[#1a3a4a]">
        {!imgError ? (
          <img
            src={video.thumbnail_sas_url}
            alt={video.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          /* Dark teal fallback matching the screenshot */
          <div className="h-full w-full bg-[#1a3a4a]" />
        )}

        {/* UPLOADING overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 size={40} className="animate-spin text-white" />
          </div>
        )}

        {/* FAILED overlay */}
        {isFailed && <div className="absolute inset-0 bg-lng-red/30" />}

        {/* Centered play button — shown when ready */}
        {isReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <svg className="ml-1" width="22" height="22" viewBox="0 0 24 24" fill="#1a3a4a">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>
        )}

        {/* Live / Offline badge — top left white pill */}
        {isReady && (
          <div className="absolute left-3 top-3">
            {video.is_live ? (
              <button
                onClick={() => onTakeOffline(video)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800 shadow hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live
              </button>
            ) : (
              <button
                onClick={() => onGoLive(video)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Offline
              </button>
            )}
          </div>
        )}

        {/* Uploading badge */}
        {isUploading && (
          <div className="absolute left-3 top-3">
            <span className="flex items-center gap-1 rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-yellow-900">
              <Loader2 size={10} className="animate-spin" />
              Uploading...
            </span>
          </div>
        )}

        {/* Failed badge */}
        {isFailed && (
          <div className="absolute left-3 top-3">
            <span className="flex items-center gap-1 rounded-full bg-lng-red px-3 py-1 text-xs font-semibold text-white">
              <AlertCircle size={10} />
              Failed
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-3 line-clamp-2 text-base font-bold text-gray-900" title={video.title}>
          {video.title}
        </h3>

        {/* Category + access pills */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-700">
            {catLabel}
          </span>
          {isRestricted ? (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
              Restricted
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-700">
              All Departments
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-700">
              Upload Failed
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Date + actions */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-sm text-gray-400">{formatDate(video.created_at)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/admin/videos/${video.id}`)}
              disabled={isPending || isFailed}
              title={isFailed ? 'Video upload failed — delete and re-upload' : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(video)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
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
  const [page, setPage]               = useState(1);

  // Debounce search → URL (300 ms); reset page
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const val = searchInput.trim();
          if (val) next.set('search', val);
          else next.delete('search');
          next.delete('page'); // Reset to page 1
          return next;
        }, { replace: true },
      );
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, setSearchParams]);

  const setFilter = (key: string, value: string) => {
    setPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const clearFilters = () => {
    setSearchInput('');
    setPage(1);
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
    document.title = 'Videos LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // ─── API params ───────────────────────────────────────────────────────
  const isLiveForApi =
    isLiveParam === 'true' ? true : isLiveParam === 'false' ? false : undefined;

  // ─── Queries ──────────────────────────────────────────────────────────

  const {
    data: videoResponse,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['videos', { page, search: searchQuery, is_live: isLiveParam, category_id: categoryFilter, upload_status: uploadStatusFilter, access: accessFilter }],
    queryFn:  () =>
      getVideos({
        page,
        limit: 10,
        search: searchQuery || undefined,
        is_live: isLiveForApi,
        category_id: categoryFilter || undefined,
        upload_status: (uploadStatusFilter as VideoUploadStatus) || undefined,
        department_access: (accessFilter as 'ALL' | 'RESTRICTED') || undefined,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const res = query.state.data as PaginatedResponse<Video> | undefined;
      return res?.data?.some((v) => v.upload_status === VideoUploadStatus.UPLOADING)
        ? 10_000
        : false;
    },
  });

  const videos    = videoResponse?.data ?? [];
  const videoMeta = videoResponse?.meta;

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories-public'],
    queryFn:  getCategoriesPublic,
  });

  const flatCategories = useMemo(() => flattenCategories(allCategories), [allCategories]);

  const filteredVideos = videos;

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
            {flatCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.level === 0 ? cat.name : cat.level === 1 ? `  › ${cat.name}` : `    › › ${cat.name}`}
              </option>
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
        videoMeta?.total === 0 && !hasFilters ? (
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
        <>
          <div
            className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ${
              isFetching ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isPending={pendingIds.has(video.id)}
                onGoLive={handleGoLive}
                onTakeOffline={handleTakeOffline}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {videoMeta && (
            <div className="mt-6">
              <Pagination meta={videoMeta} onPageChange={setPage} isLoading={isFetching} />
            </div>
          )}
        </>
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
