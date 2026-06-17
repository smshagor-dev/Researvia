import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearTokens } from '../api/client';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string;
  hasStudentProfile?: boolean;
  studentOnboardingCompleted?: boolean;
  profileCompleteness?: number;
  systemMailboxEmail?: string | null;
  activeSubscription?: { plan: { name: string; slug: string; [key: string]: any } } | null;
  credits?: { balance: number };
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  logout: () => void;
  updateCredits: (balance: number) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      hasHydrated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      logout: () => {
        clearTokens();
        set({ user: null, isAuthenticated: false });
      },
      updateCredits: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, credits: { balance } } : null,
        })),
    }),
    {
      name: 'researvia-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
