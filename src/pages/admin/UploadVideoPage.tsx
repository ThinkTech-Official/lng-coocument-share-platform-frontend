import { useState, useEffect, useRef } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useForm, useController, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Upload, Video as VideoIcon,
  Image as ImageIcon, X, Info, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type Video } from '../../types';
import { getCategories } from '../../api/categories';
import { getDepartments } from '../../api/departments';
import apiClient from '../../api/axios';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const VIDEO_TYPES  = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const VIDEO_MAX    = 2_147_483_648; // 2 GB
const THUMB_TYPES  = ['image/jpeg', 'image/png'];
const THUMB_MAX    = 10_485_760;    // 10 MB

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    title:             z.string().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
    description:       z.string().max(500, 'Description cannot exceed 500 characters'),
    category_id:       z.string().min(1, 'Please select a category'),
    department_access: z.enum(['ALL', 'RESTRICTED']),
    department_ids:    z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (
      data.department_access === 'RESTRICTED' &&
      data.department_ids.length === 0
    ) {
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
  if (bytes < 1_048_576)       return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824)   return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3_600);
  const m = Math.floor((secs % 3_600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el  = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(el.duration); };
    el.onerror          = () => { URL.revokeObjectURL(url); resolve(null); };
    el.src = url;
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadVideoPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // ─── Video file state ─────────────────────────────────────────────────
  const [videoFile,      setVideoFile]      = useState<File | null>(null);
  const [videoFileError, setVideoFileError] = useState<string | null>(null);
  const [videoDuration,  setVideoDuration]  = useState<number | null>(null);
  const [videoDragOver,  setVideoDragOver]  = useState(false);
  const videoDragCounterRef = useRef(0);
  const videoInputRef       = useRef<HTMLInputElement>(null);

  // ─── Thumbnail file state ─────────────────────────────────────────────
  const [thumbFile,        setThumbFile]        = useState<File | null>(null);
  const [thumbFileError,   setThumbFileError]   = useState<string | null>(null);
  const [thumbPreview,     setThumbPreview]      = useState<string | null>(null);
  const [thumbDragOver,    setThumbDragOver]     = useState(false);
  const [highlightThumb,   setHighlightThumb]    = useState(false);
  const thumbDragCounterRef = useRef(0);
  const thumbInputRef        = useRef<HTMLInputElement>(null);

  // ─── Upload state ─────────────────────────────────────────────────────
  const [progress,  setProgress]  = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ─── Thumbnail preview via FileReader ─────────────────────────────────
  useEffect(() => {
    if (!thumbFile) { setThumbPreview(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => setThumbPreview(e.target?.result as string);
    reader.readAsDataURL(thumbFile);
  }, [thumbFile]);

  // ─── Page title ───────────────────────────────────────────────────────
  useEffect(() => {
    document.title = 'Upload Video — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  // ─── Queries ──────────────────────────────────────────────────────────

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

  // ─── Form ─────────────────────────────────────────────────────────────

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
  const charCount = descValue.length;

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

  // ─── Upload mutation ──────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setProgress(0);
      const resp = await apiClient.post<Video>('/videos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total ?? evt.loaded));
          setProgress(pct);
        },
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setSubmitted(true);
      toast.success(
        'Video uploaded successfully. It will be available once processing completes.',
      );
      navigate('/admin/videos');
    },
    onError: (error: unknown) => {
      const resp = (error as { response?: { status?: number; data?: { message?: string } } })
        ?.response;
      if (resp?.status === 400) {
        const msg = resp.data?.message ?? '';
        if (msg.toLowerCase().includes('thumbnail')) {
          toast.error('Thumbnail is required. Please select an image before uploading.');
          setHighlightThumb(true);
        } else if (msg) {
          toast.error(msg);
        } else {
          toast.error('Upload failed. Please try again.');
        }
      } else {
        toast.error('Upload failed. Please try again.');
      }
      setProgress(null);
    },
  });

  const uploading = uploadMutation.isPending;

  // ─── Video file handlers ──────────────────────────────────────────────

  const validateAndSetVideo = async (f: File) => {
    setVideoFileError(null);
    if (!VIDEO_TYPES.includes(f.type)) {
      setVideoFileError('File type not supported. Please upload MP4, MOV or AVI.');
      return;
    }
    if (f.size > VIDEO_MAX) {
      setVideoFileError('File size exceeds 2 GB limit.');
      return;
    }
    setVideoFile(f);
    const dur = await readVideoDuration(f);
    setVideoDuration(dur);
  };

  const handleVideoDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    videoDragCounterRef.current++;
    setVideoDragOver(true);
  };
  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (--videoDragCounterRef.current === 0) setVideoDragOver(false);
  };
  const handleVideoDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    videoDragCounterRef.current = 0;
    setVideoDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !uploading) validateAndSetVideo(f);
  };

  // ─── Thumbnail file handlers ──────────────────────────────────────────

  const validateAndSetThumb = (f: File) => {
    setThumbFileError(null);
    setHighlightThumb(false);
    if (!THUMB_TYPES.includes(f.type)) {
      setThumbFileError('Please upload a JPG or PNG image.');
      return;
    }
    if (f.size > THUMB_MAX) {
      setThumbFileError('Thumbnail size exceeds 10 MB limit.');
      return;
    }
    setThumbFile(f);
  };

  const handleThumbDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    thumbDragCounterRef.current++;
    setThumbDragOver(true);
  };
  const handleThumbDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (--thumbDragCounterRef.current === 0) setThumbDragOver(false);
  };
  const handleThumbDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleThumbDrop = (e: React.DragEvent) => {
    e.preventDefault();
    thumbDragCounterRef.current = 0;
    setThumbDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !uploading) validateAndSetThumb(f);
  };

  // ─── Blocker ──────────────────────────────────────────────────────────

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !submitted &&
      (isDirty || !!videoFile || !!thumbFile) &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  // ─── Submit ───────────────────────────────────────────────────────────

  const onSubmit = (data: FormValues) => {
    if (!videoFile) {
      setVideoFileError('Please select a video file to upload.');
      return;
    }
    if (!thumbFile) {
      setThumbFileError('Please select a thumbnail image.');
      setHighlightThumb(true);
      return;
    }
    const fd = new FormData();
    fd.append('video',     videoFile);
    fd.append('thumbnail', thumbFile);
    fd.append('title',     data.title);
    if (data.description) fd.append('description', data.description);
    fd.append('category_id',       data.category_id);
    fd.append('department_access', data.department_access);
    if (data.department_access === 'RESTRICTED' && data.department_ids) {
      data.department_ids.forEach((id) => fd.append('department_ids[]', id));
    }
    uploadMutation.mutate(fd);
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Upload Video"
        subtitle="Add a new video to the platform"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/videos')}
            disabled={uploading}
          >
            <ArrowLeft size={14} />
            Back to Videos
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Left: form fields ──────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-sm font-bold text-lng-grey">Video Details</h2>
              </div>

              <div className="space-y-5">

                {/* Title */}
                <Input
                  label="Title"
                  type="text"
                  placeholder="Enter video title"
                  disabled={uploading}
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
                    placeholder="Enter a brief description of this video (optional)"
                    disabled={uploading}
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
                      disabled={uploading}
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
                        disabled={uploading}
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
                                flex cursor-pointer items-center gap-3 px-4 py-2.5
                                text-sm transition-colors select-none
                                ${checked ? 'bg-lng-blue-20' : 'hover:bg-gray-50'}
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={uploading}
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

          {/* ── Right: video zone + thumbnail zone ─────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Video file card */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 border-b border-gray-200 pb-4">
                <h2 className="text-sm font-bold text-lng-grey">Video File</h2>
              </div>

              {/* Required note */}
              <div className="mb-4 flex items-start gap-2">
                <Info size={14} className="mt-0.5 shrink-0 text-lng-blue" />
                <p className="text-xs text-lng-grey">
                  Required — video cannot be uploaded without a file
                </p>
              </div>

              {/* Hidden file input */}
              <input
                ref={videoInputRef}
                type="file"
                accept=".mp4,.mov,.avi"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) validateAndSetVideo(f);
                  e.target.value = '';
                }}
              />

              {/* Drop zone or selected file */}
              {!videoFile ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !uploading && videoInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && !uploading && videoInputRef.current?.click()}
                  onDragEnter={handleVideoDragEnter}
                  onDragLeave={handleVideoDragLeave}
                  onDragOver={handleVideoDragOver}
                  onDrop={!uploading ? handleVideoDrop : undefined}
                  className={`
                    flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                    p-8 text-center transition-all duration-200
                    ${uploading
                      ? 'pointer-events-none cursor-not-allowed opacity-50'
                      : 'cursor-pointer'}
                    ${videoDragOver
                      ? 'border-lng-blue bg-lng-blue-20 cursor-copy'
                      : 'border-lng-blue-40 hover:border-lng-blue hover:bg-lng-blue-20'}
                  `}
                >
                  <VideoIcon size={40} className="mb-3 text-lng-blue-40" />
                  <p className="mb-1 text-sm font-medium text-lng-grey">
                    Drag and drop your video here
                  </p>
                  <p className="mb-4 text-xs text-gray-400">or click to browse</p>
                  <p className="text-xs text-gray-400">Accepted: MP4, MOV, AVI</p>
                  <p className="text-xs text-gray-400">Max size: 2 GB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 p-5 text-center">
                  <VideoIcon size={36} className="text-lng-blue" />
                  <div className="w-full">
                    <p
                      className="break-all text-sm font-bold text-lng-grey"
                      title={videoFile.name}
                    >
                      {videoFile.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatFileSize(videoFile.size)}</p>
                    {videoDuration !== null && !isNaN(videoDuration) && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        Duration: {formatDuration(videoDuration)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Remove video"
                    disabled={uploading}
                    onClick={() => { setVideoFile(null); setVideoFileError(null); setVideoDuration(null); }}
                    className="flex items-center gap-1.5 text-xs text-lng-red hover:underline disabled:opacity-40"
                  >
                    <X size={13} />
                    Remove video
                  </button>
                </div>
              )}

              {videoFileError && (
                <p className="mt-2 text-xs text-lng-red">{videoFileError}</p>
              )}
            </div>

            {/* Thumbnail card */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 border-b border-gray-200 pb-4">
                <h2 className="text-sm font-bold text-lng-grey">Thumbnail Image</h2>
              </div>

              {/* Required note */}
              <div className="mb-4 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-lng-red" />
                <p className="text-xs text-lng-red">
                  Required — upload is blocked without a thumbnail
                </p>
              </div>

              {/* Hidden file input */}
              <input
                ref={thumbInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) validateAndSetThumb(f);
                  e.target.value = '';
                }}
              />

              {/* Drop zone or thumbnail preview */}
              {!thumbFile ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !uploading && thumbInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && !uploading && thumbInputRef.current?.click()}
                  onDragEnter={handleThumbDragEnter}
                  onDragLeave={handleThumbDragLeave}
                  onDragOver={handleThumbDragOver}
                  onDrop={!uploading ? handleThumbDrop : undefined}
                  className={`
                    flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                    p-6 text-center transition-all duration-200
                    ${uploading
                      ? 'pointer-events-none cursor-not-allowed opacity-50'
                      : 'cursor-pointer'}
                    ${highlightThumb
                      ? 'border-lng-red bg-lng-red-20'
                      : thumbDragOver
                      ? 'border-lng-blue bg-lng-blue-20 cursor-copy'
                      : 'border-lng-blue-40 hover:border-lng-blue hover:bg-lng-blue-20'}
                  `}
                >
                  <ImageIcon size={32} className="mb-2 text-lng-blue-40" />
                  <p className="mb-1 text-sm font-medium text-lng-grey">
                    Drag and drop thumbnail here
                  </p>
                  <p className="mb-3 text-xs text-gray-400">or click to browse</p>
                  <p className="text-xs text-gray-400">Accepted: JPG, PNG</p>
                  <p className="text-xs text-gray-400">Recommended: 1280 x 720px</p>
                </div>
              ) : (
                <div>
                  {/* Image preview */}
                  <div className="relative">
                    <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
                      {thumbPreview && (
                        <img
                          src={thumbPreview}
                          alt="Thumbnail preview"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    {/* Remove button overlaid top-right */}
                    <button
                      type="button"
                      title="Remove thumbnail"
                      disabled={uploading}
                      onClick={() => {
                        setThumbFile(null);
                        setThumbFileError(null);
                        setHighlightThumb(false);
                      }}
                      className="absolute right-2 top-2 rounded-full bg-white p-1 text-lng-red shadow hover:bg-red-50 disabled:opacity-40"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="break-all text-xs text-lng-grey" title={thumbFile.name}>
                      {thumbFile.name}
                    </p>
                    <p className="text-xs text-gray-400">{formatFileSize(thumbFile.size)}</p>
                  </div>
                </div>
              )}

              {thumbFileError && (
                <p className="mt-2 text-xs text-lng-red">{thumbFileError}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Progress bars ──────────────────────────────────────────────── */}
        {progress !== null && (
          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-1.5 text-sm text-lng-grey">Uploading video… {progress}%</p>
              <div className="h-2 overflow-hidden rounded-full bg-lng-blue-20">
                <div
                  className="h-2 rounded-full bg-lng-blue transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm text-lng-grey">
                Uploading thumbnail… {Math.min(100, progress > 0 ? 100 : 0)}%
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-lng-blue-20">
                <div
                  className="h-2 rounded-full bg-lng-blue transition-all duration-300"
                  style={{ width: progress > 0 ? '100%' : '0%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Form actions ───────────────────────────────────────────────── */}
        {progress === null && (
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => navigate('/admin/videos')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                !videoFile || !thumbFile || catsLoading || deptsLoading || uploading
              }
            >
              <Upload size={15} />
              Upload Video
            </Button>
          </div>
        )}
      </form>

      {/* ── Unsaved changes dialog ─────────────────────────────────────── */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title="Discard Upload"
        message="You have unsaved changes. Are you sure you want to leave?"
        confirmLabel="Discard"
      />
    </>
  );
}
