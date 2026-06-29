import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Trash2, Pencil, X, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { type NotificationCategory } from '../../../types';
import { getNotificationById, deleteNotification, updateNotification, uploadNotificationImage } from '../../../api/Notifications';
import Button from '../../../components/ui/Button';
import ContentRenderer from '../../../components/ui/MarkdownRenderer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Spinner from '../../../components/ui/Spinner';
import RichTextEditor from '../../../components/ui/RichTextEditor';

// ─── Config ───────────────────────────────────────────────────────────────────

const categoryOptions: { value: NotificationCategory; label: string; badge: string }[] = [
  { value: 'blue',   label: 'Blue',   badge: 'bg-blue-700 text-white' },
  { value: 'red',    label: 'Red',    badge: 'bg-red-700 text-white' },
  { value: 'orange', label: 'Orange', badge: 'bg-orange-600 text-white' },
  { value: 'yellow', label: 'Yellow', badge: 'bg-yellow-500 text-slate-900' },
  { value: 'green',  label: 'Green',  badge: 'bg-emerald-600 text-white' },
  { value: 'black',  label: 'Black',  badge: 'bg-slate-900 text-white' },
];

const categoryStyles: Record<string, { badgeBg: string; label: string; accentBar: string }> = {
  info:    { badgeBg: 'bg-lng-blue/10 text-lng-blue',    label: 'Info',    accentBar: 'bg-lng-blue' },
  warning: { badgeBg: 'bg-lng-orange/10 text-lng-orange', label: 'Warning', accentBar: 'bg-lng-orange' },
  danger:  { badgeBg: 'bg-lng-red/10 text-lng-red',       label: 'Danger',  accentBar: 'bg-lng-red' },
  success: { badgeBg: 'bg-emerald-50 text-emerald-700',   label: 'Success', accentBar: 'bg-emerald-500' },
  blue:    { badgeBg: 'bg-blue-700 text-white font-bold', label: 'Blue',    accentBar: 'bg-blue-700' },
  red:     { badgeBg: 'bg-red-700 text-white font-bold',  label: 'Red',     accentBar: 'bg-red-700' },
  orange:  { badgeBg: 'bg-orange-600 text-white font-bold', label: 'Orange', accentBar: 'bg-orange-600' },
  yellow:  { badgeBg: 'bg-yellow-500 text-slate-900 font-bold', label: 'Yellow', accentBar: 'bg-yellow-500' },
  green:   { badgeBg: 'bg-emerald-600 text-white font-bold', label: 'Green', accentBar: 'bg-emerald-600' },
  black:   { badgeBg: 'bg-slate-900 text-white font-bold', label: 'Black',  accentBar: 'bg-slate-900' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showDelete, setShowDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<NotificationCategory>('blue');
  const [editContent, setEditContent] = useState('');
  const [editErrors, setEditErrors] = useState<{ title?: string; content?: string }>({});

  useEffect(() => {
    document.title = 'Notification Details – LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  const { data: notification, isLoading, isError } = useQuery({
    queryKey: ['admin-notification', id],
    queryFn: () => getNotificationById(id!),
    enabled: !!id,
  });

  // Seed edit form whenever notification data arrives (keeps values fresh after a save)
  useEffect(() => {
    if (notification) {
      setEditTitle(notification.title);
      setEditCategory(notification.category as NotificationCategory);
      setEditContent(notification.content);
      setEditErrors({});
    }
  }, [notification]);

  // ─── Delete mutation ──────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Notification deleted');
      navigate('/admin/notifications');
    },
    onError: () => toast.error('Failed to delete notification.'),
  });

  // ─── Update mutation ──────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (data: { title: string; content: string; category: NotificationCategory }) =>
      updateNotification(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notification', id] });
      toast.success('Notification updated');
      setIsEditing(false);
    },
    onError: () => toast.error('Failed to update notification.'),
  });

  const handleSave = () => {
    const errors: { title?: string; content?: string } = {};
    if (!editTitle.trim()) errors.title = 'Heading is required';
    const stripped = editContent.replace(/<[^>]+>/g, '').trim();
    if (!stripped) errors.content = 'Message content is required';
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }
    updateMutation.mutate({ title: editTitle.trim(), content: editContent, category: editCategory });
  };

  // ─── Render states ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !notification) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-bold text-lng-grey">Notification Not Found</h2>
        <p className="mb-6 text-gray-500">This notification does not exist or has been deleted.</p>
        <Button variant="primary" onClick={() => navigate('/admin/notifications')}>
          Back to Notifications
        </Button>
      </div>
    );
  }

  const style = categoryStyles[notification.category] || categoryStyles.info;
  const activeBadge = categoryOptions.find((c) => c.value === editCategory);

  return (
    <>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/notifications')}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-lng-blue"
        >
          <ChevronLeft size={16} />
          Back to Notifications
        </button>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={updateMutation.isPending}
              >
                <X size={14} />
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={updateMutation.isPending}
                disabled={updateMutation.isPending}
              >
                {!updateMutation.isPending && <Save size={14} />}
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil size={14} />
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
                <Trash2 size={14} />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content card */}
      <div className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200">
        {/* Accent bar */}
        <div className={`h-1 w-full ${style.accentBar}`} />

        <div className="p-6 md:p-8">
          {isEditing ? (
            /* ── Edit mode ── */
            <div className="space-y-5">
              {/* Title + Category row */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-lng-grey" htmlFor="edit-title">
                    Heading (Title) *
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      if (e.target.value.trim()) setEditErrors((p) => ({ ...p, title: undefined }));
                    }}
                    disabled={updateMutation.isPending}
                    className={`w-full rounded border px-3 py-2 text-sm text-lng-grey placeholder:text-gray-400
                      focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                      disabled:bg-gray-50 disabled:text-gray-400
                      ${editErrors.title ? 'border-lng-red focus:border-lng-red focus:ring-lng-red' : 'border-gray-300'}`}
                  />
                  {editErrors.title && (
                    <p className="text-xs text-lng-red font-semibold">{editErrors.title}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-lng-grey" htmlFor="edit-category">
                    Category (Visual Style) *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="edit-category"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as NotificationCategory)}
                      disabled={updateMutation.isPending}
                      className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-lng-grey
                        focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                        disabled:bg-gray-50"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {activeBadge && (
                      <span className={`shrink-0 rounded px-2.5 py-1 text-[10px] font-bold uppercase ${activeBadge.badge}`}>
                        {activeBadge.value}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rich text editor */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-lng-grey">Message Content *</label>
                  <span className="text-xs text-gray-400 italic">Images &amp; videos are restricted</span>
                </div>
                <RichTextEditor
                  value={editContent}
                  onChange={(html) => {
                    setEditContent(html);
                    const stripped = html.replace(/<[^>]+>/g, '').trim();
                    if (stripped) setEditErrors((p) => ({ ...p, content: undefined }));
                  }}
                  placeholder="Write your notification message here…"
                  disabled={updateMutation.isPending}
                  hasError={!!editErrors.content}
                  minHeight={250}
                  onUploadImage={async (file) => {
                    const { url } = await uploadNotificationImage(file);
                    return url;
                  }}
                />
                {editErrors.content && (
                  <p className="text-xs text-lng-red font-semibold">{editErrors.content}</p>
                )}
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className={`rounded px-2.5 py-1 text-xs font-bold uppercase ${style.badgeBg}`}>
                  {style.label}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Calendar size={14} />
                  {new Date(notification.created_at).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              <h1 className="mb-6 text-xl md:text-2xl font-bold text-lng-grey break-all">
                {notification.title}
              </h1>

              <div className="prose prose-sm md:prose-base max-w-none text-lng-grey [&_*]:break-all">
                <ContentRenderer content={notification.content} />
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => !deleteMutation.isPending && setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate(notification.id)}
        loading={deleteMutation.isPending}
        title="Delete Notification"
        confirmLabel="Delete"
        message={`Are you sure you want to delete "${notification.title}"? Contractors will no longer see this announcement.`}
      />
    </>
  );
}
