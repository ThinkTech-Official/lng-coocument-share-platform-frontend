import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { type Video, VideoState, VideoUploadStatus, DepartmentAccess } from '../../types';
import { getCategories } from '../../api/categories';
import { getDepartments } from '../../api/departments';
import { getVideo, updateVideo, updateVideoStatus, deleteVideo } from '../../api/videos';
import apiClient from '../../api/axios';
import { videoUploadSchema, videoEditSchema } from '../../constants/schemas';
import { type VideoUploadValues, type VideoEditValues } from '../../constants/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const MAX_VIDEO_SIZE = 104_857_600 * 5; // 500 MB

function sameSet(a: string[], b: string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

export function useVideoForm(id?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  useEffect(() => {
    document.title = isEdit
      ? 'Edit Video — LNG Canada'
      : 'Upload Video — LNG Canada';
    return () => {
      document.title = 'LNG Canada';
    };
  }, [isEdit]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const {
    data: video,
    isLoading: videoLoading,
    isError: videoError,
  } = useQuery({
    queryKey: ['video', id],
    queryFn: () => getVideo(id!),
    enabled: isEdit,
    refetchInterval: (query) => {
      const data = query.state.data as Video | undefined;
      return data?.upload_status === VideoUploadStatus.UPLOADING ? 5_000 : false;
    },
  });

  const { data: allCategories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const rootCategories = allCategories
    .filter((c) => c.parent_category_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  // ─── Form ─────────────────────────────────────────────────────────────────

  const uploadForm = useForm<VideoUploadValues>({
    resolver: zodResolver(videoUploadSchema),
    defaultValues: {
      title: '',
      description: '',
      category_id: '',
      department_access: 'ALL',
      department_ids: [],
    },
    mode: 'onSubmit',
  });

  const editForm = useForm<VideoEditValues>({
    resolver: zodResolver(videoEditSchema),
    defaultValues: { title: '', description: '', category_id: '' },
    mode: 'onSubmit',
  });

  const form = (isEdit ? editForm : uploadForm) as any;
  const { reset } = form;

  useEffect(() => {
    if (isEdit && video) {
      editForm.reset({
        title: video.title,
        description: video.description ?? '',
        category_id: video.category_id ?? video.category?.id ?? '',
      });
      const access = (video.department_access ?? DepartmentAccess.ALL) as DepartmentAccess;
      const ids = (video.departments ?? []).map((d: any) => d.id);
      setLocalAccess(access);
      setOrigAccess(access);
      setSelectedDeptIds(ids);
      setOrigDeptIds(ids);
    }
  }, [isEdit, video, editForm]);

  const toggleDeptSelection = (deptId: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId]
    );
  };

  // ─── File handling ────────────────────────────────────────────────────────

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbFileError, setThumbFileError] = useState<string | null>(null);
  const [highlightThumb, setHighlightThumb] = useState(false);


  // ─── Video validation ─────────────────────────────────────────────────────

  const validateAndSetVideo = (f: File) => {
    setFileError(null);
    if (!ALLOWED_VIDEO_TYPES.includes(f.type)) {
      setFileError('File type not supported. Please upload MP4, MOV, AVI or WEBM.');
      return;
    }
    if (f.size > MAX_VIDEO_SIZE) {
      setFileError('File size exceeds 500 MB limit.');
      return;
    }
    setFile(f);
  };

  // ─── Thumbnail cleanup ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    };
  }, [thumbPreview]);

  const validateAndSetThumb = (f: File) => {
    setThumbFileError(null);
    setHighlightThumb(false);

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(f.type)) {
      setThumbFileError('Please upload a JPG or PNG image.');
      return;
    }
    if (f.size > 2_097_152) {
      // 2MB
      setThumbFileError('Thumbnail size exceeds 2 MB limit.');
      return;
    }

    setThumbFile(f);
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbPreview(URL.createObjectURL(f));
  };

  // ─── Video duration ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!file) {
      setVideoDuration(null);
      return;
    }
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.onloadedmetadata = () => {
      setVideoDuration(videoElement.duration);
      URL.revokeObjectURL(videoElement.src);
    };
    videoElement.src = URL.createObjectURL(file);
  }, [file]);

  // ─── Department Access state (for Edit) ───────────────────────────────────

  const [origAccess, setOrigAccess] = useState<DepartmentAccess>(DepartmentAccess.ALL);
  const [localAccess, setLocalAccess] = useState<DepartmentAccess>(DepartmentAccess.ALL);
  const [origDeptIds, setOrigDeptIds] = useState<string[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  const deptsDirty = localAccess !== origAccess || !sameSet(selectedDeptIds, origDeptIds);

  // ─── Mutations ────────────────────────────────────────────────────────────

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
      toast.success('Video uploaded successfully');
      navigate('/admin/videos');
    },
    onError: (error: unknown) => {
      const resp = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
      toast.error(resp?.data?.message ?? 'Upload failed. Please try again.');
      setProgress(null);
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: (vals: VideoEditValues) => updateVideo(id!, vals),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video details updated');
      reset({
        title: data.title,
        description: data.description ?? '',
        category_id: data.category_id,
      });
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error('A video with this title already exists.');
      } else {
        toast.error('Failed to update. Please try again.');
      }
    },
  });


  const statusMutation = useMutation({
    mutationFn: (newState: VideoState) => updateVideoStatus(id!, newState === VideoState.PUBLISHED),
    onSuccess: (_, newState) => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success(newState === VideoState.PUBLISHED ? 'Video published' : 'Video unpublished');
    },
    onError: () => toast.error('Failed to update status. Please try again.'),
  });

  const deptsMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/videos/${id}/departments`, {
        access_type: localAccess,
        department_ids: localAccess === DepartmentAccess.RESTRICTED ? selectedDeptIds : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Department access updated');
      setOrigAccess(localAccess);
      setOrigDeptIds(localAccess === DepartmentAccess.RESTRICTED ? [...selectedDeptIds] : []);
    },
    onError: () => toast.error('Failed to update access. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVideo(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video deleted successfully');
      navigate('/admin/videos');
    },
    onError: () => toast.error('Failed to delete. Please try again.'),
  });

  const onSubmit = form.handleSubmit((data: any) => {
    if (isEdit) {
      updateDetailsMutation.mutate(data);
    } else {
      if (!file) {
        setFileError('Please select a video file to upload.');
        return;
      }
      if (!thumbFile) {
        setThumbFileError('Please select a thumbnail image.');
        setHighlightThumb(true);
        return;
      }

      const fd = new FormData();
      fd.append('video', file);
      fd.append('thumbnail', thumbFile);
      fd.append('title', data.title);
      if (data.description) fd.append('description', data.description);
      fd.append('category_id', data.category_id);
      fd.append('department_access', data.department_access);
      if (data.department_access === 'RESTRICTED' && data.department_ids) {
        data.department_ids.forEach((did: string) => fd.append('department_ids[]', did));
      }
      uploadMutation.mutate(fd);
    }
  });

  const isPending =
    uploadMutation.isPending ||
    updateDetailsMutation.isPending ||
    statusMutation.isPending ||
    deptsMutation.isPending ||
    deleteMutation.isPending;

  return {
    isEdit,
    video,
    videoLoading,
    videoError,
    rootCategories,
    catsLoading,
    departments,
    deptsLoading,
    form,
    file,
    setFile,
    fileError,
    setFileError,
    validateAndSetVideo,
    setProgress,
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
    localAccess,
    setLocalAccess,
    selectedDeptIds,
    setSelectedDeptIds,
    deptsDirty,
    isPending,
    onSubmit,
    statusMutation,
    deptsMutation,
    deleteMutation,
    toggleDeptSelection,
    navigate,
  };
}
