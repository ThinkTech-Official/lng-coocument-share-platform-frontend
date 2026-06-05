import { useRef, useState } from 'react';
import { useWatch, useController } from 'react-hook-form';
import {
  ArrowLeft, Upload, FileText, FileSpreadsheet,
  Image as ImageIcon, X, Link as LinkIcon,
} from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/ui/PageHeader';
import Spinner from '../../../components/ui/Spinner';
import Toggle from '../../../components/ui/Toggle';
import { useDocumentForm } from '../../../hooks/admin/useDocumentForm';

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
  const {
    flatCategories,
    catsLoading,
    departments,
    deptsLoading,
    form,
    file,
    setFile,
    fileError,
    setFileError,
    progress,
    isPending,
    onSubmit,
    navigate,
  } = useDocumentForm();

  const { register, control, formState: { errors } } = form;

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const descValue = useWatch({ control, name: 'description' }) ?? '';
  const charCount = descValue.length;

  const { field: accessField } = useController({ name: 'department_access', control });
  const { field: deptIdsField, fieldState: { error: deptIdsError } } = useController({ name: 'department_ids', control });
  const { field: docTypeField } = useController({ name: 'docType', control });

  const watchAccess = accessField.value;
  const watchDocType = docTypeField.value as 'file' | 'link';

  const toggleDepartment = (id: string) => {
    const cur = deptIdsField.value ?? [];
    deptIdsField.onChange(
      cur.includes(id) ? cur.filter((d) => d !== id) : [...cur, id],
    );
  };

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
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const fileIcon = file ? getFileIcon(file) : null;

  return (
    <>
      <PageHeader
        title="Upload Document"
        subtitle="Add a new document to the platform"
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

      <form onSubmit={onSubmit} noValidate>
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
                  disabled={isPending}
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
                    disabled={isPending}
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
                      disabled={isPending}
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

                {/* Department Access Toggle */}
                <div className="flex flex-col gap-2">
                  <Toggle
                    label="Restrict Access"
                    description="Only allow specific departments to view this document."
                    checked={watchAccess === 'RESTRICTED'}
                    onChange={(checked) => {
                      const val = checked ? 'RESTRICTED' : 'ALL';
                      accessField.onChange(val);
                      if (val === 'ALL') deptIdsField.onChange([]);
                    }}
                    disabled={isPending}
                  />
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
                        No departments available.
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
                                disabled={isPending}
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

          {/* ── Right: Upload zone / Link input ────────────────────────── */}
          <div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-5 border-b border-gray-200 pb-4">
                <h2 className="text-sm font-bold text-lng-grey mb-3">Document Source</h2>
                {/* File / Link toggle */}
                <div className="flex rounded border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { docTypeField.onChange('file'); setFile(null); setFileError(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors ${watchDocType === 'file' ? 'bg-lng-blue text-white' : 'bg-white text-lng-grey hover:bg-gray-50'}`}
                  >
                    <Upload size={12} />
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => { docTypeField.onChange('link'); setFile(null); setFileError(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors ${watchDocType === 'link' ? 'bg-lng-blue text-white' : 'bg-white text-lng-grey hover:bg-gray-50'}`}
                  >
                    <LinkIcon size={12} />
                    Paste Link
                  </button>
                </div>
              </div>

              {watchDocType === 'file' ? (
                <>
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
                      onClick={() => !isPending && fileInputRef.current?.click()}
                      onKeyDown={(e) => e.key === 'Enter' && !isPending && fileInputRef.current?.click()}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={!isPending ? handleDrop : undefined}
                      className={`
                        flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                        p-8 text-center transition-all duration-200
                        ${isPending ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'}
                        ${dragOver ? 'border-lng-blue bg-lng-blue-20 cursor-copy' : 'border-lng-blue-40 hover:border-lng-blue hover:bg-lng-blue-20'}
                      `}
                    >
                      <Upload size={40} className="mb-3 text-lng-blue-40" />
                      <p className="mb-1 text-sm font-medium text-lng-grey">Drag and drop your file here</p>
                      <p className="mb-4 text-xs text-gray-400">or click to browse</p>
                      <p className="text-xs leading-relaxed text-gray-400">Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG</p>
                      <p className="text-xs text-gray-400">Max size: 50 MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 p-6 text-center">
                      {fileIcon && <fileIcon.Icon size={40} className={fileIcon.cls} />}
                      <div className="w-full">
                        <p className="break-all text-sm font-bold text-lng-grey" title={file.name}>{file.name}</p>
                        <p className="mt-1 text-xs text-gray-400">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        title="Remove file"
                        disabled={isPending}
                        onClick={() => { setFile(null); setFileError(null); }}
                        className="flex items-center gap-1.5 text-xs text-lng-red hover:underline disabled:opacity-40"
                      >
                        <X size={13} />
                        Remove file
                      </button>
                    </div>
                  )}
                  {fileError && <p className="mt-2 text-xs text-lng-red">{fileError}</p>}
                </>
              ) : (
                /* Link input */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-lng-blue/20 bg-lng-blue/5 px-3 py-2.5">
                    <LinkIcon size={14} className="shrink-0 text-lng-blue" />
                    <p className="text-xs text-lng-grey">Paste a URL to an external document. Contractors will be redirected to this link.</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-lng-grey" htmlFor="external_url">
                      External URL <span className="text-lng-red">*</span>
                    </label>
                    <input
                      id="external_url"
                      type="url"
                      placeholder="https://example.com/document.pdf"
                      disabled={isPending}
                      className={`w-full rounded border px-3 py-2 text-sm text-lng-grey placeholder:text-gray-400 focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-400 ${errors.external_url ? 'border-lng-red focus:border-lng-red focus:ring-lng-red' : 'border-gray-300 focus:border-lng-blue focus:ring-lng-blue'}`}
                      {...register('external_url')}
                    />
                    {errors.external_url && <p className="text-xs text-lng-red">{errors.external_url.message}</p>}
                  </div>
                </div>
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
            disabled={isPending}
            onClick={() => navigate('/admin/documents')}
          >
            Cancel
          </Button>
          {progress === null && (
            <Button
              type="submit"
              variant="primary"
              disabled={(watchDocType === 'file' && !file) || catsLoading || deptsLoading || isPending}
              loading={isPending}
            >
              {watchDocType === 'link' ? <LinkIcon size={15} /> : <Upload size={15} />}
              {watchDocType === 'link' ? 'Add Link Document' : 'Upload Document'}
            </Button>
          )}
        </div>
      </form>
    </>
  );
}
