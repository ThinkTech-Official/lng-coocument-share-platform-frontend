import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertCircle,
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Document, type Department, DocumentState, DepartmentAccess } from '../../types';
import { getDocument, updateDocument, updateDocumentStatus, deleteDocument } from '../../api/documents';
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

// ─── Local types ──────────────────────────────────────────────────────────────

interface DocumentFull extends Document {
  departments?: Department[];
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const editSchema = z.object({
  title:       z.string().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
  description: z.string().max(500, 'Description cannot exceed 500 characters'),
  category_id: z.string().min(1, 'Please select a category'),
});
type EditForm = z.infer<typeof editSchema>;

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

function sameSet(a: string[], b: string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          {bar('h-7 w-52')}
          {bar('h-4 w-72')}
        </div>
        {bar('h-9 w-44 rounded')}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left skeleton */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-40')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-10 w-full')}
            {bar('h-24 w-full')}
            {bar('h-10 w-full')}
            <div className="flex justify-end gap-3 pt-2">
              {bar('h-9 w-24 rounded')}
              {bar('h-9 w-36 rounded')}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-36')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-16 w-full rounded-lg')}
            {bar('h-9 w-full rounded')}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              {bar('h-3 w-24')}
              {bar('h-24 w-full rounded-lg')}
              {bar('h-9 w-full rounded')}
            </div>
          </div>
        </div>

        {/* Right skeleton */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-32')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-6 w-24 rounded-full')}
            {bar('h-4 w-56')}
            {bar('h-9 w-full rounded')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-40')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-6 w-28 rounded-full')}
            {bar('h-9 w-full rounded')}
            {bar('h-32 w-full rounded')}
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

export default function DocumentDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // ─── Reupload state ────────────────────────────────────────────────────
  const [reuploadFile, setReuploadFile]           = useState<File | null>(null);
  const [reuploadFileError, setReuploadFileError] = useState<string | null>(null);
  const [reuploadDragOver, setReuploadDragOver]   = useState(false);
  const [reuploadProgress, setReuploadProgress]   = useState<number | null>(null);
  const reuploadFileInputRef   = useRef<HTMLInputElement>(null);
  const reuploadDragCounterRef = useRef(0);

  // ─── Department access state ───────────────────────────────────────────
  const [origAccess, setOrigAccess]           = useState<DepartmentAccess>(DepartmentAccess.ALL);
  const [localAccess, setLocalAccess]         = useState<DepartmentAccess>(DepartmentAccess.ALL);
  const [origDeptIds, setOrigDeptIds]         = useState<string[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  // ─── Dialog state ──────────────────────────────────────────────────────
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm]       = useState(false);
  const [showAllDeptConfirm, setShowAllDeptConfirm]     = useState(false);

  // ─── Inline error state ────────────────────────────────────────────────
  const [detailsConflictError, setDetailsConflictError] = useState<string | null>(null);

  // ─── Queries ───────────────────────────────────────────────────────────

  const {
    data: doc,
    isLoading: docLoading,
    isError:   docError,
  } = useQuery({
    queryKey: ['document', id],
    queryFn:  () => getDocument(id!),
    enabled:  !!id,
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

  // ─── Edit details form ─────────────────────────────────────────────────

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

  // ─── Initialise form & dept state when doc loads ───────────────────────

  useEffect(() => {
    if (!doc) return;
    reset({
      title:       doc.title,
      description: doc.description ?? '',
      category_id: doc.category_id,
    });
    const access = doc.department_access as DepartmentAccess;
    const ids    = ((doc as DocumentFull).departments ?? []).map((d) => d.id);
    setOrigAccess(access);
    setLocalAccess(access);
    setOrigDeptIds(ids);
    setSelectedDeptIds(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  // ─── Browser tab title ─────────────────────────────────────────────────

  useEffect(() => {
    if (doc) document.title = `${doc.title} — LNG Canada`;
    return () => { document.title = 'LNG Canada'; };
  }, [doc?.title]);

  // ─── Mutations ─────────────────────────────────────────────────────────

  const updateDetailsMutation = useMutation({
    mutationFn: (data: EditForm) =>
      updateDocument(id!, {
        title:       data.title,
        description: data.description,
        category_id: data.category_id,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document details updated');
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
        setDetailsConflictError('A document with this title already exists.');
      } else {
        toast.error('Failed to update. Please try again.');
      }
    },
  });

  const reuploadMutation = useMutation({
    mutationFn: async () => {
      if (!reuploadFile) return;
      setReuploadProgress(0);
      const fd = new FormData();
      fd.append('file', reuploadFile);
      const resp = await apiClient.patch<Document>(`/documents/${id}/reupload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total ?? evt.loaded));
          setReuploadProgress(pct);
        },
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document file updated successfully');
      setReuploadFile(null);
      setReuploadProgress(null);
    },
    onError: () => {
      toast.error('Reupload failed. Please try again.');
      setReuploadProgress(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newState: DocumentState) => updateDocumentStatus(id!, newState),
    onMutate:   () => ({ prevState: doc?.state }),
    onSuccess:  (_, newState, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUnpublishConfirm(false);
      if (newState === DocumentState.PUBLISHED) {
        toast.success(
          ctx?.prevState === DocumentState.UNPUBLISHED
            ? 'Document re-published'
            : 'Document published successfully',
        );
      } else {
        toast.success('Document unpublished');
      }
    },
    onError: () => toast.error('Failed to update document status. Please try again.'),
  });

  const deptsMutation = useMutation({
    mutationFn: () =>
      apiClient
        .patch(`/documents/${id}/departments`, {
          access_type:    localAccess,
          department_ids: localAccess === DepartmentAccess.RESTRICTED ? selectedDeptIds : [],
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Department access updated');
      setOrigAccess(localAccess);
      setOrigDeptIds(localAccess === DepartmentAccess.RESTRICTED ? [...selectedDeptIds] : []);
    },
    onError: () => toast.error('Failed to update access. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(id!),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
      navigate('/admin/documents');
    },
    onError: () => toast.error('Failed to delete. Please try again.'),
  });

  // ─── Derived ───────────────────────────────────────────────────────────

  const anyPending =
    updateDetailsMutation.isPending ||
    reuploadMutation.isPending      ||
    statusMutation.isPending        ||
    deptsMutation.isPending         ||
    deleteMutation.isPending;

  const deptsDirty =
    localAccess !== origAccess || !sameSet(selectedDeptIds, origDeptIds);

  // ─── Blocker (unsaved edit details) ───────────────────────────────────

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

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
    if (dropped && !anyPending) validateAndSetReuploadFile(dropped);
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

  if (docLoading) return <PageSkeleton />;

  // ─── Error ─────────────────────────────────────────────────────────────

  if (docError || !doc) {
    return (
      <>
        <PageHeader
          title="Document Details"
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/documents')}>
              <ArrowLeft size={14} />
              Back to Documents
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle size={48} className="mb-4 text-lng-red" />
          <h2 className="mb-2 text-lg font-bold text-lng-grey">Document Not Found</h2>
          <p className="mb-6 text-sm text-gray-500">This document could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate('/admin/documents')}>
            <ArrowLeft size={14} />
            Back to Documents
          </Button>
        </div>
      </>
    );
  }

  // ─── Shared card heading ───────────────────────────────────────────────

  const cardHeading = (label: string, danger = false) => (
    <div className="mb-6 border-b border-gray-200 pb-4">
      <h2 className={`text-sm font-bold ${danger ? 'text-lng-red' : 'text-lng-grey'}`}>{label}</h2>
    </div>
  );

  // ─── File icon for current blob_url ───────────────────────────────────

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

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Document Details"
        subtitle={doc.title}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/documents')}
            disabled={anyPending}
          >
            <ArrowLeft size={14} />
            Back to Documents
          </Button>
        }
      />

      {/* ── State banner ─────────────────────────────────────────────────── */}
      {doc.state === DocumentState.DRAFT && (
        <div className="mb-6 flex items-center gap-3 rounded bg-gray-100 px-4 py-3">
          <FileText size={18} className="shrink-0 text-lng-grey" />
          <p className="text-sm text-lng-grey">
            This document is a draft and not visible to contractors.
          </p>
        </div>
      )}
      {doc.state === DocumentState.UNPUBLISHED && (
        <div className="mb-6 flex items-center gap-3 rounded bg-lng-yellow px-4 py-3">
          <EyeOff size={18} className="shrink-0 text-lng-grey" />
          <p className="text-sm text-lng-grey">
            This document is unpublished and not visible to contractors.
          </p>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left column (2/3) ─────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Edit Details card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Document Details')}

            <form
              onSubmit={handleSubmit((data) => updateDetailsMutation.mutate(data))}
              noValidate
            >
              <div className="space-y-5">

                {/* Title */}
                <Input
                  label="Title"
                  type="text"
                  placeholder="Enter document title"
                  disabled={anyPending}
                  error={errors.title?.message}
                  {...register('title')}
                />

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-lng-grey" htmlFor="description">
                    Description
                    <span className="ml-1 font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Enter a brief description of this document (optional)"
                    disabled={anyPending}
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
                      disabled={anyPending}
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
                    disabled={anyPending}
                    onClick={() => {
                      reset({
                        title:       doc.title,
                        description: doc.description ?? '',
                        category_id: doc.category_id,
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
                  disabled={!isDirty || anyPending}
                  loading={updateDetailsMutation.isPending}
                >
                  <Save size={14} />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Reupload file card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Document File')}

            {/* Current file info */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <currentFileIcon.Icon size={32} className={`shrink-0 ${currentFileIcon.cls}`} />
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-medium text-lng-grey"
                    title={currentFileName}
                  >
                    {currentFileName}
                  </p>
                  <p className="text-xs text-gray-400">Currently uploaded file</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(doc.document_url!, '_blank', 'noopener,noreferrer')}
                disabled={anyPending}
              >
                <ExternalLink size={13} />
                Open Current File
              </Button>
            </div>

            {/* Divider */}
            <div className="my-5 border-t border-gray-200" />

            {/* Replace file section */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-lng-grey">Replace File</p>
              <p className="text-xs italic text-lng-grey">
                Uploading a new file will replace the current one. The old file will remain
                in storage but will no longer be accessible.
              </p>

              {/* Hidden file input */}
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

              {/* Compact drop zone */}
              {!reuploadFile ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !anyPending && reuploadFileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && !anyPending && reuploadFileInputRef.current?.click()}
                  onDragEnter={handleReuploadDragEnter}
                  onDragLeave={handleReuploadDragLeave}
                  onDragOver={handleReuploadDragOver}
                  onDrop={!anyPending ? handleReuploadDrop : undefined}
                  className={`
                    flex items-center justify-center gap-3 rounded-lg border-2 border-dashed
                    px-4 py-5 text-center transition-all duration-200
                    ${anyPending
                      ? 'pointer-events-none cursor-not-allowed opacity-50'
                      : 'cursor-pointer'}
                    ${reuploadDragOver
                      ? 'border-lng-blue bg-lng-blue-20 cursor-copy'
                      : 'border-lng-blue-40 hover:border-lng-blue hover:bg-lng-blue-20'}
                  `}
                >
                  <Upload size={24} className="shrink-0 text-lng-blue-40" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-lng-grey">Drag & drop or click to browse</p>
                    <p className="text-xs text-gray-400">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG · Max 50 MB</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                  {reuploadFileIcon && (
                    <reuploadFileIcon.Icon size={28} className={`shrink-0 ${reuploadFileIcon.cls}`} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-lng-grey" title={reuploadFile.name}>
                      {reuploadFile.name}
                    </p>
                    <p className="text-xs text-gray-400">{formatFileSize(reuploadFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    title="Remove"
                    disabled={anyPending}
                    onClick={() => { setReuploadFile(null); setReuploadFileError(null); }}
                    className="text-lng-red hover:underline disabled:opacity-40"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {reuploadFileError && (
                <p className="text-xs text-lng-red">{reuploadFileError}</p>
              )}

              {/* Reupload progress bar */}
              {reuploadProgress !== null && (
                <div>
                  <p className="mb-1 text-sm text-lng-grey">Uploading… {reuploadProgress}%</p>
                  <div className="h-2 overflow-hidden rounded-full bg-lng-blue-20">
                    <div
                      className="h-2 rounded-full bg-lng-blue transition-all duration-300"
                      style={{ width: `${reuploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!reuploadFile || anyPending}
                loading={reuploadMutation.isPending}
                onClick={() => reuploadMutation.mutate()}
              >
                <Upload size={14} />
                Upload New Version
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right column (1/3) ────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Document state card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Document State')}

            <div className="space-y-4">
              <div>{stateBadge}</div>
              <p className="text-sm text-lng-grey">{stateDescription}</p>

              {doc.state === DocumentState.DRAFT && (
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={anyPending}
                  loading={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(DocumentState.PUBLISHED)}
                >
                  <Send size={14} />
                  Publish Document
                </Button>
              )}

              {doc.state === DocumentState.PUBLISHED && (
                <Button
                  type="button"
                  variant="danger"
                  className="w-full"
                  disabled={anyPending}
                  loading={statusMutation.isPending}
                  onClick={() => setShowUnpublishConfirm(true)}
                >
                  <EyeOff size={14} />
                  Unpublish Document
                </Button>
              )}

              {doc.state === DocumentState.UNPUBLISHED && (
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={anyPending}
                  loading={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(DocumentState.PUBLISHED)}
                >
                  <Send size={14} />
                  Re-publish Document
                </Button>
              )}
            </div>
          </div>

          {/* Department access card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {cardHeading('Department Access')}

            <div className="space-y-4">
              {/* Current access badge */}
              <div>
                {localAccess === DepartmentAccess.ALL
                  ? <Badge variant="info">All Departments</Badge>
                  : <Badge variant="neutral">Restricted</Badge>}
              </div>

              {/* Segmented toggle */}
              <div className="inline-flex overflow-hidden rounded border border-gray-300 w-full">
                {([DepartmentAccess.ALL, DepartmentAccess.RESTRICTED] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={anyPending}
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
                              disabled={anyPending}
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
                disabled={!deptsDirty || anyPending}
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
                Permanently delete this document. This action cannot be undone.
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

      {/* Unsaved edit changes */}
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
          You have unsaved changes in the document details form. Are you sure you want to leave?
        </p>
      </Modal>

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
