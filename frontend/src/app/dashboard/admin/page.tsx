'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';
import { useMe } from '@/lib/hooks';
import { getToken } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { getPostAuthRedirect } from '@/lib/auth/redirect';

export default function AdminRootPage() {
  const router = useRouter();
  const { hasHydrated } = useAuthStore();
  const me = useMe();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!getToken()) {
      router.replace('/login');
      return;
    }

    if (me.isLoading) {
      return;
    }

    const user = me.data as any;
    if (!user) {
      router.replace('/login');
      return;
    }

    router.replace(getPostAuthRedirect(user));
  }, [hasHydrated, me.data, me.isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-8 py-10 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-white">Checking admin access</h1>
        <p className="mt-2 text-sm text-slate-400">We are verifying your session before opening the control panel.</p>
        <div className="mt-6 flex items-center justify-center gap-2 text-red-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Authenticating</span>
        </div>
      </div>
    </div>
  );
}
