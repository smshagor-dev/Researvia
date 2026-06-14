'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Eye, EyeOff, GraduationCap, Loader2, X } from 'lucide-react';
import { authApi, usersApi } from '@/lib/api';
import { useLogin } from '@/lib/hooks';
import { useAuthStore } from '@/lib/stores/authStore';
import { getPostAuthRedirect } from '@/lib/auth/redirect';

type AuthMode = 'login' | 'register';

type AuthModalProps = {
  mode: AuthMode;
  open: boolean;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  totpCode: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'One uppercase letter')
    .regex(/[0-9]/, 'One number')
    .regex(/[@$!%*?&]/, 'One special character'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
  agreeToTerms: z.boolean().refine((value) => value, 'You must agree to the terms and privacy policy'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export function AuthModal({ mode, open, onClose, onModeChange }: AuthModalProps) {
  const router = useRouter();
  const login = useLogin();
  const { setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
  });

  const password = registerForm.watch('password', '');
  const passwordChecks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
    { label: 'Special character', ok: /[@$!%*?&]/.test(password) },
  ];

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setShowPassword(false);
      setNeeds2FA(false);
      setLoginError('');
      setRegisterError('');
      loginForm.reset();
      registerForm.reset();
    }
  }, [open, loginForm, registerForm]);

  if (!open) return null;

  const submitLogin = async (data: any) => {
    setLoginError('');
    try {
      const result = await login.mutateAsync(data);
      if (result.requires2FA) {
        setNeeds2FA(true);
        return;
      }
      onClose();
      router.push(getPostAuthRedirect(result.user));
    } catch (error: any) {
      setLoginError(error.response?.data?.error?.message || 'Login failed');
    }
  };

  const submitRegister = async (data: any) => {
    setRegisterError('');
    setRegisterLoading(true);
    try {
      const result = await authApi.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      if (result.accessToken) {
        const me = await usersApi.getMe();
        setUser(me);
      }
      onClose();
      router.push(result.nextPath || getPostAuthRedirect(result.user));
    } catch (error: any) {
      setRegisterError(error.response?.data?.error?.message || 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="system-theme-scope fixed inset-0 z-[100] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <button className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" type="button" aria-label="Close authentication modal" onClick={onClose} />

      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-slate-100">ProfCRM</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Academic communication platform</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Close modal">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(['login', 'register'] as AuthMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onModeChange(item)}
                className={`rounded-md px-3 py-2 text-sm font-bold capitalize transition ${mode === item ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}
              >
                {item === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <section aria-labelledby="auth-modal-title">
              <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in and continue to your dashboard.</p>

              {loginError && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{loginError}</div>}

              <form onSubmit={loginForm.handleSubmit(submitLogin)} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
                  <input {...loginForm.register('email')} type="email" placeholder="you@example.com" className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
                  {loginForm.formState.errors.email && <p className="mt-1 text-xs text-red-500">{loginForm.formState.errors.email.message as string}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                  <PasswordInput registerProps={loginForm.register('password')} show={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                  {loginForm.formState.errors.password && <p className="mt-1 text-xs text-red-500">{loginForm.formState.errors.password.message as string}</p>}
                </div>

                {needs2FA && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Authenticator Code</label>
                    <input {...loginForm.register('totpCode')} type="text" maxLength={6} placeholder="123456" className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center text-sm tracking-widest text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      {...loginForm.register('rememberMe')}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
                    />
                    Remember me
                  </label>
                  <Link href="/forgot-password" onClick={onClose} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" disabled={login.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60">
                  {login.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Sign In
                </button>
              </form>
            </section>
          ) : (
            <section aria-labelledby="auth-modal-title">
              <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">Create your account</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start with 20 free credits every month.</p>
              {registerError && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{registerError}</div>}

              <form onSubmit={registerForm.handleSubmit(submitRegister)} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full Name</label>
                  <input {...registerForm.register('fullName')} placeholder="Jane Smith" className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
                  {registerForm.formState.errors.fullName && <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.fullName.message as string}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
                  <input {...registerForm.register('email')} type="email" placeholder="you@example.com" className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
                  {registerForm.formState.errors.email && <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.email.message as string}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                  <PasswordInput registerProps={registerForm.register('password')} show={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                  {password && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {passwordChecks.map((check) => (
                        <div key={check.label} className={`flex items-center gap-1 text-xs ${check.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <CheckCircle2 className={`h-3 w-3 ${check.ok ? 'text-emerald-500' : 'text-slate-300'}`} aria-hidden="true" />
                          {check.label}
                        </div>
                      ))}
                    </div>
                  )}
                  {registerForm.formState.errors.password && <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.password.message as string}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm Password</label>
                  <PasswordInput registerProps={registerForm.register('confirmPassword')} show={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />
                  {registerForm.formState.errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.confirmPassword.message as string}</p>}
                </div>

                <div>
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <input
                      type="checkbox"
                      {...registerForm.register('agreeToTerms')}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
                    />
                    <span>
                      I agree to the{' '}
                      <a href="#terms" className="font-semibold text-indigo-600 hover:text-indigo-700">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#privacy" className="font-semibold text-indigo-600 hover:text-indigo-700">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                  {registerForm.formState.errors.agreeToTerms && <p className="mt-1 text-xs text-red-500">{registerForm.formState.errors.agreeToTerms.message as string}</p>}
                </div>

                <button type="submit" disabled={registerLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60">
                  {registerLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Create Account
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ registerProps, show, onToggle }: { registerProps: any; show: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <input
        {...registerProps}
        type={show ? 'text' : 'password'}
        placeholder="Password"
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
