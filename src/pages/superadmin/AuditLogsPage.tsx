import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  ScrollText,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { getLogs } from '../../api/logs';
import { type Log } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 50;

const ACTION_GROUPS: { label: string; actions: string[] }[] = [
  {
    label: 'Auth',
    actions: [
      'AUTH_LOGIN_SUCCESS',
      'AUTH_LOGOUT',
      'AUTH_PASSWORD_RESET_REQUESTED',
      'AUTH_PASSWORD_RESET_COMPLETED',
    ],
  },
  {
    label: 'Admin',
    actions: [
      'ADMIN_CREATED',
      'ADMIN_UPDATED',
      'ADMIN_ACTIVATED',
      'ADMIN_DEACTIVATED',
      'ADMIN_DELETED',
    ],
  },
  {
    label: 'Contractor',
    actions: [
      'CONTRACTOR_CREATED',
      'CONTRACTOR_UPDATED',
      'CONTRACTOR_ACTIVATED',
      'CONTRACTOR_DEACTIVATED',
      'CONTRACTOR_DELETED',
      'CONTRACTOR_DEPARTMENT_UPDATED',
    ],
  },
  {
    label: 'Department',
    actions: [
      'DEPARTMENT_CREATED',
      'DEPARTMENT_UPDATED',
      'DEPARTMENT_DELETED',
    ],
  },
  {
    label: 'Category',
    actions: [
      'CATEGORY_CREATED',
      'CATEGORY_UPDATED',
      'CATEGORY_DELETED',
    ],
  },
  {
    label: 'Document',
    actions: [
      'DOCUMENT_CREATED',
      'DOCUMENT_UPDATED',
      'DOCUMENT_REUPLOADED',
      'DOCUMENT_STATUS_CHANGED',
      'DOCUMENT_DEPARTMENT_UPDATED',
      'DOCUMENT_DELETED',
      'DOCUMENT_VIEWED',
    ],
  },
  {
    label: 'Video',
    actions: [
      'VIDEO_CREATED',
      'VIDEO_UPDATED',
      'VIDEO_STATUS_CHANGED',
      'VIDEO_DEPARTMENT_UPDATED',
      'VIDEO_DELETED',
      'VIDEO_STREAMED',
    ],
  },
];

const AUTH_ACTIONS       = new Set(['AUTH_LOGIN_SUCCESS', 'AUTH_LOGOUT', 'AUTH_PASSWORD_RESET_REQUESTED', 'AUTH_PASSWORD_RESET_COMPLETED']);
const ADMIN_ACTIONS      = new Set(['ADMIN_CREATED', 'ADMIN_UPDATED', 'ADMIN_ACTIVATED', 'ADMIN_DEACTIVATED', 'ADMIN_DELETED']);
const CONTRACTOR_ACTIONS = new Set(['CONTRACTOR_CREATED', 'CONTRACTOR_UPDATED', 'CONTRACTOR_ACTIVATED', 'CONTRACTOR_DEACTIVATED', 'CONTRACTOR_DELETED', 'CONTRACTOR_DEPARTMENT_UPDATED']);
const DEPARTMENT_ACTIONS = new Set(['DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED']);
const CATEGORY_ACTIONS   = new Set(['CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED']);
const VIDEO_ACTIONS      = new Set(['VIDEO_CREATED', 'VIDEO_UPDATED', 'VIDEO_STATUS_CHANGED', 'VIDEO_DEPARTMENT_UPDATED', 'VIDEO_DELETED', 'VIDEO_STREAMED']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionColor(action: string): string {
  if (AUTH_ACTIONS.has(action))       return 'text-lng-blue';
  if (ADMIN_ACTIONS.has(action))      return 'text-purple-600';
  if (CONTRACTOR_ACTIONS.has(action)) return 'text-lng-orange';
  if (DEPARTMENT_ACTIONS.has(action)) return 'text-green-600';
  if (CATEGORY_ACTIONS.has(action))   return 'text-yellow-600';
  if (VIDEO_ACTIONS.has(action))      return 'text-pink-600';
  return 'text-lng-grey'; // Document actions + fallback
}

function truncate(value: string, len = 12): string {
  return value.length > len ? `${value.slice(0, len)}…` : value;
}

// ─── Role badge (spec: SUPERADMIN=primary/blue, ADMIN=info, CONTRACTOR=neutral) ─

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === 'SUPERADMIN' ? 'bg-lng-blue text-white' :
    role === 'ADMIN'      ? 'bg-lng-blue-20 text-lng-blue' :
                            'bg-gray-100 text-lng-grey';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}

// ─── Skeleton row (6 cols: timestamp, actor, action, target, ip, details) ─────

function SkeletonRow() {
  const bar = (w: string, h = 'h-4') => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${h} ${w}`} />
  );
  return (
    <tr>
      <td className="px-4 py-3">{bar('w-36')}</td>
      <td className="px-4 py-3">
        <div className="space-y-1.5">{bar('w-28')}{bar('w-16 h-5 rounded-full')}</div>
      </td>
      <td className="px-4 py-3">{bar('w-32')}</td>
      <td className="px-4 py-3">{bar('w-40')}</td>
      <td className="px-4 py-3">{bar('w-24')}</td>
      <td className="px-4 py-3">{bar('w-7 h-7 rounded')}</td>
    </tr>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  log: Log | null;
  onClose: () => void;
}

function DetailPanel({ log, onClose }: DetailPanelProps) {
  const [showFullUA, setShowFullUA] = useState(false);
  const isOpen = log !== null;

  // Reset UA expansion when log changes
  useEffect(() => { setShowFullUA(false); }, [log?.id]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div
        className={`fixed right-0 top-0 z-40 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:w-96 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Panel header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-5">
          <div className="min-w-0 flex-1 pr-3">
            <p className={`truncate text-sm font-semibold ${log ? actionColor(log.action_type) : 'text-lng-grey'}`}>
              {log ? formatLabel(log.action_type) : ''}
            </p>
            <p className="mt-0.5 font-mono text-xs text-gray-400">
              {log ? formatDateTime(log.created_at) : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-lng-grey"
          >
            <X size={16} />
          </button>
        </div>

        {/* Panel body */}
        {log && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-6">

              {/* Actor */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Actor</h3>
                <div className="space-y-2">
                  <p className="break-all font-mono text-xs text-lng-grey">{log.actor_id}</p>
                  <RoleBadge role={log.actor_role} />
                </div>
              </section>

              {/* Target */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Target</h3>
                <div className="space-y-1">
                  <p className="text-sm text-lng-grey">{formatLabel(log.target_type)}</p>
                  <p className="break-all font-mono text-xs text-gray-400">{log.target_id || '—'}</p>
                </div>
              </section>

              {/* Request Info */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Request Info</h3>
                <div className="space-y-3">
                  <div>
                    <p className="mb-0.5 text-xs text-gray-400">IP Address</p>
                    <p className="font-mono text-xs text-lng-grey">{log.ip_address || '—'}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-gray-400">User Agent</p>
                    <p className={`text-xs text-lng-grey ${showFullUA ? '' : 'line-clamp-2'}`}>
                      {log.user_agent || '—'}
                    </p>
                    {(log.user_agent?.length ?? 0) > 80 && (
                      <button
                        onClick={() => setShowFullUA((v) => !v)}
                        className="mt-1 text-xs text-lng-blue hover:underline"
                      >
                        {showFullUA ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Metadata */}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Metadata</h3>
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded bg-lng-blue-20 p-4 font-mono text-xs text-lng-grey">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </section>
              )}

            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Select field wrapper ─────────────────────────────────────────────────────

const selectCls = 'rounded border border-gray-300 bg-white px-3 py-2 text-sm text-lng-grey focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters from URL — apply automatically on change
  const actorRole  = searchParams.get('actor_role')  ?? '';
  const actionType = searchParams.get('action_type') ?? '';
  const dateFrom   = searchParams.get('date_from')   ?? '';
  const dateTo     = searchParams.get('date_to')     ?? '';

  // Cursor stack: [] = page 1, [c1] = page 2, [c1,c2] = page 3 …
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const closePanel = useCallback(() => setSelectedLog(null), []);

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Audit Logs — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // Reset cursor stack whenever filters change
  const filtersKey = `${actorRole}|${actionType}|${dateFrom}|${dateTo}`;
  const prevFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKey.current !== filtersKey) {
      setCursorStack([]);
      prevFiltersKey.current = filtersKey;
    }
  }, [filtersKey]);

  // Build API params
  const cursor  = cursorStack.at(-1);
  const filters = useMemo(() => ({
    ...(actorRole  ? { actor_role: actorRole }                        : {}),
    ...(actionType ? { action_type: actionType }                      : {}),
    ...(dateFrom   ? { date_from: `${dateFrom}T00:00:00.000Z` }       : {}),
    ...(dateTo     ? { date_to:   `${dateTo}T23:59:59.999Z`   }       : {}),
  }), [actorRole, actionType, dateFrom, dateTo]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['logs', filters, cursor],
    queryFn:  () => getLogs({ ...filters, cursor, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const logs        = data?.data        ?? [];
  const hasNextPage = data?.hasNextPage ?? false;
  const nextCursor  = data?.nextCursor  ?? null;
  const isFirstPage = cursorStack.length === 0;
  const hasActiveFilters = !!(actorRole || actionType || dateFrom || dateTo);

  // ─── Filter helpers ─────────────────────────────────────────────────────────

  function setFilter(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        value ? next.set(key, value) : next.delete(key);
        return next;
      },
      { replace: true }
    );
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  // ─── Pagination helpers ─────────────────────────────────────────────────────

  function scrollTableTop() {
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function goNext() {
    if (!nextCursor) return;
    const c = nextCursor;
    setCursorStack((prev) => [...prev, c]);
    scrollTableTop();
  }

  function goPrev() {
    setCursorStack((prev) => prev.slice(0, -1));
    scrollTableTop();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="All platform activity for the last 30 days"
      />

      {/* ── Filter bar card ── */}
      <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">

          {/* Actor Role */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-lng-grey">Role</label>
            <select
              value={actorRole}
              onChange={(e) => setFilter('actor_role', e.target.value)}
              className={selectCls}
            >
              <option value="">All Roles</option>
              <option value="SUPERADMIN">Superadmin</option>
              <option value="ADMIN">Admin</option>
              <option value="CONTRACTOR">Contractor</option>
            </select>
          </div>

          {/* Action Type — grouped */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-lng-grey">Action</label>
            <select
              value={actionType}
              onChange={(e) => setFilter('action_type', e.target.value)}
              className={`min-w-52 ${selectCls}`}
            >
              <option value="">All Actions</option>
              {ACTION_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.actions.map((a) => (
                    <option key={a} value={a}>{formatLabel(a)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-lng-grey">From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setFilter('date_from', e.target.value)}
              className={selectCls}
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-lng-grey">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setFilter('date_to', e.target.value)}
              className={selectCls}
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={14} />
              Clear Filters
            </Button>
          )}

        </div>
      </div>

      {/* ── Table card ── */}
      <div ref={tableRef} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">

        {/* Subtle loading bar while paginating (keepPreviousData keeps rows visible) */}
        <div className={`h-0.5 w-full overflow-hidden transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-full w-full animate-pulse bg-lng-blue" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-lng-grey">Timestamp</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-lng-grey">Actor</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-lng-grey">Action</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-lng-grey">Target</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-lng-grey">IP Address</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">

              {/* Skeleton — initial load */}
              {isLoading && Array.from({ length: 10 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}

              {/* Error */}
              {isError && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle size={24} className="text-lng-red" />
                      <p className="text-sm text-lng-grey">Failed to load logs. Please try again.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty — no activity at all */}
              {!isLoading && !isError && logs.length === 0 && !hasActiveFilters && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={ScrollText}
                      title="No activity yet"
                      message="Platform activity will appear here."
                    />
                  </td>
                </tr>
              )}

              {/* Empty — filters returned nothing */}
              {!isLoading && !isError && logs.length === 0 && hasActiveFilters && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={ScrollText as LucideIcon}
                      title="No logs found"
                      message="Try adjusting your filters."
                    />
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading && !isError && logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-lng-blue-20">

                  {/* Timestamp */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-xs text-lng-grey">{formatDateTime(log.created_at)}</span>
                  </td>

                  {/* Actor */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p
                        className="max-w-[120px] truncate font-mono text-xs text-lng-grey"
                        title={log.actor_id}
                      >
                        {truncate(log.actor_id, 14)}
                      </p>
                      <RoleBadge role={log.actor_role} />
                    </div>
                  </td>

                  {/* Action — color coded */}
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${actionColor(log.action_type)}`}>
                      {formatLabel(log.action_type)}
                    </span>
                  </td>

                  {/* Target */}
                  <td className="px-4 py-3">
                    {log.target_type ? (
                      <span className="text-xs text-lng-grey">
                        {formatLabel(log.target_type)}
                        {log.target_id && (
                          <>
                            {' '}
                            <span className="text-gray-300">•</span>
                            {' '}
                            <span
                              className="font-mono"
                              title={log.target_id}
                            >
                              {truncate(log.target_id, 10)}
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* IP */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-xs text-lng-grey">{log.ip_address || '—'}</span>
                  </td>

                  {/* Details button */}
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="View details"
                      onClick={() => setSelectedLog(log)}
                    >
                      <ChevronRight size={15} />
                    </Button>
                  </td>

                </tr>
              ))}

            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ── */}
        {!isLoading && !isError && logs.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-400">
              Showing {logs.length} {logs.length === 1 ? 'log' : 'logs'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isFirstPage || isFetching}
                onClick={goPrev}
              >
                <ChevronLeft size={14} />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || isFetching}
                onClick={goNext}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* ── Detail side panel ── */}
      <DetailPanel log={selectedLog} onClose={closePanel} />
    </>
  );
}
