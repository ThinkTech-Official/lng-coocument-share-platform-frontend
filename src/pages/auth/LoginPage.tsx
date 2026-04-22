import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email:    z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dashboardFor(role: string): string {
  if (role === Role.SUPERADMIN) return '/superadmin/dashboard';
  if (role === Role.ADMIN)      return '/admin/dashboard';
  return '/home';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    document.title = 'Sign In — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: LoginForm) => login(data.email, data.password),
    onSuccess: ({ user }) => {
      setAuth(user);
      toast.success(`Welcome back, ${user.name}`);
      navigate(user.force_password_reset ? '/force-reset' : dashboardFor(user.role), { replace: true });
    },
    onError: () => {
      toast.error('Invalid email or password');
      setValue('password', '');
    },
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative">

      {/* Tagline */}
      <p className="mb-7 -mt-2 text-center text-xs text-lng-blue-60">
        Opportunity for British Columbia. Energy for the world.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit((data) => mutate(data))} noValidate className="space-y-5">

        {/* Email */}
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={isPending}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password with show/hide toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-lng-grey" htmlFor="login-password">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isPending}
              className={[
                'w-full rounded border px-3 py-2 pr-10 text-sm text-lng-grey placeholder:text-gray-400',
                'focus:outline-none focus:ring-1',
                'disabled:bg-gray-50 disabled:text-gray-400',
                errors.password
                  ? 'border-lng-red focus:border-lng-red focus:ring-lng-red'
                  : 'border-gray-300 focus:border-lng-blue focus:ring-lng-blue',
              ].join(' ')}
              {...register('password')}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-lng-grey transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-lng-red">{errors.password.message}</p>
          )}
        </div>

        {/* Forgot password — right-aligned under password field */}
        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot-password"
            className="text-xs text-lng-red hover:text-lng-red-80 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          loading={isPending}
          disabled={isPending}
          className="w-full"
        >
          Sign In
        </Button>
      </form>

      {/* 54° angle motif — subtle decorative accent at bottom-right of card */}
      <div className="pointer-events-none mt-8 flex justify-end overflow-hidden" aria-hidden="true">
        <div className="relative h-5 w-44">
          <div
            className="absolute right-0 h-px w-40 rounded-full bg-lng-blue-20"
            style={{ top: '25%', transform: 'rotate(-54deg)', transformOrigin: 'right center' }}
          />
          <div
            className="absolute right-0 h-px w-32 rounded-full bg-lng-blue-20 opacity-50"
            style={{ top: '75%', transform: 'rotate(-54deg)', transformOrigin: 'right center' }}
          />
        </div>
      </div>

    </div>
  );
}
