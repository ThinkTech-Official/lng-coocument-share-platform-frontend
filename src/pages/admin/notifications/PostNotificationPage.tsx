import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import { type NotificationCategory } from '../../../types';
import { createNotification } from '../../../api/Notifications';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import RichTextEditor from '../../../components/ui/RichTextEditor';

// ─── Category config ──────────────────────────────────────────────────────────

const categoryOptions: { value: NotificationCategory; label: string; badge: string }[] = [
  { value: 'blue', label: 'Blue', badge: 'bg-blue-700 text-white' },
  { value: 'red', label: 'Red', badge: 'bg-red-700 text-white' },
  { value: 'orange', label: 'Orange', badge: 'bg-orange-600 text-white' },
  { value: 'yellow', label: 'Yellow', badge: 'bg-yellow-500 text-slate-900' },
  { value: 'green', label: 'Green', badge: 'bg-emerald-600 text-white' },
  { value: 'black', label: 'Black', badge: 'bg-slate-900 text-white' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PostNotificationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<NotificationCategory>('blue');
  const [formContent, setFormContent] = useState('');
  const [formErrors, setFormErrors] = useState<{ title?: string; content?: string }>({});

  useEffect(() => {
    document.title = 'Post Notification – LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  const createMutation = useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Notification posted successfully');
      navigate('/admin/notifications');
    },
    onError: () => {
      toast.error('Failed to create notification. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { title?: string; content?: string } = {};
    if (!formTitle.trim()) errors.title = 'Heading is required';
    // formContent is HTML; treat <p></p> as empty
    const strippedContent = formContent.replace(/<[^>]+>/g, '').trim();
    if (!strippedContent) errors.content = 'Notification message is required';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      content: formContent,
    };
    console.log('Sending notification payload to backend:', payload);

    createMutation.mutate(payload);
  };

  const activeBadge = categoryOptions.find((c) => c.value === formCategory);

  return (
    <>
      <PageHeader
        title="Post Notification"
        subtitle="Broadcast announcements and safety notices to contractors"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/notifications')}
            disabled={createMutation.isPending}
          >
            <ArrowLeft size={14} />
            Back to Notifications
          </Button>
        }
      />

      <div className="rounded-lg bg-white p-8 shadow-sm">
        {/* Card header */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-lng-grey">Announcement Details</h2>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Top row: Title + Category */}
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-lng-grey" htmlFor="notif-title">
                Heading (Title) *
              </label>
              <input
                id="notif-title"
                type="text"
                placeholder="e.g. Medical Fitness Update, PED Restrictions…"
                disabled={createMutation.isPending}
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  if (e.target.value.trim()) setFormErrors((p) => ({ ...p, title: undefined }));
                }}
                className={`w-full rounded border px-3 py-2 text-sm text-lng-grey placeholder:text-gray-400
                  border-gray-300 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
                  disabled:bg-gray-50 disabled:text-gray-400
                  ${formErrors.title ? 'border-lng-red focus:border-lng-red focus:ring-lng-red' : ''}`}
              />
              {formErrors.title && (
                <p className="text-xs text-lng-red font-semibold">{formErrors.title}</p>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-lng-grey" htmlFor="notif-category">
                Category (Visual Style) *
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="notif-category"
                  disabled={createMutation.isPending}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as NotificationCategory)}
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

          {/* WYSIWYG Editor */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-lng-grey">
                Message Content *
              </label>
              <span className="text-xs text-gray-400 italic">Images & videos are restricted</span>
            </div>

            <RichTextEditor
              value={formContent}
              onChange={(html) => {
                setFormContent(html);
                const stripped = html.replace(/<[^>]+>/g, '').trim();
                if (stripped) setFormErrors((p) => ({ ...p, content: undefined }));
              }}
              placeholder="Write your notification message here…"
              disabled={createMutation.isPending}
              hasError={!!formErrors.content}
              minHeight={300}
            />
            {formErrors.content && (
              <p className="text-xs text-lng-red font-semibold">{formErrors.content}</p>
            )}
          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={() => navigate('/admin/notifications')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              {!createMutation.isPending && <Plus size={14} />}
              {createMutation.isPending ? 'Posting…' : 'Post Announcement'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
