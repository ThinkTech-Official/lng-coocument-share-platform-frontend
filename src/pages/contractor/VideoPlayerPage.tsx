import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import ReactPlayer from 'react-player';
import {
  ArrowLeft,
  Loader2,
  ShieldX,
  VideoOff,
  AlertCircle,
} from 'lucide-react';
import { getVideo, getVideoStream } from '../../api/videos';
import Button from '../../components/ui/Button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Centered state wrapper ───────────────────────────────────────────────────

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // A) Video metadata
  const videoQuery = useQuery({
    queryKey: ['contractor-video', id],
    queryFn: () => getVideo(id!),
    enabled: !!id,
    retry: false,
  });

  // B) SAS stream URL — refetched every 50 min before 60-min expiry
  const streamQuery = useQuery({
    queryKey: ['video-stream', id],
    queryFn: () => getVideoStream(id!),
    enabled: !!id,
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
    retry: false,
  });

  // Browser tab title
  useEffect(() => {
    if (videoQuery.data?.title) {
      document.title = `${videoQuery.data.title} — LNG Canada`;
    }
    return () => {
      document.title = 'LNG Canada';
    };
  }, [videoQuery.data?.title]);

  // Clear refreshing overlay once stream refetch completes after a player error
  useEffect(() => {
    if (isRefreshing && !streamQuery.isFetching && streamQuery.data?.url) {
      setIsRefreshing(false);
    }
  }, [isRefreshing, streamQuery.isFetching, streamQuery.data?.url]);

  const handlePlayerError = () => {
    setIsRefreshing(true);
    streamQuery.refetch();
  };

  // ── Loading ──
  const isLoading = videoQuery.isLoading || streamQuery.isLoading;

  if (isLoading) {
    return (
      <div className="-mx-6 -mt-6 bg-lng-blue-20 pb-12 px-6 pt-8">
        <div className="max-w-4xl mx-auto">
          {/* 16:9 placeholder */}
          <div className="aspect-video rounded-lg bg-lng-blue flex flex-col items-center justify-center gap-3 shadow-lg mb-6">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
            <p className="text-white text-sm">Loading video…</p>
          </div>
          {/* Skeleton metadata */}
          <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-5 bg-lng-blue-20 rounded w-3/4 mb-3" />
            <div className="h-4 bg-lng-blue-20 rounded w-full mb-2" />
            <div className="h-4 bg-lng-blue-20 rounded w-2/3 mb-5" />
            <hr className="border-gray-100 my-4" />
            <div className="flex gap-6">
              <div className="h-3 bg-lng-blue-20 rounded w-24" />
              <div className="h-3 bg-lng-blue-20 rounded w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Metadata error ──
  if (videoQuery.isError) {
    const status = axios.isAxiosError(videoQuery.error)
      ? videoQuery.error.response?.status
      : undefined;

    if (status === 403) {
      return (
        <CenteredState>
          <ShieldX className="h-14 w-14 text-lng-red" strokeWidth={1.5} />
          <div>
            <h2 className="text-xl font-bold text-lng-blue mb-1">Access Denied</h2>
            <p className="text-sm text-lng-grey max-w-sm">
              You do not have permission to view this video.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/home')}>
            Back to Home
          </Button>
        </CenteredState>
      );
    }

    if (status === 404) {
      return (
        <CenteredState>
          <VideoOff className="h-14 w-14 text-lng-red" strokeWidth={1.5} />
          <div>
            <h2 className="text-xl font-bold text-lng-blue mb-1">Video Not Found</h2>
            <p className="text-sm text-lng-grey max-w-sm">
              This video could not be found or is no longer available.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/home')}>
            Back to Home
          </Button>
        </CenteredState>
      );
    }

    return (
      <CenteredState>
        <AlertCircle className="h-14 w-14 text-lng-red" strokeWidth={1.5} />
        <div>
          <h2 className="text-xl font-bold text-lng-blue mb-1">Something Went Wrong</h2>
          <p className="text-sm text-lng-grey max-w-sm">
            Unable to load this video. Please try again.
          </p>
        </div>
        <Button variant="outline" onClick={() => videoQuery.refetch()}>
          Try Again
        </Button>
      </CenteredState>
    );
  }

  // ── Stream URL error ──
  if (streamQuery.isError) {
    return (
      <CenteredState>
        <AlertCircle className="h-14 w-14 text-lng-red" strokeWidth={1.5} />
        <div>
          <h2 className="text-xl font-bold text-lng-blue mb-1">Unable to Load Video</h2>
          <p className="text-sm text-lng-grey max-w-sm">
            The video stream could not be loaded. Please try again.
          </p>
        </div>
        <Button variant="outline" onClick={() => streamQuery.refetch()}>
          Try Again
        </Button>
      </CenteredState>
    );
  }

  // ── Success ──
  const video = videoQuery.data!;
  const streamUrl = streamQuery.data!.url;
  const categoryLabel = video.category?.name ?? 'Uncategorized';

  return (
    <div className="-mx-6 -mt-6 bg-lng-blue-20 pb-12 px-6 pt-8">
      <div className="max-w-4xl mx-auto">

        {/* Back link */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-1.5 text-sm text-lng-blue hover:text-lng-blue/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </div>

        {/* Player container */}
        <div
          className="relative aspect-video rounded-lg overflow-hidden shadow-lg bg-black mb-6"
          onContextMenu={(e) => e.preventDefault()}
        >
          <ReactPlayer
            src={streamUrl}
            width="100%"
            height="100%"
            controls
            playing={false}
            disablePictureInPicture
            controlsList="nodownload"
            onError={handlePlayerError}
          />

          {/* Refresh overlay (shown when URL expired mid-playback) */}
          {isRefreshing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
              <p className="text-white text-sm">Refreshing video stream…</p>
            </div>
          )}
        </div>

        {/* Metadata card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-xl font-bold text-lng-grey leading-snug mb-2">
            {video.title}
          </h1>

          {video.description && (
            <p className="text-sm text-lng-grey mb-4">{video.description}</p>
          )}

          <hr className="border-gray-100 my-4" />

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-lng-grey">
            <span>{categoryLabel}</span>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <span>Uploaded {formatDate(video.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
