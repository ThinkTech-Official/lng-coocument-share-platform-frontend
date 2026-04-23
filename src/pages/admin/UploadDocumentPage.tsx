import { useState, useEffect, useRef } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useForm, useController, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Upload, FileText, FileSpreadsheet,
  Image as ImageIcon, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Document } from '../../types';
import { getCategories } from '../../api/categories';
import { getDepartments } from '../../api/departments';
import apiClient from '../../api/axios';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';

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

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    title:             z.string().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
    description:       z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
    category_id:       z.string().min(1, 'Please select a category'),
    department_access: z.enum(['ALL', 'RESTRICTED']),
    department_ids:    z.array(z.string()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.department_access === 'RESTRICTED' && (!data.department_ids || data.department_ids.length === 0)) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Select at least one department',
        path:    ['department_ids'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function getFileIcon(file: File) {
  const t = file.type;
  if (t === 'application/pdf')                           return { Icon: FileText,       cls: 'text-lng-red'     };
  if (t.includes('wordprocessingml') || t === 'application/msword') return { Icon: FileText, cls: 'text-lng-blue'    };
  if (t.includes('spreadsheetml') || t === 'application/vnd.ms-excel') return { Icon: FileSpreadsheet, cls: 'text-green-600' };
  if (t.startsWith('image/'))                            return { Icon: ImageIcon,       cls: 'text-purple-600'  };
  return { Icon: FileText, cls: 'text-lng-grey' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadDocumentPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [file, setFile]           = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [progress, setProgress]   = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    document.title = 'Upload Document — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // ─── Queries ──────────────────────────────────────────────────────────────

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

  // ─── Form ─────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: {
      title:             '',
      description:       '',
      category_id:       '',
      department_access: 'ALL',
      department_ids:    [],
    },
    mode: 'onSubmit',
  });

  const descValue = useWatch({ control, name: 'description' }) ?? '';
  const charCount  = descValue.length;

  const { field: accessField } = useController({ name: 'department_access', control });

  const {
    field:      deptIdsField,
    fieldState: { error: deptIdsError },
  } = useController({ name: 'department_ids', control, defaultValue: [] });

  const watchAccess = accessField.value;

  const toggleDepartment = (id: string) => {
    const cur = deptIdsField.value ?? [];
    deptIdsField.onChange(
      cur.includes(id) ? cur.filter((d) => d !== id) : [...cur, id],
    );
  };

  // ─── Upload mutation ──────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setProgress(0);
      const resp = await apiClient.post<Document>('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total ?? evt.loaded));
          setProgress(pct);
        },
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSubmitted(true);
      toast.success('Document uploaded successfully');
      navigate('/admin/documents');
    },
    onError: (error: unknown) => {
      const resp = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (resp?.status === 400) {
        toast.error(resp.data?.message ?? 'Upload failed. Please try again.');
      } else {
        toast.error('Upload failed. Please try again.');
      }
      setProgress(null);
    },
  });

  const isUploading = uploadMutation.isPending;

  // ─── File handling ────────────────────────────────────────────────────────

  const validateAndSetFile = (f: File) => {
    setFileError(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError('File type not supported. Please upload PDF, DOC, DOCX, XLS, XLSX, JPG or PNG.');
      return;
    }
    if (f.size > MAX_SIZE) {
      setFileError('File size exceeds 50 MB limit.');
      return;
    }
    setFile(f);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (--dragCounterRef.current === 0) setDragOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop     = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  // ─── Unsaved changes blocker ──────────────────────────────────────────────

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !submitted &&
      (isDirty || !!file) &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  // ─── Submit ───────────────────────────────────────────────────────────────

  const onSubmit = (data: FormValues) => {
    if (!file) {
      setFileError('Please select a file to upload.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', data.title);
    if (data.description) fd.append('description', data.description);
    fd.append('category_id', data.category_id);
    fd.append('department_access', data.department_access);
    if (data.department_access === 'RESTRICTED' && data.department_ids) {
      data.department_ids.forEach((id) => fd.append('department_ids[]', id));
    }
    uploadMutation.mutate(fd);
  };

  const fileIcon = file ? getFileIcon(file) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Upload Document"
        subtitle="Add a new document to the platform"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/documents')}
            disabled={isUploading}
          >
            <ArrowLeft size={14} />
            Back to Documents
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Left: Document details ──────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-sm font-bold text-lng-grey">Document Details</h2>
              </div>

              <div className="space-y-5">

                {/* Title */}
                <Input
                  label="Title"
                  type="text"
                  placeholder="Enter document title"
                  disabled={isUploading}
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
                    disabled={isUploading}
                    className={`
                      w-full resize-y rounded border px-3 py-2 text-sm text-lng-grey
                      placeholder:text-gray-400
                      border-gray-300 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                      disabled:bg-gray-50 disabled:text-gray-400
                      ${errors.description ? 'border-lng-red focus:border-lng-red focus:ring-lng-red' : ''}
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
                      disabled={isUploading}
                      className={`
                        w-full rounded border px-3 py-2 text-sm text-lng-grey
                        focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                        disabled:bg-gray-50 disabled:text-gray-400
                        ${errors.category_id
                          ? 'border-lng-red focus:border-lng-red focus:ring-lng-red'
                          : 'border-gray-300'}
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

                {/* Department Access toggle */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-lng-grey">
                    Department Access <span className="text-lng-red">*</span>
                  </span>
                  <div className="inline-flex overflow-hidden rounded border border-gray-300">
                    {(['ALL', 'RESTRICTED'] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={isUploading}
                        onClick={() => {
                          accessField.onChange(val);
                          if (val === 'ALL') deptIdsField.onChange([]);
                        }}
                        className={`
                          px-5 py-2 text-sm font-medium transition-colors
                          ${watchAccess === val
                            ? 'bg-lng-blue text-white'
                            : 'bg-white text-lng-grey hover:bg-gray-50'}
                        `}
                      >
                        {val === 'ALL' ? 'All Departments' : 'Restricted'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department checkboxes — animated slide down */}
                <div
                  style={{
                    maxHeight:  watchAccess === 'RESTRICTED' ? '600px' : '0',
                    overflow:   'hidden',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-lng-grey">
                      Allowed Departments <span className="text-lng-red">*</span>
                    </label>
                    {deptsLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Spinner size="sm" />
                        <span className="text-sm text-gray-400">Loading departments…</span>
                      </div>
                    ) : departments.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No departments available.{' '}
                        <button
                          type="button"
                          className="text-lng-blue underline hover:no-underline"
                          onClick={() => navigate('/admin/departments')}
                        >
                          Create a department
                        </button>
                      </p>
                    ) : (
                      <div className="max-h-52 overflow-y-auto rounded border border-gray-200">
                        {departments.map((dept) => {
                          const checked = (deptIdsField.value ?? []).includes(dept.id);
                          return (
                            <label
                              key={dept.id}
                              className={`
                                flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm
                                transition-colors select-none
                                ${checked ? 'bg-lng-blue-20' : 'hover:bg-gray-50'}
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isUploading}
                                onChange={() => toggleDepartment(dept.id)}
                                className="h-4 w-4 rounded border-gray-300 text-lng-blue focus:ring-lng-blue"
                              />
                              <span className="text-lng-grey">{dept.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {deptIdsError && (
                      <p className="text-xs text-lng-red">{deptIdsError.message}</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ── Right: Upload zone ──────────────────────────────────────── */}
          <div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-sm font-bold text-lng-grey">Document File</h2>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) validateAndSetFile(f);
                  e.target.value = '';
                }}
              />

              {/* Drop zone */}
              {!file ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && !isUploading && fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={!isUploading ? handleDrop : undefined}
                  className={`
                    flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                    p-8 text-center transition-all duration-200
                    ${isUploading
                      ? 'pointer-events-none cursor-not-allowed opacity-50'
                      : 'cursor-pointer'}
                    ${dragOver
                      ? 'border-lng-blue bg-lng-blue-20 cursor-copy'
                      : 'border-lng-blue-40 hover:border-lng-blue hover:bg-lng-blue-20'}
                  `}
                >
                  <Upload size={40} className="mb-3 text-lng-blue-40" />
                  <p className="mb-1 text-sm font-medium text-lng-grey">
                    Drag and drop your file here
                  </p>
                  <p className="mb-4 text-xs text-gray-400">or click to browse</p>
                  <p className="text-xs leading-relaxed text-gray-400">
                    Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG
                  </p>
                  <p className="text-xs text-gray-400">Max size: 50 MB</p>
                </div>
              ) : (
                /* Selected file display */
                <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 p-6 text-center">
                  {fileIcon && <fileIcon.Icon size={40} className={fileIcon.cls} />}
                  <div className="w-full">
                    <p
                      className="break-all text-sm font-bold text-lng-grey"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    title="Remove file"
                    disabled={isUploading}
                    onClick={() => { setFile(null); setFileError(null); }}
                    className="flex items-center gap-1.5 text-xs text-lng-red hover:underline disabled:opacity-40"
                  >
                    <X size={13} />
                    Remove file
                  </button>
                </div>
              )}

              {/* File error */}
              {fileError && (
                <p className="mt-2 text-xs text-lng-red">{fileError}</p>
              )}
            </div>
          </div>

        </div>

        {/* ── Upload progress bar ────────────────────────────────────────── */}
        {progress !== null && (
          <div className="mt-6">
            <p className="mb-1.5 text-sm text-lng-grey">Uploading… {progress}%</p>
            <div className="h-2 overflow-hidden rounded-full bg-lng-blue-20">
              <div
                className="h-2 rounded-full bg-lng-blue transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Form actions ───────────────────────────────────────────────── */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => navigate('/admin/documents')}
          >
            Cancel
          </Button>
          {progress === null && (
            <Button
              type="submit"
              variant="primary"
              disabled={!file || catsLoading || deptsLoading}
            >
              <Upload size={15} />
              Upload Document
            </Button>
          )}
        </div>
      </form>

      {/* ── Unsaved changes dialog ─────────────────────────────────────── */}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Discard Upload"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>Keep Editing</Button>
            <Button variant="danger"  onClick={() => blocker.proceed?.()}>Discard</Button>
          </>
        }
      >
        <p className="text-sm text-lng-grey">
          You have unsaved changes. Are you sure you want to leave?
        </p>
      </Modal>
    </>
  );
}
