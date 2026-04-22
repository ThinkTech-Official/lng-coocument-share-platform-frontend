import { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAdmin } from '../../api/admins';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type CreateForm = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateAdminPage() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Create Admin — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CreateForm>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  });

  // Block navigation when form is dirty and not yet submitted
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !submitted && currentLocation.pathname !== nextLocation.pathname
  );

  const { mutate, isPending } = useMutation({
    mutationFn: ({ name, email }: CreateForm) =>
      createAdmin({ name, email }),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setSubmitted(true);
      toast.success(
        `Admin account created. A temporary password has been sent to ${variables.email}.`
      );
      navigate('/superadmin/admins');
    },

    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('email', { message: 'An account with this email already exists.' });
      } else {
        toast.error('Failed to create admin. Please try again.');
      }
    },
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Create Admin"
        subtitle="Add a new admin account"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/superadmin/admins')}
            disabled={isPending}
          >
            <ArrowLeft size={14} />
            Back to Admins
          </Button>
        }
      />

      {/* Form card */}
      <div className="max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        {/* Card heading */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-lng-grey">Admin Details</h2>
        </div>

        <form onSubmit={handleSubmit((data) => mutate(data))} noValidate className="space-y-5">
          {/* Full Name */}
          <Input
            label="Full Name"
            type="text"
            placeholder="Enter full name"
            disabled={isPending}
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Email */}
          <div className="flex flex-col gap-1">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter email address"
              disabled={isPending}
              error={errors.email?.message}
              {...register('email')}
            />
            {/* Helper text — only shown when there's no email error */}
            {!errors.email && (
              <div className="mt-1 flex items-start gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0 text-lng-blue" />
                <p className="text-xs text-lng-grey leading-relaxed">
                  A temporary password will be automatically generated and sent to this email
                  address. The admin will be prompted to reset their password on first login.
                </p>
              </div>
            )}
          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => navigate('/superadmin/admins')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              disabled={isPending}
            >
              <UserPlus size={14} />
              Create Admin
            </Button>
          </div>
        </form>
      </div>

      {/* Unsaved changes dialog */}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Discard Changes"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Keep Editing
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              Discard
            </Button>
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
