import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import {
  authApi, usersApi, professorsApi, scholarshipsApi,
  favoritesApi, emailThreadsApi, creditsApi, subscriptionsApi,
  analyticsApi, universitiesApi, researchAreasApi, adminApi, studentApi,
} from '../api';
import { useRouter } from 'next/navigation';

// ─── Auth hooks ───────────────────────────────────────────────────────────────
export function useMe() {
  const { setUser } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await usersApi.getMe();
      setUser(user);
      return user;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      if (data.accessToken) {
        const me = await usersApi.getMe();
        setUser(me);
        qc.setQueryData(['me'], me);
      }
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      qc.clear();
      router.push('/login');
    },
  });
}

// ─── Professor hooks ──────────────────────────────────────────────────────────
export function useProfessors(params?: any) {
  return useQuery({
    queryKey: ['professors', params],
    queryFn: () => professorsApi.list(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useProfessor(id: string) {
  return useQuery({
    queryKey: ['professor', id],
    queryFn: () => professorsApi.get(id),
    enabled: !!id,
  });
}

export function useRevealEmail(professorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => professorsApi.revealEmail(professorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

// ─── Scholarship hooks ────────────────────────────────────────────────────────
export function useScholarships(params?: any) {
  return useQuery({
    queryKey: ['scholarships', params],
    queryFn: () => scholarshipsApi.list(params),
  });
}

export function useScholarship(id: string) {
  return useQuery({
    queryKey: ['scholarship', id],
    queryFn: () => scholarshipsApi.get(id),
    enabled: !!id,
  });
}

export function useSavedScholarships(params?: any) {
  return useQuery({
    queryKey: ['saved-scholarships', params],
    queryFn: () => scholarshipsApi.getSaved(params),
  });
}

export function useSaveScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: any }) => scholarshipsApi.save(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-scholarships'] }),
  });
}

// ─── Favorites hooks ──────────────────────────────────────────────────────────
export function useFavorites(params?: any) {
  return useQuery({
    queryKey: ['favorites', params],
    queryFn: () => favoritesApi.list(params),
  });
}

export function useSaveProfessor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => favoritesApi.save(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
}

// ─── Email hooks ──────────────────────────────────────────────────────────────
export function useEmailThreads(params?: any) {
  return useQuery({
    queryKey: ['email-threads', params],
    queryFn: () => emailThreadsApi.list(params),
    refetchInterval: 30000,
  });
}

export function useEmailThread(id: string) {
  return useQuery({
    queryKey: ['email-thread', id],
    queryFn: () => emailThreadsApi.get(id),
    enabled: !!id,
    refetchInterval: 15000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, data }: { threadId: string; data: any }) =>
      emailThreadsApi.sendMessage(threadId, data),
    onSuccess: (_, { threadId }) => {
      qc.invalidateQueries({ queryKey: ['email-thread', threadId] });
      qc.invalidateQueries({ queryKey: ['email-threads'] });
    },
  });
}

// ─── Credits hooks ────────────────────────────────────────────────────────────
export function useCredits() {
  return useQuery({
    queryKey: ['credits'],
    queryFn: creditsApi.getBalance,
    staleTime: 1000 * 30,
  });
}

export function useCreditTransactions(params?: any) {
  return useQuery({
    queryKey: ['credit-transactions', params],
    queryFn: () => creditsApi.getTransactions(params),
  });
}

// ─── Subscription hooks ───────────────────────────────────────────────────────
export function usePlans() {
  return useQuery({ queryKey: ['plans'], queryFn: subscriptionsApi.getPlans, staleTime: 1000 * 60 * 10 });
}

export function useMySubscription() {
  return useQuery({ queryKey: ['my-subscription'], queryFn: subscriptionsApi.getMy });
}

// ─── Analytics hooks ─────────────────────────────────────────────────────────
export function useEmailStats() {
  return useQuery({ queryKey: ['email-stats'], queryFn: analyticsApi.getEmailStats });
}

// ─── Reference data hooks ─────────────────────────────────────────────────────
export function useCountries() {
  return useQuery({ queryKey: ['countries'], queryFn: universitiesApi.getCountries, staleTime: Infinity });
}

export function useResearchAreas() {
  return useQuery({ queryKey: ['research-areas'], queryFn: researchAreasApi.list, staleTime: Infinity });
}

export function useUniversities(params?: any) {
  return useQuery({ queryKey: ['universities', params], queryFn: () => universitiesApi.list(params) });
}

// ─── Notifications hooks ──────────────────────────────────────────────────────
export function useNotifications(params?: any) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => usersApi.getNotifications(params),
    refetchInterval: 60000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: usersApi.getUnreadCount,
    refetchInterval: 30000,
  });
}

export function useStudentProfile() {
  return useQuery({ queryKey: ['student-profile'], queryFn: studentApi.getProfile });
}

export function useStudentCompleteness() {
  return useQuery({ queryKey: ['student-completeness'], queryFn: studentApi.getCompleteness });
}

export function useStudentOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentApi.onboarding,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-profile'] });
      qc.invalidateQueries({ queryKey: ['student-completeness'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useStudentProfileUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentApi.updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-profile'] });
      qc.invalidateQueries({ queryKey: ['student-completeness'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

// ─── Admin hooks ──────────────────────────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.getDashboard });
}

export function useAdminUsers(params?: any) {
  return useQuery({ queryKey: ['admin-users', params], queryFn: () => adminApi.getUsers(params) });
}
