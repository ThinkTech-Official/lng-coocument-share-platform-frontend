import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  EyeOff,
  Save,
  Send,
  Trash2,
  ExternalLink,
  Upload,
  X,
  Link as LinkIcon,
} from 'lucide-react';
import { DocumentState, DepartmentAccess, FileType } from '../../../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { updateDocument } from '../../../api/documents';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import Spinner from '../../../components/ui/Spinner';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Toggle from '../../../components/ui/Toggle';
import { DocumentFormSkeleton } from '../../../components/admin/documents/DocumentFormSkeleton';
import { useDocumentForm } from '../../../hooks/admin/useDocumentForm';
import Modal from '@/components/ui/Modal';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];
const MAX_SIZE = 52_428_800; // 50 MB

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function getFileIconFromUrl(url: string) {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.pdf'))                                   return { Icon: FileText,        cls: 'text-lng-red'     };
  if (path.endsWith('.doc')  || path.endsWith('.docx'))        return { Icon: FileText,        cls: 'text-lng-blue'    };
  if (path.endsWith('.xls')  || path.endsWith('.xlsx'))        return { Icon: FileSpreadsheet, cls: 'text-green-600'   };
  if (path.endsWith('.jpg')  || path.endsWith('.jpeg') || path.endsWith('.png'))
                                                               return { Icon: ImageIcon,       cls: 'text-purple-600'  };
  return { Icon: FileText, cls: 'text-lng-grey' };
}

function getFileNameFromUrl(url: string) {
  const path = url.split('?')[0];
  return decodeURIComponent(path.split('/').pop() ?? 'document');
}

function getFileIconFromFile(file: File) {
  const t = file.type;
  if (t === 'application/pdf')                                              return { Icon: FileText,        cls: 'text-lng-red'     };
  if (t.includes('wordprocessingml') || t === 'application/msword')        return { Icon: FileText,        cls: 'text-lng-blue'    };
  if (t.includes('spreadsheetml')    || t === 'application/vnd.ms-excel')  return { Icon: FileSpreadsheet, cls: 'text-green-600'   };
  if (t.startsWith('image/'))                                               return { Icon: ImageIcon,       cls: 'text-purple-600'  };
  return { Icon: FileText, cls: 'text-lng-grey' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    document: doc,
    docLoading,
    docError,
    flatCategories,
    catsLoading,
    departments,
    deptsLoading,
    form,
    reuploadFile,
    setReuploadFile,
    reuploadFileError,
    setReuploadFileError,
    reuploadProgress,
    localAccess,
    setLocalAccess,
    selectedDeptIds,
    setSelectedDeptIds,
    deptsDirty,
    isPending,
    onSubmit,
    reuploadMutation,
    statusMutation,
    deptsMutation,
    deleteMutation,
    navigate,
  } = useDocumentForm(id);

  const { register, reset, formState: { errors, isDirty } } = form;

  // ─── Link URL state (for LINK type docs) ──────────────────────────────
  const [linkUrl, setLinkUrl] = useState('');
  const [linkUrlInitialized, setLinkUrlInitialized] = useState(false);

  const queryClientForLink = useQueryClient();
  const updateLinkMutation = useMutation({
    mutationFn: () => updateDocument(id!, { external_url: linkUrl.trim() }),
    onSuccess: (data) => {
      queryClientForLink.invalidateQueries({ queryKey: ['document', id] });
      queryClientForLink.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Link updated');
      setLinkUrl(data.document_url ?? '');
    },
    onError: () => toast.error('Failed to update link. Please try again.'),
  });

  // ─── Reupload UI state ─────────────────────────────────────────────────
  const [reuploadDragOver, setReuploadDragOver] = useState(false);
  const reuploadFileInputRef = useRef<HTMLInputElement>(null);
  const reuploadDragCounterRef = useRef(0);

  // ─── Dialog state ──────────────────────────────────────────────────────
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllDeptConfirm, setShowAllDeptConfirm] = useState(false);

  // ─── Reupload handlers ─────────────────────────────────────────────────

  const validateAndSetReuploadFile = (f: File) => {
    setReuploadFileError(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      setReuploadFileError('File type not supported. Please upload PDF, DOC, DOCX, XLS, XLSX, JPG or PNG.');
      return;
    }
    if (f.size > MAX_SIZE) {
      setReuploadFileError('File size exceeds 50 MB limit.');
      return;
    }
    setReuploadFile(f);
  };

  const handleReuploadDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    reuploadDragCounterRef.current++;
    setReuploadDragOver(true);
  };
  const handleReuploadDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (--reuploadDragCounterRef.current === 0) setReuploadDragOver(false);
  };
  const handleReuploadDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleReuploadDrop = (e: React.DragEvent) => {
    e.preventDefault();
    reuploadDragCounterRef.current = 0;
    setReuploadDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && !isPending) validateAndSetReuploadFile(dropped);
  };

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

  if (docLoading) return <DocumentFormSkeleton />;

  // Initialize link URL once doc loads
  if (!linkUrlInitialized && doc && doc.file_type === FileType.LINK) {
    setLinkUrl(doc.document_url ?? '');
    setLinkUrlInitialized(true);
  }

  // ─── Error ─────────────────────────────────────────────────────────────

  if (docError || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="mb-2 text-lg font-bold text-lng-grey">Document Not Found</h2>
        <Button variant="outline" onClick={() => navigate('/admin/documents')}>
          <ArrowLeft size={14} />
          Back to Documents
        </Button>
      </div>
    );
  }

  // ─── Shared card heading ───────────────────────────────────────────────

  const cardHeading = (label: string, danger = false) => (
    <div className="mb-6 border-b border-gray-200 pb-4">
      <h2 className={`text-sm font-bold ${danger ? 'text-lng-red' : 'text-lng-grey'}`}>{label}</h2>
    </div>
  );

  // ─── File icons ───────────────────────────────────

  const currentFileIcon = getFileIconFromUrl(doc.document_url ?? '');
  const currentFileName = getFileNameFromUrl(doc.document_url ?? '');
  const reuploadFileIcon = reuploadFile ? getFileIconFromFile(reuploadFile) : null;

  // ─── State badge & description ─────────────────────────────────────────

  const stateBadge =
    doc.state === DocumentState.PUBLISHED
      ? <Badge variant="success"  className="px-3 py-1 text-sm">Published</Badge>
      : doc.state === DocumentState.DRAFT
      ? <Badge variant="neutral"  className="px-3 py-1 text-sm">Draft</Badge>
      : <Badge variant="warning"  className="px-3 py-1 text-sm">Unpublished</Badge>;

  const stateDescription =
    doc.state === DocumentState.DRAFT
      ? 'Not visible to contractors. Publish when ready.'
      : doc.state === DocumentState.PUBLISHED
      ? 'Visible to contractors with department access.'
      : 'Hidden from contractors. Can be re-published.';

  return (
    <>
      <PageHeader
        title="Document Details"
        subtitle={doc.title}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/documents')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Documents
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Edit Details card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Document Details')}

            <form onSubmit={onSubmit} noValidate>
              <div className="space-y-5">
                <Input
                  label="Title"
                  type="text"
                  placeholder="Enter document title"
                  disabled={isPending}
                  error={errors.title?.message}
                  {...register('title')}
                />

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-lng-grey" htmlFor="description">
                    Description
                    <span className="ml-1 font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Enter a brief description of this document (optional)"
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
                    <p className={`text-xs ${(form.watch('description')?.length ?? 0) > 450 ? 'text-lng-red' : 'text-lng-grey'}`}>
                      {form.watch('description')?.length ?? 0} / 500 characters
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
                      {flatCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.level === 0 ? cat.name : cat.level === 1 ? `  › ${cat.name}` : `    › › ${cat.name}`}
                        </option>
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
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => reset()}
                  >
                    Reset Changes
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isDirty || isPending}
                  loading={isPending}
                >
                  <Save size={14} />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* File card — hidden for LINK type docs */}
          {doc.file_type === FileType.LINK ? (
            /* Document Link card */
            <div className="rounded-lg bg-white p-6 shadow-sm">
              {cardHeading('Document Link')}
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-lng-blue/20 bg-lng-blue/5 px-3 py-2.5">
                  <LinkIcon size={14} className="shrink-0 text-lng-blue" />
                  <p className="text-xs text-lng-grey">This document links to an external URL. Contractors will be redirected when they open it.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-lng-grey" htmlFor="link-url">Current URL</label>
                  <input
                    id="link-url"
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    disabled={updateLinkMutation.isPending || isPending}
                    placeholder="https://example.com/document.pdf"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1 justify-center"
                    loading={updateLinkMutation.isPending}
                    disabled={!linkUrl.trim() || linkUrl.trim() === (doc.document_url ?? '') || isPending}
                    onClick={() => updateLinkMutation.mutate()}
                  >
                    <Save size={14} />
                    Update Link
                  </Button>
                  {doc.document_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.document_url!, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink size={13} />
                      Open
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Reupload file card */
            <div className="rounded-lg bg-white p-6 shadow-sm">
              {cardHeading('Document File')}
              <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <currentFileIcon.Icon size={32} className={`shrink-0 ${currentFileIcon.cls}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-lng-grey" title={currentFileName}>{currentFileName}</p>
                    <p className="text-xs text-gray-400">Currently uploaded file</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(doc.document_url!, '_blank', 'noopener,noreferrer')}
                  disabled={isPending}
                  className='text-nowrap'
                >
                  <ExternalLink size={13} />
                  Open Current File
                </Button>
              </div>

              <div className="my-5 border-t border-gray-200" />
              <div className="space-y-3">
                <p className="text-sm font-medium text-lng-grey">Replace File</p>
                <p className="text-xs italic text-lng-grey">Uploading a new file will replace the current one.</p>
                <input
                  ref={reuploadFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) validateAndSetReuploadFile(f);
                    e.target.value = '';
                  }}
                />
                {!reuploadFile ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !isPending && reuploadFileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && !isPending && reuploadFileInputRef.current?.click()}
                    onDragEnter={handleReuploadDragEnter}
                    onDragLeave={handleReuploadDragLeave}
                    onDragOver={handleReuploadDragOver}
                    onDrop={handleReuploadDrop}
                    className={`flex items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-all duration-200 ${isPending ? 'pointer-events-none opacity-50' : 'cursor-pointer'} ${reuploadDragOver ? 'border-lng-blue bg-lng-blue-20' : 'border-lng-blue-40 hover:border-lng-blue hover:bg-lng-blue-20'}`}
                  >
                    <Upload size={24} className="shrink-0 text-lng-blue-40" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-lng-grey">Drag & drop or click to browse</p>
                      <p className="text-xs text-gray-400">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG · Max 50 MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                    {reuploadFileIcon && <reuploadFileIcon.Icon size={28} className={`shrink-0 ${reuploadFileIcon.cls}`} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-lng-grey" title={reuploadFile.name}>{reuploadFile.name}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(reuploadFile.size)}</p>
                    </div>
                    <button type="button" disabled={isPending} onClick={() => { setReuploadFile(null); setReuploadFileError(null); }} className="text-lng-red hover:underline disabled:opacity-40">
                      <X size={16} />
                    </button>
                  </div>
                )}
                {reuploadFileError && <p className="text-xs text-lng-red">{reuploadFileError}</p>}
                {reuploadProgress !== null && (
                  <div>
                    <p className="mb-1 text-sm text-lng-grey">Uploading… {reuploadProgress}%</p>
                    <div className="h-2 overflow-hidden rounded-full bg-lng-blue-20">
                      <div className="h-2 rounded-full bg-lng-blue transition-all duration-300" style={{ width: `${reuploadProgress}%` }} />
                    </div>
                  </div>
                )}
                <Button type="button" variant="primary" className="w-full justify-center" loading={reuploadMutation.isPending} disabled={!reuploadFile || isPending} onClick={() => reuploadMutation.mutate()}>
                  <Upload size={14} />
                  Upload New Version
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column (1/3) ─────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Visibility & State')}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-lng-grey">Status</span>
              {stateBadge}
            </div>
            <p className="mb-5 text-xs text-gray-400 leading-relaxed">{stateDescription}</p>
            {doc.state === DocumentState.DRAFT ? (
              <Button type="button" variant="primary" className="w-full justify-center" loading={statusMutation.isPending} disabled={isPending} onClick={() => statusMutation.mutate(DocumentState.PUBLISHED)}>
                <Send size={14} />
                Publish Document
              </Button>
            ) : doc.state === DocumentState.PUBLISHED ? (
              <Button type="button" variant="outline" className="w-full justify-center text-lng-red hover:bg-lng-red-20" disabled={isPending} onClick={() => setShowUnpublishConfirm(true)}>
                <EyeOff size={14} />
                Unpublish
              </Button>
            ) : (
              <Button type="button" variant="primary" className="w-full justify-center" loading={statusMutation.isPending} disabled={isPending} onClick={() => statusMutation.mutate(DocumentState.PUBLISHED)}>
                <Send size={14} />
                Re-publish
              </Button>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Department Access')}
            <div className="mb-5 space-y-4">
              <Toggle label="Restrict Access" description="Limit visibility to specific departments." checked={localAccess === DepartmentAccess.RESTRICTED} onChange={(checked) => handleAccessToggle(checked ? DepartmentAccess.RESTRICTED : DepartmentAccess.ALL)} disabled={isPending} />
              {localAccess === DepartmentAccess.RESTRICTED && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-lng-grey">Allowed Departments:</p>
                  {deptsLoading ? <Spinner size="sm" /> : (
                    <div className="max-h-48 overflow-y-auto rounded border border-gray-200 divide-y divide-gray-100">
                      {departments.map((dept) => {
                        const checked = selectedDeptIds.includes(dept.id);
                        return (
                          <label key={dept.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${checked ? 'bg-lng-blue-20' : 'hover:bg-gray-50'}`}>
                            <input type="checkbox" checked={checked} disabled={isPending} onChange={() => toggleDeptSelection(dept.id)} className="h-3.5 w-3.5 rounded border-gray-300 text-lng-blue" />
                            <span className="text-lng-grey">{dept.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={!deptsDirty || isPending}
                loading={deptsMutation.isPending}
                onClick={() => deptsMutation.mutate()}
              >
                <Save size={14} />
                Save Access
              </Button>
            </div>

            {/* Danger zone card */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-lng-red-40">
            {cardHeading('Danger Zone', true)}

            <div className="space-y-4">
              <p className="text-sm text-lng-grey">
                Permanently delete this document. This action cannot be undone.
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
                Delete Document
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info strip ────────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <span className="text-xs text-lng-grey">
          ID: <span className="font-mono">{doc.id}</span>
        </span>
        <span className="hidden text-gray-300 sm:block">|</span>
        <span className="text-xs text-lng-grey">
          Uploaded: <span className="font-medium">{formatDate(doc.created_at)}</span>
        </span>
        <span className="hidden text-gray-300 sm:block">|</span>
        <span className="text-xs text-lng-grey">
          Last Updated: <span className="font-medium">{formatDate(doc.updated_at)}</span>
        </span>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}

      {/* Unpublish confirm */}
      <ConfirmDialog
        open={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={() => statusMutation.mutate(DocumentState.UNPUBLISHED)}
        title="Unpublish Document"
        message="Contractors will no longer be able to view this document."
        confirmLabel="Unpublish"
        loading={statusMutation.isPending}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Document"
        message={`Are you sure you want to delete "${doc.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />

      {/* Change to All Departments confirm (primary variant) */}
      <Modal
        open={showAllDeptConfirm}
        onClose={() => setShowAllDeptConfirm(false)}
        title="Change to All Departments"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAllDeptConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmChangeToAll}>
              Change Access
            </Button>
          </>
        }
      >
        <p className="text-sm text-lng-grey">
          All department restrictions will be removed. Every contractor will be able
          to view this document.
        </p>
      </Modal>
    </>
  );
}
