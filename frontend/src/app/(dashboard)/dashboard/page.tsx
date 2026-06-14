'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getPostAuthRedirect } from '@/lib/auth/redirect';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.replace(getPostAuthRedirect(user));
    }
  }, [router, user]);

  return null;
}
