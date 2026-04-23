import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  Image,
  File,
  ExternalLink,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ShieldX,
  FileX,
} from 'lucide-react';
import { getDocument } from '../../api/documents';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import type { Document } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function FileTypeIcon({ blobUrl }: { blobUrl: string }) {
  const ext = blobUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf')
    return <FileText className="h-12 w-12 text-lng-red" strokeWidth={1.5} />;
  if (ext === 'doc' || ext === 'docx')
    return <FileText className="h-12 w-12 text-lng-blue" strokeWidth={1.5} />;
  if (ext === 'xls' || ext === 'xlsx')
    return <FileSpreadsheet className="h-12 w-12 text-green-600" strokeWidth={1.5} />;
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png')
    return <Image className="h-12 w-12 text-purple-600" strokeWidth={1.5} />;
  return <File className="h-12 w-12 text-lng-grey" strokeWidth={1.5} />;
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

export default function DocumentViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [openStatus, setOpenStatus] = useState<'idle' | 'opened' | 'blocked'>('idle');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contractor-document', id],
    queryFn: () => getDocument(id!),
    enabled: !!id,
    retry: false,
  });

  // Update browser tab title
  useEffect(() => {
    if (data?.title) {
      document.title = `${data.title} — LNG Canada`;
    }
    return () => {
      document.title = 'LNG Canada';
    };
  }, [data?.title]);

  // Auto-open document after 500ms when data loads
  useEffect(() => {
    if (!data?.document_url) return;
    const t = setTimeout(() => {
      const win = window.open(data.document_url!, '_blank', 'noopener,noreferrer');
      setOpenStatus(win ? 'opened' : 'blocked');
    }, 500);
    return () => clearTimeout(t);
  }, [data?.document_url]);

  // ── Loading ──
  if (isLoading) {
    return (
      <CenteredState>
        <Spinner size="lg" />
        <p className="text-sm text-lng-grey mt-2">Loading document…</p>
      </CenteredState>
    );
  }

  // ── Error ──
  if (isError || !data) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;

    if (status === 403) {
      return (
        <CenteredState>
          <ShieldX className="h-14 w-14 text-lng-red" strokeWidth={1.5} />
          <div>
            <h2 className="text-xl font-bold text-lng-blue mb-1">Access Denied</h2>
            <p className="text-sm text-lng-grey max-w-sm">
              You do not have permission to view this document.
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
          <FileX className="h-14 w-14 text-lng-red" strokeWidth={1.5} />
          <div>
            <h2 className="text-xl font-bold text-lng-blue mb-1">Document Not Found</h2>
            <p className="text-sm text-lng-grey max-w-sm">
              This document could not be found or is no longer available.
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
            Unable to load this document. Please try again.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Try Again
        </Button>
      </CenteredState>
    );
  }

  // ── Document metadata card ──
  const categoryLabel = data.category?.name ?? 'Uncategorized';

  const handleOpen = () => {
    const win = window.open(data.document_url!, '_blank', 'noopener,noreferrer');
    setOpenStatus(win ? 'opened' : 'blocked');
  };

  return (
    <div className="flex flex-col items-center py-8 px-4">
      {/* Back link */}
      <div className="w-full max-w-2xl mb-6">
        <button
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 text-sm text-lng-blue hover:text-lng-blue/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-sm border border-gray-100 p-8 overflow-hidden">

        {/* 54° angle accent — bottom right corner */}
        <div
          className="absolute bottom-0 right-0 w-40 h-40 pointer-events-none rounded-br-lg overflow-hidden"
          aria-hidden="true"
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '160px',
              height: '160px',
              background:
                'linear-gradient(54deg, transparent 48%, #D2DCDF 48%, #D2DCDF 52%, transparent 52%)',
            }}
          />
        </div>

        {/* File type icon */}
        <div className="flex justify-center mb-4">
          <FileTypeIcon blobUrl={data.document_url ?? ''} />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-lng-grey text-center leading-snug mb-2">
          {data.title}
        </h1>

        {/* Description */}
        {data.description && (
          <p className="text-sm text-lng-grey italic text-center line-clamp-3 mb-4">
            {data.description}
          </p>
        )}

        <hr className="border-gray-100 my-5" />

        {/* Metadata row */}
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-lng-grey">
          <span>{categoryLabel}</span>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span>Uploaded {formatDate(data.created_at)}</span>
        </div>

        <hr className="border-gray-100 my-5" />

        {/* Auto-open status notice */}
        {openStatus === 'opened' && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-4">
            <CheckCircle className="h-4 w-4 flex-none" />
            Document opened in a new tab.
          </div>
        )}
        {openStatus === 'blocked' && (
          <div className="flex items-center justify-center gap-2 text-sm text-lng-orange mb-4">
            <AlertTriangle className="h-4 w-4 flex-none" />
            Popup was blocked. Click the button below to open the document.
          </div>
        )}

        {/* Open button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleOpen}
        >
          <ExternalLink className="h-4 w-4" />
          Open Document
        </Button>

        {/* Note */}
        <p className="flex items-center justify-center gap-1.5 text-xs text-lng-grey mt-3">
          <Info className="h-3.5 w-3.5 flex-none" />
          Document will open in a new tab.
        </p>
      </div>
    </div>
  );
}
