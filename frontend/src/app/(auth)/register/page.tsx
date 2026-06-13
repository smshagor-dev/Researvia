'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { Eye, EyeOff, Loader2, GraduationCap, CheckCircle2 } from 'lucide-react';

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'One uppercase letter')
    .regex(/[0-9]/, 'One number')
    .regex(/[@$!%*?&]/, 'One special character'),
});

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');

  const passwordChecks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
    { label: 'Special character', ok: /[@$!%*?&]/.test(password) },
  ];

  const onSubmit = async (data: any) => {
    setError('');
    setLoading(true);
    try {
      await authApi.register(data);
      setSuccess(true);
    } catch (e: any) {
      const msg = e.response?.data?.error?.message || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-watercolor-bg auth-shell">
        <div className="auth-card relative z-10 w-full max-w-md p-10 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-500 mb-6">Check your email to verify your account, then sign in.</p>
          <Link href="/login" className="gradient-primary inline-block rounded-lg px-6 py-2.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:opacity-95">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-watercolor-bg auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">ProfCRM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Start your academic outreach journey</p>
        </div>

        <div className="auth-card">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
              <input
                {...register('fullName')}
                placeholder="Dr. Jane Smith"
                className="auth-input"
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message as string}</p>}
            </div>

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
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {passwordChecks.map(c => (
                    <div key={c.label} className={`flex items-center gap-1 text-xs ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle2 className={`w-3 h-3 ${c.ok ? 'text-green-500' : 'text-gray-300'}`} />
                      {c.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="gradient-primary flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center dark:border-white/10">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-blue-600 transition hover:text-blue-700 dark:text-indigo-300 dark:hover:text-indigo-200">Sign in</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
