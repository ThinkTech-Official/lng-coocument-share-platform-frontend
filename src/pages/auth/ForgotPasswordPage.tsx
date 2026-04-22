import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { forgotPassword } from '../../api/auth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type ForgotForm = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Forgot Password — LNG Canada';
    return () => { document.title = 'LNG Canada'; };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ForgotForm) => forgotPassword(data.email),
    onSuccess: (_data, variables) => {
      setSubmittedEmail(variables.email);
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.');
    },
  });

  // ─── Success state ────────────────────────────────────────────────────────────

  if (submittedEmail) {
    return (
      <div className="flex flex-col items-center text-center">
        {/* Tagline */}
        <p className="mb-7 -mt-2 w-full text-center text-xs text-lng-blue-60">
          Opportunity for British Columbia. Energy for the world.
        </p>

        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle size={28} className="text-green-600" strokeWidth={1.75} />
        </div>

        <h2 className="mb-2 text-lg font-bold text-lng-grey">Check your email</h2>

        <p className="mb-1 text-sm text-lng-grey">
          If an account exists for{' '}
          <span className="font-medium">{submittedEmail}</span>,
          you will receive a reset link shortly.
        </p>

        <p className="mb-8 text-xs text-gray-400">The link expires in 15 minutes.</p>

        <Link to="/login" className="w-full">
          <Button variant="outline" className="w-full">
            <ArrowLeft size={14} />
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Form state ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tagline */}
      <p className="mb-7 -mt-2 text-center text-xs text-lng-blue-60">
        Opportunity for British Columbia. Energy for the world.
      </p>

      {/* Heading */}
      <h2 className="mb-1 text-lg font-bold text-lng-grey">Forgot Password</h2>
      <p className="mb-6 text-sm text-gray-400">
        Enter your email address and we will send you a link to reset your password.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit((data) => mutate(data))} noValidate className="space-y-5">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={isPending}
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          variant="primary"
          loading={isPending}
          disabled={isPending}
          className="w-full"
        >
          Send Reset Link
        </Button>
      </form>

      {/* Back to login */}
      <div className="mt-6 flex justify-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-lng-blue hover:text-lng-blue-80 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
