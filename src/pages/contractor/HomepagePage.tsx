import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Video,
  Search,
  Play,
  Image,
  FileSpreadsheet,
  File,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getDocuments, getDocument } from '../../api/documents';
import { getVideos } from '../../api/videos';
import { getCategoriesPublic } from '../../api/categories';
import { useAuthStore } from '../../store/authStore';
import type { Document, Video as Vid, Category } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileIcon(blobUrl: string) {
  const ext = blobUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (ext === 'doc' || ext === 'docx') return <FileText className="h-5 w-5 text-blue-600" />;
  if (ext === 'xls' || ext === 'xlsx') return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return <Image className="h-5 w-5 text-purple-500" />;
  return <File className="h-5 w-5 text-lng-grey" />;
}

function buildCatMap(categories: Category[]): Map<string, Category> {
  const map = new Map<string, Category>();
  for (const cat of categories) {
    map.set(cat.id, cat);
    for (const sub of cat.subcategories ?? []) {
      map.set(sub.id, sub);
    }
  }
  return map;
}

function groupBy<T extends { category_id: string }>(
  items: T[],
  catMap: Map<string, Category>
): { cat: Category | null; label: string; items: T[] }[] {
  const groups = new Map<string | null, T[]>();
  for (const item of items) {
    const key = item.category_id ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const result: { cat: Category | null; label: string; items: T[] }[] = [];
  for (const [catId, grpItems] of groups) {
    const cat = catId ? (catMap.get(catId) ?? null) : null;
    result.push({ cat, label: cat?.name ?? 'Uncategorized', items: grpItems });
  }
  result.sort((a, b) => {
    if (!a.cat && !b.cat) return 0;
    if (!a.cat) return 1;
    if (!b.cat) return -1;
    return (a.cat.sort_order ?? 0) - (b.cat.sort_order ?? 0);
  });
  return result;
}

// ─── Skeleton cards ───────────────────────────────────────────────────────────

function SkeletonDocCard() {
  return (
    <div className="flex-none w-52 rounded-xl border border-gray-100 bg-white shadow-sm p-4 animate-pulse">
      <div className="w-7 h-7 bg-gray-200 rounded mb-3" />
      <div className="h-3.5 bg-gray-200 rounded w-full mb-1.5" />
      <div className="h-3.5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
      <div className="h-8 bg-gray-100 rounded" />
    </div>
  );
}

function SkeletonVidCard() {
  return (
    <div className="flex-none w-56 rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm animate-pulse">
      <div className="h-32 bg-gray-200" />
      <div className="p-3">
        <div className="h-3.5 bg-gray-200 rounded w-full mb-1.5" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocCard({
  doc,
  onOpen,
  isOpening,
}: {
  doc: Document;
  onOpen: () => void;
  isOpening: boolean;
}) {
  return (
    <div className="flex-none w-52 rounded-xl border border-gray-100 bg-white shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2">
        {fileIcon(doc.document_url ?? '')}
        {doc.category && (
          <span className="text-xs text-lng-grey bg-gray-100 rounded px-1.5 py-0.5 truncate max-w-[110px]">
            {doc.category.name}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-lng-blue leading-snug line-clamp-2 flex-1">
        {doc.title}
      </h3>
      {doc.description && (
        <p className="text-xs text-lng-grey truncate">{doc.description}</p>
      )}
      <button
        onClick={onOpen}
        disabled={isOpening}
        className="mt-auto w-full py-1.5 rounded-lg bg-lng-blue text-white text-xs font-medium hover:bg-lng-blue/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
      >
        {isOpening && <Loader2 className="h-3 w-3 animate-spin" />}
        Open
      </button>
    </div>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VidCard({ vid, onClick }: { vid: Vid; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      onClick={onClick}
      className="flex-none w-56 rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="relative h-32 bg-gray-100">
        {!imgErr && vid.thumbnail_sas_url ? (
          <img
            src={vid.thumbnail_sas_url}
            alt={vid.title}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-lng-blue/10">
            <Video className="h-8 w-8 text-lng-blue/30" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-5 w-5 text-lng-blue fill-lng-blue ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-lng-blue line-clamp-2 leading-snug">{vid.title}</h3>
        {vid.description && (
          <p className="text-xs text-lng-grey mt-0.5 truncate">{vid.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Category row ─────────────────────────────────────────────────────────────

function CategoryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-lng-blue mb-3">{label}</h2>
      <div className="flex gap-4 overflow-x-auto pb-3">{children}</div>
    </section>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-10 w-10 text-lng-red mb-3" />
      <p className="text-lng-grey text-sm">{message}</p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-lng-grey text-sm">{message}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomepagePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'documents' | 'videos'>('documents');
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  // Debounce search input 300 ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Queries
  const {
    data: categories = [],
  } = useQuery({
    queryKey: ['categories-public'],
    queryFn: getCategoriesPublic,
  });

  const {
    data: documents = [],
    isLoading: docsLoading,
    isError: docsError,
  } = useQuery({
    queryKey: ['contractor-documents'],
    queryFn: () => getDocuments(),
  });

  const {
    data: videos = [],
    isLoading: vidsLoading,
    isError: vidsError,
  } = useQuery({
    queryKey: ['contractor-videos'],
    queryFn: () => getVideos(),
  });

  const catMap = useMemo(() => buildCatMap(categories), [categories]);

  // Client-side search filtering
  const filteredDocs = useMemo(() => {
    if (!search) return documents;
    const q = search.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)
    );
  }, [documents, search]);

  const filteredVids = useMemo(() => {
    if (!search) return videos;
    const q = search.toLowerCase();
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        (v.description ?? '').toLowerCase().includes(q)
    );
  }, [videos, search]);

  const groupedDocs = useMemo(() => groupBy(filteredDocs, catMap), [filteredDocs, catMap]);
  const groupedVids = useMemo(() => groupBy(filteredVids, catMap), [filteredVids, catMap]);

  // Open document — logs DOCUMENT_VIEWED via GET /documents/:id
  const handleOpenDoc = useCallback(
    async (doc: Document) => {
      setOpeningDocId(doc.id);
      try {
        const fresh = await getDocument(doc.id);
        window.open(fresh.document_url!, '_blank', 'noopener,noreferrer');
      } catch {
        if (doc.document_url) {
          window.open(doc.document_url, '_blank', 'noopener,noreferrer');
        } else {
          toast.error('Could not open document');
        }
      } finally {
        setOpeningDocId(null);
      }
    },
    []
  );

  const isSearchActive = search.trim().length > 0;

  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative -mx-6 -mt-6 h-48 bg-lng-blue overflow-hidden flex items-end px-8 pb-10">
        {/* 54° diagonal decorative line motif */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(54deg, transparent 60%, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.06) 63%, transparent 63%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(54deg, transparent 70%, rgba(255,255,255,0.04) 70%, rgba(255,255,255,0.04) 74%, transparent 74%)',
          }}
        />

        <div>
          <p className="text-white/60 text-sm mb-1">Welcome back,</p>
          <h1 className="text-white text-2xl font-bold">{user?.name ?? 'Contractor'}</h1>
          <p className="text-white/50 text-xs mt-1">
            Browse documents and videos available to you
          </p>
        </div>
      </div>

      {/* ── Search card (overlaps hero) ── */}
      <div className="relative -mt-6 mx-2 bg-white rounded-xl shadow-lg p-4 mb-7">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents and videos…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-lng-grey focus:outline-none focus:ring-2 focus:ring-lng-blue/20 focus:border-lng-blue transition-colors"
          />
        </div>
      </div>

      {/* ── Tabs (hidden when searching) ── */}
      {!isSearchActive && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-lng-red text-lng-red'
                : 'border-transparent text-lng-grey hover:text-lng-blue'
            }`}
          >
            <FileText className="h-4 w-4" />
            Documents
            <span className="ml-0.5 text-xs bg-gray-100 rounded-full px-2 py-0.5 text-lng-grey">
              {documents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'videos'
                ? 'border-lng-red text-lng-red'
                : 'border-transparent text-lng-grey hover:text-lng-blue'
            }`}
          >
            <Video className="h-4 w-4" />
            Videos
            <span className="ml-0.5 text-xs bg-gray-100 rounded-full px-2 py-0.5 text-lng-grey">
              {videos.length}
            </span>
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {isSearchActive ? (
        /* Search results: flat list, two sections */
        <div>
          {/* Documents section */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-lng-grey uppercase tracking-wide mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
              <span className="text-xs font-normal normal-case tracking-normal">
                ({filteredDocs.length})
              </span>
            </h2>
            {docsError ? (
              <ErrorState message="Could not load documents." />
            ) : docsLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonDocCard key={i} />
                ))}
              </div>
            ) : filteredDocs.length === 0 ? (
              <EmptyState message={`No documents match "${search}"`} />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3">
                {filteredDocs.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    onOpen={() => handleOpenDoc(doc)}
                    isOpening={openingDocId === doc.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Videos section */}
          <div>
            <h2 className="text-sm font-semibold text-lng-grey uppercase tracking-wide mb-4 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Videos
              <span className="text-xs font-normal normal-case tracking-normal">
                ({filteredVids.length})
              </span>
            </h2>
            {vidsError ? (
              <ErrorState message="Could not load videos." />
            ) : vidsLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonVidCard key={i} />
                ))}
              </div>
            ) : filteredVids.length === 0 ? (
              <EmptyState message={`No videos match "${search}"`} />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3">
                {filteredVids.map((vid) => (
                  <VidCard
                    key={vid.id}
                    vid={vid}
                    onClick={() => navigate(`/videos/${vid.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'documents' ? (
        /* Documents tab: grouped by category, horizontal scroll rows */
        docsError ? (
          <ErrorState message="Could not load documents. Please try again." />
        ) : docsLoading ? (
          <>
            {Array.from({ length: 2 }).map((_, gi) => (
              <div key={gi} className="mb-8">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="flex gap-4 overflow-x-auto pb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonDocCard key={i} />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : documents.length === 0 ? (
          <EmptyState message="No documents are available to you yet." />
        ) : (
          groupedDocs.map((group) => (
            <CategoryRow key={group.label} label={group.label}>
              {group.items.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onOpen={() => handleOpenDoc(doc)}
                  isOpening={openingDocId === doc.id}
                />
              ))}
            </CategoryRow>
          ))
        )
      ) : (
        /* Videos tab: grouped by category, horizontal scroll rows */
        vidsError ? (
          <ErrorState message="Could not load videos. Please try again." />
        ) : vidsLoading ? (
          <>
            {Array.from({ length: 2 }).map((_, gi) => (
              <div key={gi} className="mb-8">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="flex gap-4 overflow-x-auto pb-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonVidCard key={i} />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : videos.length === 0 ? (
          <EmptyState message="No videos are available to you yet." />
        ) : (
          groupedVids.map((group) => (
            <CategoryRow key={group.label} label={group.label}>
              {group.items.map((vid) => (
                <VidCard
                  key={vid.id}
                  vid={vid}
                  onClick={() => navigate(`/videos/${vid.id}`)}
                />
              ))}
            </CategoryRow>
          ))
        )
      )}
    </div>
  );
}
