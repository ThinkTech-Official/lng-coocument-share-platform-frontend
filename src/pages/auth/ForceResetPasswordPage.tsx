import { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { changePassword } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types';
import Button from '../../components/ui/Button';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'At least one uppercase letter')
      .regex(/[0-9]/, 'At least one number')
      .regex(/[^A-Za-z0-9]/, 'At least one special character'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ForceResetForm = z.infer<typeof schema>;

// ─── Password requirements checklist ─────────────────────────────────────────

const REQUIREMENTS = [
  { label: 'At least 8 characters',          test: (v: string) => v.length >= 8 },
  { label: 'At least one uppercase letter',  test: (v: string) => /[A-Z]/.test(v) },
  { label: 'At least one number',            test: (v: string) => /[0-9]/.test(v) },
  { label: 'At least one special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function RequirementsList({ value, submitted }: { value: string; submitted: boolean }) {
  return (
    <ul className="mt-2 space-y-1">
      {REQUIREMENTS.map(({ label, test }) => {
        const met = test(value);
        return (
          <li key={label} className="flex items-center gap-2 text-xs">
            {met ? (
              <Check size={12} className="shrink-0 text-green-600" strokeWidth={2.5} />
            ) : (
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  submitted ? 'bg-lng-red' : 'bg-gray-300'
                }`}
              />
            )}
            <span className={met ? 'text-green-700' : submitted ? 'text-lng-red' : 'text-gray-400'}>
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Password input with show/hide ────────────────────────────────────────────

function PasswordField({
  id,
  label,
  show,
  onToggle,
  disabled,
  error,
  registration,
}: {
  id: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  disabled: boolean;
  error?: string;
  registration: object;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-lng-grey" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          disabled={disabled}
          placeholder="••••••••"
          className={[
            'w-full rounded border px-3 py-2 pr-10 text-sm text-lng-grey placeholder:text-gray-400',
            'focus:outline-none focus:ring-1',
            'disabled:bg-gray-50 disabled:text-gray-400',
            error
              ? 'border-lng-red focus:border-lng-red focus:ring-lng-red'
              : 'border-gray-300 focus:border-lng-blue focus:ring-lng-blue',
          ].join(' ')}
          {...(registration as Record<string, unknown>)}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={onToggle}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-lng-grey transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-lng-red">{error}</p>}
    </div>
  );
}

// ─── Navigation block dialog ──────────────────────────────────────────────────

function BlockerDialog({ onStay }: { onStay: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onStay} />
      <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-lng-yellow/30">
          <AlertTriangle size={20} className="text-lng-grey" />
        </div>
        <h3 className="mb-2 text-base font-bold text-lng-grey">Cannot Leave Yet</h3>
        <p className="mb-5 text-sm text-gray-400">
          You must set a new password before you can access the platform.
        </p>
        <Button variant="primary" className="w-full" onClick={onStay}>
          Stay & Set Password
        </Button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function dashboardFor(role: string): string {
  if (role === Role.SUPERADMIN) return '/superadmin/dashboard';
  if (role === Role.ADMIN)      return '/admin/dashboard';
  return '/home';
}

export default function ForceResetPasswordPage() {
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  const navigate          = useNavigate();
  const { user, token, setAuth, clearAuth } = useAuthStore();

  // Block SPA navigation to anywhere except /login (logout path)
  const blocker = useBlocker(
    ({ nextLocation }) => nextLocation.pathname !== '/login'
  );

  // Block browser-level unload (tab close / refresh)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    document.title = 'Set New Password — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ForceResetForm>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  });

  const newPasswordValue = useWatch({ control, name: 'new_password', defaultValue: '' });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ForceResetForm) =>
      changePassword(data.new_password, data.confirm_password),

    onSuccess: () => {
      if (user) {
        setAuth({ ...user, force_password_reset: false }, token ?? '');
      }
      toast.success('Password updated successfully');
      navigate(dashboardFor(user?.role ?? ''), { replace: true });
    },

    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 400 && message) {
        toast.error(message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    },
  });

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Navigation block dialog */}
      {blocker.state === 'blocked' && (
        <BlockerDialog onStay={() => blocker.reset()} />
      )}

      <div>
        {/* Tagline */}
        <p className="mb-6 -mt-2 text-center text-xs text-lng-blue-60">
          Opportunity for British Columbia. Energy for the world.
        </p>

        {/* Warning banner */}
        <div className="mb-5 flex items-start gap-2.5 rounded bg-lng-yellow/30 px-3 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-lng-grey" strokeWidth={2} />
          <p className="text-xs font-medium text-lng-grey">
            You must set a new password before continuing.
          </p>
        </div>

        {/* Heading */}
        <h2 className="mb-1 text-lg font-bold text-lng-grey">Set New Password</h2>
        <p className="mb-6 text-sm text-gray-400">
          Your account requires a password change. Please choose a secure password to continue.
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit((data) => { setSubmitted(true); mutate(data); })}
          noValidate
          className="space-y-5"
        >
          {/* New password */}
          <div>
            <PasswordField
              id="force-new-password"
              label="New Password"
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
              disabled={isPending}
              error={errors.new_password?.message}
              registration={register('new_password')}
            />
            <RequirementsList value={newPasswordValue} submitted={submitted} />
          </div>

          {/* Confirm password */}
          <PasswordField
            id="force-confirm-password"
            label="Confirm Password"
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            disabled={isPending}
            error={errors.confirm_password?.message}
            registration={register('confirm_password')}
          />

          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            disabled={isPending}
            className="w-full"
          >
            Set Password & Continue
          </Button>
        </form>

        {/* Logout link */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-lng-grey hover:text-lng-blue transition-colors"
          >
            Not you? Sign out
          </button>
        </div>
      </div>
    </>
  );
}
