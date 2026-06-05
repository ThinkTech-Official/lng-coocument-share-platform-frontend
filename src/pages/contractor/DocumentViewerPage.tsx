import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  Image,
  File,
  ShieldX,
  FileX,
  AlertCircle,
  ExternalLink,
  Download,
  Link as LinkIcon,
} from 'lucide-react';
import { getDocument } from '../../api/documents';
import { getCategoryLabel } from '../../utils/categoryHelpers';
import { FileType } from '../../types';
import Spinner from '../../components/ui/Spinner';
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

export default function DocumentViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contractor-document', id],
    queryFn: () => getDocument(id!),
    enabled: !!id,
    retry: false,
  });

  // Update browser tab title
  useEffect(() => {
    if (data?.title) {
      document.title = `${data.title} LNG Canada`;
    }
    return () => {
      document.title = 'LNG Canada';
    };
  }, [data?.title]);

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

  const categoryLabel = getCategoryLabel(data.category);
  const isLink = data.file_type === FileType.LINK;

  return (
    <div className="flex flex-col h-full flex-1 gap-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-lng-red uppercase tracking-wider bg-lng-red/10 px-2 py-0.5 rounded-sm">
              {categoryLabel}
            </span>
            {isLink && (
              <span className="text-[10px] font-bold text-lng-blue uppercase tracking-wider bg-lng-blue/10 px-2 py-0.5 rounded-sm inline-flex items-center gap-0.5">
                <LinkIcon size={9} />
                External
              </span>
            )}
            <span className="text-xs text-lng-grey">
              Uploaded {formatDate(data.created_at)}
            </span>
          </div>
          <h1 className="text-lg font-bold text-lng-blue leading-snug">{data.title}</h1>
          {data.description && (
            <p className="text-xs text-lng-grey mt-0.5">{data.description}</p>
          )}
        </div>

        {!isLink && (
          <div className="flex items-center gap-3">
            {data.document_url && (
              <>
                <a
                  href={data.document_url}
                  download
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-lng-blue transition-colors cursor-pointer"
                  title='Download'
                >
                  <Download size={16} />
                </a>
                <a
                  href={data.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-lng-blue hover:text-lng-blue transition-colors"
                  title='Open in new tab'
                >
                  <ExternalLink size={16} />
                </a>
              </>
            )}
          </div>
        )}
      </div>

      {/* LINK type: external link card */}
      {isLink ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 py-12">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <div className="rounded-full bg-lng-blue/10 p-5">
              <LinkIcon className="h-10 w-10 text-lng-blue" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-bold text-lng-blue">External Document</h2>
            <p className="text-sm text-lng-grey">
              This document is hosted externally. Click the button below to open it in a new tab.
            </p>
            {data.document_url && (
              <a
                href={data.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded bg-lng-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-lng-blue/90 transition-colors"
              >
                <ExternalLink size={15} />
                Open Document
              </a>
            )}
          </div>
        </div>
      ) : (
        /* Embed PDF / Document in Iframe */
        data.document_url ? (
          <div className="flex-1 min-h-[600px] w-full relative bg-gray-50 border border-gray-100 rounded-sm overflow-hidden">
            <iframe
              src={`${data.document_url}#toolbar=0`}
              className="w-full h-full absolute inset-0 border-none bg-white"
              title={data.title}
            />
          </div>
        ) : (
          <CenteredState>
            <FileX className="h-14 w-14 text-lng-grey" strokeWidth={1.5} />
            <p className="text-sm text-lng-grey">No document content link is available.</p>
          </CenteredState>
        )
      )}
    </div>
  );
}
