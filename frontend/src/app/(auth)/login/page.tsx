'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/lib/hooks';
import { Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  totpCode: z.string().optional(),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    setError('');
    try {
      const result = await login.mutateAsync(data);
      if (result.requires2FA) {
        setNeeds2FA(true);
        return;
      }
      router.push('/dashboard');
    } catch (e: any) {
      const msg = e.response?.data?.error?.message || 'Login failed';
      setError(msg);
    }
  };

  return (
    <div className="auth-watercolor-bg auth-shell">
      <div className="auth-panel">
        {/* Logo */}
        <div className="auth-brand">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">ProfCRM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="auth-input"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="auth-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message as string}</p>}
            </div>

            {needs2FA && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Authenticator Code</label>
                <input
                  {...register('totpCode')}
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="auth-input text-center tracking-widest"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div />
              <Link href="/forgot-password" className="text-sm font-medium text-blue-600 transition hover:text-blue-700 dark:text-indigo-300 dark:hover:text-indigo-200">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="gradient-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
            >
              {login.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center dark:border-white/10">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-blue-600 transition hover:text-blue-700 dark:text-indigo-300 dark:hover:text-indigo-200">
                Create one
              </Link>
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="mt-4 space-y-2">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
              className="auth-secondary-button"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/auth/microsoft`}
              className="auth-secondary-button"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#00A4EF" d="M13 1h10v10H13z"/>
                <path fill="#7FBA00" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
              Continue with Microsoft
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
