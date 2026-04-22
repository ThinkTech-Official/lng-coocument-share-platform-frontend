import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, CheckCircle, XCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { resetPassword } from '../../api/auth';
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

type ResetForm = z.infer<typeof schema>;

// ─── Password requirements checklist ─────────────────────────────────────────

const REQUIREMENTS = [
  { label: 'At least 8 characters',          test: (v: string) => v.length >= 8 },
  { label: 'At least one uppercase letter',  test: (v: string) => /[A-Z]/.test(v) },
  { label: 'At least one number',            test: (v: string) => /[0-9]/.test(v) },
  { label: 'At least one special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

interface RequirementsListProps {
  value: string;
  submitted: boolean;
}

function RequirementsList({ value, submitted }: RequirementsListProps) {
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

interface PasswordFieldProps {
  id: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  disabled: boolean;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm<ResetForm>>['register']>;
}

function PasswordField({ id, label, show, onToggle, disabled, error, registration }: PasswordFieldProps) {
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
          {...registration}
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

// ─── Component ────────────────────────────────────────────────────────────────

type PageState = 'form' | 'success' | 'invalid-token';

export default function ResetPasswordPage() {
  const [searchParams]            = useSearchParams();
  const token                     = searchParams.get('token') ?? '';
  const [showNew, setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pageState, setPageState] = useState<PageState>(token ? 'form' : 'invalid-token');
  const navigate                  = useNavigate();

  useEffect(() => {
    document.title = 'Reset Password — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  });

  const newPasswordValue = useWatch({ control, name: 'new_password', defaultValue: '' });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ResetForm) =>
      resetPassword(token, data.new_password, data.confirm_password),
    onSuccess: () => {
      setPageState('success');
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 410) {
        setPageState('invalid-token');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    },
  });

  const onSubmit = (data: ResetForm) => {
    setSubmitted(true);
    mutate(data);
  };

  // ─── Invalid / expired token ──────────────────────────────────────────────

  if (pageState === 'invalid-token') {
    const isExpired = token !== '';
    return (
      <div className="flex flex-col items-center text-center">
        <p className="mb-7 -mt-2 w-full text-center text-xs text-lng-blue-60">
          Opportunity for British Columbia. Energy for the world.
        </p>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <XCircle size={28} className="text-lng-red" strokeWidth={1.75} />
        </div>
        <h2 className="mb-2 text-lg font-bold text-lng-grey">
          {isExpired ? 'Link Expired' : 'Invalid Reset Link'}
        </h2>
        <p className="mb-8 text-sm text-gray-400">
          {isExpired
            ? 'This reset link has already been used or has expired. Please request a new one.'
            : 'This password reset link is invalid or has expired. Please request a new one.'}
        </p>
        <Link to="/forgot-password" className="w-full">
          <Button variant="primary" className="w-full">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Success state ────────────────────────────────────────────────────────

  if (pageState === 'success') {
    return (
      <div className="flex flex-col items-center text-center">
        <p className="mb-7 -mt-2 w-full text-center text-xs text-lng-blue-60">
          Opportunity for British Columbia. Energy for the world.
        </p>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle size={28} className="text-green-600" strokeWidth={1.75} />
        </div>
        <h2 className="mb-2 text-lg font-bold text-lng-grey">Password Reset Successful</h2>
        <p className="mb-8 text-sm text-gray-400">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Button
          variant="primary"
          className="w-full"
          onClick={() => navigate('/login', { replace: true })}
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  // ─── Form state ───────────────────────────────────────────────────────────

  return (
    <div>
      <p className="mb-7 -mt-2 text-center text-xs text-lng-blue-60">
        Opportunity for British Columbia. Energy for the world.
      </p>

      <h2 className="mb-1 text-lg font-bold text-lng-grey">Reset Password</h2>
      <p className="mb-6 text-sm text-gray-400">Enter your new password below.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* New password */}
        <div>
          <PasswordField
            id="reset-new-password"
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
          id="reset-confirm-password"
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
          Reset Password
        </Button>
      </form>
    </div>
  );
}
