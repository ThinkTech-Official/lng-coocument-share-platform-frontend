import { useRef, useState } from 'react';
import { useWatch, useController } from 'react-hook-form';
import { ArrowLeft, Upload, Film, X, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/ui/PageHeader';
import Spinner from '../../../components/ui/Spinner';
import Toggle from '../../../components/ui/Toggle';
import { useVideoForm } from '../../../hooks/admin/useVideoForm';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadVideoPage() {
  const {
    rootCategories,
    catsLoading,
    departments,
    deptsLoading,
    form,
    file: videoFile,
    setFile: setVideoFile,
    fileError: videoFileError,
    setFileError: setVideoFileError,
    validateAndSetVideo,
    progress,
    videoDuration,
    setVideoDuration,
    thumbFile,
    setThumbFile,
    thumbPreview,
    thumbFileError,
    setThumbFileError,
    highlightThumb,
    setHighlightThumb,
    validateAndSetThumb,
    isPending,
    onSubmit,
    navigate,
  } = useVideoForm();

  const { register, control, formState: { errors } } = form;

  const [dragOver, setDragOver] = useState(false);
  const [thumbDragOver, setThumbDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const thumbDragCounterRef = useRef(0);

  const descValue = useWatch({ control, name: 'description' }) ?? '';
  const charCount = descValue.length;

  const { field: accessField } = useController({ name: 'department_access', control });
  const { field: deptIdsField, fieldState: { error: deptIdsError } } = useController({ name: 'department_ids', control });

  const watchAccess = accessField.value;

  const toggleDepartment = (id: string) => {
    const cur = deptIdsField.value ?? [];
    deptIdsField.onChange(
      cur.includes(id) ? cur.filter((d) => d !== id) : [...cur, id],
    );
  };

  // ─── Video Drop ────────────────────────────────────────────────────────

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
    if (dropped) validateAndSetVideo(dropped);
  };

  // ─── Thumbnail Drop ───────────────────────────────────────────────────────

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
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetThumb(dropped);
  };

  return (
    <>
      <PageHeader
        title="Upload Video"
        subtitle="Add a new video tutorial or presentation"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/videos')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Videos
          </Button>
        }
      />

      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Left: Video details ─────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-sm font-bold text-lng-grey">Video Details</h2>
              </div>

              <div className="space-y-5">
                <Input
                  label="Title"
                  type="text"
                  placeholder="Enter video title"
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
                    placeholder="Enter a brief description of this video (optional)"
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

                <div className="flex flex-col gap-2">
                  <Toggle
                    label="Restrict Access"
                    description="Only allow specific departments to view this video."
                    checked={watchAccess === 'RESTRICTED'}
                    onChange={(checked) => {
                      const val = checked ? 'RESTRICTED' : 'ALL';
                      accessField.onChange(val);
                      if (val === 'ALL') deptIdsField.onChange([]);
                    }}
                    disabled={isPending}
                  />
                </div>

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

          {/* ── Right: Upload zone ──────────────────────────────────────── */}
          <div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-sm font-bold text-lng-grey">Video File</h2>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) validateAndSetVideo(f);
                  e.target.value = '';
                }}
              />

              {!videoFile ? (
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
                    ${isPending
                      ? 'pointer-events-none cursor-not-allowed opacity-50'
                      : 'cursor-pointer'}
                    ${dragOver
                      ? 'border-lng-blue bg-lng-blue-20 cursor-copy'
                      : 'border-lng-blue-40 hover:border-lng-blue hover:bg-lng-blue-20'}
                  `}
                >
                  <Upload size={40} className="mb-3 text-lng-blue-40" />
                  <p className="mb-1 text-sm font-medium text-lng-grey">
                    Drag and drop your video here
                  </p>
                  <p className="mb-4 text-xs text-gray-400">or click to browse</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 p-5 text-center">
                  <Film size={36} className="text-lng-blue" />
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
                    disabled={isPending}
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
              {!thumbFile && (
                <div className="mb-4 flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-lng-red" />
                  <p className="text-xs text-lng-red">
                    Required — upload is blocked without a thumbnail
                  </p>
                </div>
              )}

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
                  onClick={() => !isPending && thumbInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && !isPending && thumbInputRef.current?.click()}
                  onDragEnter={handleThumbDragEnter}
                  onDragLeave={handleThumbDragLeave}
                  onDragOver={handleThumbDragOver}
                  onDrop={!isPending ? handleThumbDrop : undefined}
                  className={`
                    flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                    p-6 text-center transition-all duration-200
                    ${isPending
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
                      disabled={isPending}
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
              disabled={isPending}
              onClick={() => navigate('/admin/videos')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                !videoFile || !thumbFile || catsLoading || deptsLoading || isPending
              }
            >
              <Upload size={15} />
              Upload Video
            </Button>
          </div>
        )}
      </form>

    </>
  );
}
