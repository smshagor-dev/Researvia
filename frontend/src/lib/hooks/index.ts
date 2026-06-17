import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import {
  authApi, usersApi, professorsApi, scholarshipsApi,
  favoritesApi, emailThreadsApi, creditsApi, subscriptionsApi,
  analyticsApi, universitiesApi, researchAreasApi, adminApi, studentApi, emailAccountsApi, adminProfessorsApi, adminScholarshipsApi, matchesApi, adminMatchesApi, outreachApi, opportunitiesApi, applicationsApi, interviewsApi, adminOpportunitiesApi, billingApi, adminBillingApi,
} from '../api';
import { getToken } from '../api/client';
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
    enabled: !!getToken(),
    retry: false,
    staleTime: 1000 * 60 * 5,
    throwOnError: false,
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

export function useLogoutAll() {
  const { logout } = useAuthStore();
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logoutAll,
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

export function useAdminProfessors(params?: any, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['admin-professors', params],
    queryFn: () => adminProfessorsApi.list(params),
    staleTime: 1000 * 30,
    refetchInterval: options?.refetchInterval,
  });
}

export function useAdminProfessor(id: string) {
  return useQuery({
    queryKey: ['admin-professor', id],
    queryFn: () => adminProfessorsApi.get(id),
    enabled: !!id,
  });
}

export function useAdminSyncJobs() {
  return useQuery({
    queryKey: ['admin-professor-sync-jobs'],
    queryFn: () => adminProfessorsApi.getSyncJobs(),
    refetchInterval: 15000,
  });
}

export function useAdminSyncLogs(params?: any) {
  return useQuery({
    queryKey: ['admin-professor-sync-logs', params],
    queryFn: () => adminProfessorsApi.getSyncLogs(params),
    refetchInterval: 15000,
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

export function useAdminScholarships(params?: any) {
  return useQuery({
    queryKey: ['admin-scholarships', params],
    queryFn: () => adminScholarshipsApi.list(params),
    refetchInterval: 15000,
  });
}

export function useAdminScholarship(id: string) {
  return useQuery({
    queryKey: ['admin-scholarship', id],
    queryFn: () => adminScholarshipsApi.get(id),
    enabled: !!id,
  });
}

export function useAdminScholarshipUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminScholarshipsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-scholarships'] });
      qc.invalidateQueries({ queryKey: ['admin-scholarship', id] });
      qc.invalidateQueries({ queryKey: ['scholarship', id] });
      qc.invalidateQueries({ queryKey: ['scholarships'] });
    },
  });
}

export function useAdminScholarshipApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminScholarshipsApi.approve(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin-scholarships'] });
      qc.invalidateQueries({ queryKey: ['admin-scholarship', id] });
      qc.invalidateQueries({ queryKey: ['scholarship', id] });
      qc.invalidateQueries({ queryKey: ['scholarships'] });
    },
  });
}

export function useAdminScholarshipReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminScholarshipsApi.reject(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin-scholarships'] });
      qc.invalidateQueries({ queryKey: ['admin-scholarship', id] });
      qc.invalidateQueries({ queryKey: ['scholarship', id] });
      qc.invalidateQueries({ queryKey: ['scholarships'] });
    },
  });
}

export function useAdminScholarshipResync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminScholarshipsApi.resync(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scholarships'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
    },
  });
}

export function useAdminScholarshipDiscover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: any) => adminScholarshipsApi.discover(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scholarships'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
    },
  });
}

export function useAdminScholarshipSyncDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: any) => adminScholarshipsApi.syncDetails(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scholarships'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
    },
  });
}

export function useAdminScholarshipDeadlineSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminScholarshipsApi.syncDeadlines(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scholarships'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
    },
  });
}

export function useAdminScholarshipQualitySync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: any) => adminScholarshipsApi.syncQuality(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scholarships'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
    },
  });
}

export function useOpportunities(params?: any) {
  return useQuery({
    queryKey: ['opportunities', params],
    queryFn: () => opportunitiesApi.list(params),
    staleTime: 1000 * 60,
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => opportunitiesApi.get(id),
    enabled: !!id,
  });
}

export function useOpportunityDashboard() {
  return useQuery({
    queryKey: ['opportunity-dashboard'],
    queryFn: opportunitiesApi.getDashboard,
    refetchInterval: 30000,
  });
}

export function useApplications(params?: any) {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: () => applicationsApi.list(params),
    refetchInterval: 30000,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applicationsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity'] });
      qc.invalidateQueries({ queryKey: ['opportunity-dashboard'] });
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => applicationsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application', id] });
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunity'] });
      qc.invalidateQueries({ queryKey: ['opportunity-dashboard'] });
    },
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: interviewsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['opportunity-dashboard'] });
    },
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => interviewsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['opportunity-dashboard'] });
    },
  });
}

export function useAdminOpportunities(params?: any) {
  return useQuery({
    queryKey: ['admin-opportunities', params],
    queryFn: () => adminOpportunitiesApi.list(params),
    refetchInterval: 15000,
  });
}

export function useAdminOpportunityUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminOpportunitiesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

export function useAdminOpportunityApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminOpportunitiesApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

export function useAdminOpportunityReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminOpportunitiesApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

export function useAdminOpportunitySync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminOpportunitiesApi.sync(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
    },
  });
}

export function useAdminOpportunityDiscover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminOpportunitiesApi.discover,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
    },
  });
}

export function useAdminOpportunitySyncAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminOpportunitiesApi.syncAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
    },
  });
}

export function useAdminOpportunityQualityScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminOpportunitiesApi.qualityScore,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
    },
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

export function useBilling() {
  return useQuery({ queryKey: ['billing'], queryFn: billingApi.get, refetchInterval: 30000 });
}

export function useBillingInvoices() {
  return useQuery({ queryKey: ['billing-invoices'], queryFn: billingApi.invoices, refetchInterval: 60000 });
}

export function useBillingUsage() {
  return useQuery({ queryKey: ['billing-usage'], queryFn: billingApi.usage, refetchInterval: 30000 });
}

export function useBillingPaymentMethods() {
  return useQuery({ queryKey: ['billing-payment-methods'], queryFn: billingApi.getPaymentMethods, staleTime: 1000 * 60 * 5 });
}

export function useBillingPromotions() {
  return useQuery({ queryKey: ['billing-promotions'], queryFn: billingApi.getPromotions, staleTime: 1000 * 60 });
}

export function useBillingCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingApi.checkout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['my-subscription'] });
    },
  });
}

export function useNowPaymentsCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingApi.createNowPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['billing-payment-methods'] });
      qc.invalidateQueries({ queryKey: ['my-subscription'] });
    },
  });
}

export function useBillingPortal() {
  return useMutation({ mutationFn: billingApi.portal });
}

export function useApplyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, planSlug }: { code: string; planSlug?: string }) => billingApi.applyCoupon(code, planSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['billing-promotions'] });
      qc.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
  });
}

export function useAdminBillingPlans() {
  return useQuery({ queryKey: ['admin-billing-plans'], queryFn: adminBillingApi.getPlans, staleTime: 0, refetchOnMount: 'always' });
}

export function useCreateAdminPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminBillingApi.createPlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing-plans'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useUpdateAdminPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminBillingApi.updatePlan(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing-plans'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
  });
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

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: usersApi.getSessions,
    refetchInterval: 30000,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: usersApi.exportData,
  });
}

export function useDeleteAccount() {
  const { logout } = useAuthStore();
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: usersApi.deleteAccount,
    onSuccess: () => {
      logout();
      qc.clear();
      router.push('/login');
    },
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

export function useAcademicProfile() {
  return useQuery({ queryKey: ['academic-profile'], queryFn: studentApi.getAcademicProfile, enabled: !!getToken() });
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

export function useAcademicProfileUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentApi.updateAcademicProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-profile'] });
      qc.invalidateQueries({ queryKey: ['student-profile'] });
      qc.invalidateQueries({ queryKey: ['professor-matches'] });
      qc.invalidateQueries({ queryKey: ['scholarship-matches'] });
    },
  });
}

export function useParseCv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentApi.parseCv,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-profile'] });
    },
  });
}

export function useProfessorMatches(params?: any) {
  return useQuery({
    queryKey: ['professor-matches', params],
    queryFn: () => matchesApi.getProfessorMatches(params),
    enabled: !!getToken(),
  });
}

export function useProfessorMatch(professorId: string) {
  return useQuery({
    queryKey: ['professor-match', professorId],
    queryFn: () => matchesApi.getProfessorMatch(professorId),
    enabled: !!professorId && !!getToken(),
  });
}

export function useScholarshipMatches(params?: any) {
  return useQuery({
    queryKey: ['scholarship-matches', params],
    queryFn: () => matchesApi.getScholarshipMatches(params),
    enabled: !!getToken(),
  });
}

export function useScholarshipMatch(scholarshipId: string) {
  return useQuery({
    queryKey: ['scholarship-match', scholarshipId],
    queryFn: () => matchesApi.getScholarshipMatch(scholarshipId),
    enabled: !!scholarshipId && !!getToken(),
  });
}

export function useRefreshMatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: matchesApi.refresh,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['professor-matches'] });
      qc.invalidateQueries({ queryKey: ['scholarship-matches'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['saved-scholarships'] });
    },
  });
}

export function useEmailAccounts() {
  return useQuery({
    queryKey: ['email-accounts'],
    queryFn: emailAccountsApi.list,
  });
}

export function useOutreachThreads(params?: any) {
  return useQuery({
    queryKey: ['outreach-threads', params],
    queryFn: () => outreachApi.threads(params),
    refetchInterval: 30000,
  });
}

export function useOutreachAnalytics() {
  return useQuery({
    queryKey: ['outreach-analytics'],
    queryFn: outreachApi.analytics,
    refetchInterval: 30000,
  });
}

export function useOutreachStageUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => outreachApi.updateStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach-threads'] }),
  });
}

export function useAdminOutreach() {
  return useQuery({
    queryKey: ['admin-outreach'],
    queryFn: outreachApi.admin,
    refetchInterval: 30000,
  });
}

// ─── Admin hooks ──────────────────────────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.getDashboard });
}

export function useAdminUsers(params?: any) {
  return useQuery({ queryKey: ['admin-users', params], queryFn: () => adminApi.getUsers(params) });
}

export function useAdminUserDetail(id: string) {
  return useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => adminApi.getUserDetail(id),
    enabled: !!id,
  });
}

export function useAdminProfessorUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminProfessorsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-professors'] });
      qc.invalidateQueries({ queryKey: ['admin-professor', id] });
    },
  });
}

export function useAdminProfessorResync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProfessorsApi.resync(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin-professors'] });
      qc.invalidateQueries({ queryKey: ['admin-professor', id] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
    },
  });
}

export function useAdminProfessorEmailDiscovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProfessorsApi.discoverEmails(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
      qc.invalidateQueries({ queryKey: ['pending-verifications'] });
    },
  });
}

export function useRunDiscoverySync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: any) => adminProfessorsApi.runDiscoverySync(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
      qc.invalidateQueries({ queryKey: ['admin-professors'] });
    },
  });
}

export function useRunProfileSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminProfessorsApi.runProfileSync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
      qc.invalidateQueries({ queryKey: ['admin-professors'] });
    },
  });
}

export function useRunPublicationSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminProfessorsApi.runPublicationSync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
    },
  });
}

export function useRunDeduplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminProfessorsApi.runDeduplication(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
    },
  });
}

export function useAdminSystemHealth() {
  return useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => adminProfessorsApi.getSystemHealth(),
    refetchInterval: 15000,
  });
}

export function useAdminMatchStats() {
  return useQuery({
    queryKey: ['admin-match-stats'],
    queryFn: adminMatchesApi.getStats,
    refetchInterval: 15000,
  });
}

export function useAdminMatchJobs() {
  return useQuery({
    queryKey: ['admin-match-jobs'],
    queryFn: adminMatchesApi.getJobs,
    refetchInterval: 15000,
  });
}

export function useAdminRecalculateMatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminMatchesApi.recalculate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-match-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-match-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
    },
  });
}

export function useAdminSystemQueues() {
  return useQuery({
    queryKey: ['admin-system-queues'],
    queryFn: () => adminProfessorsApi.getSystemQueues(),
    refetchInterval: 15000,
  });
}

export function useAdminSystemWorkers() {
  return useQuery({
    queryKey: ['admin-system-workers'],
    queryFn: () => adminProfessorsApi.getSystemWorkers(),
    refetchInterval: 15000,
  });
}

export function useAdminSystemAlerts() {
  return useQuery({
    queryKey: ['admin-system-alerts'],
    queryFn: () => adminProfessorsApi.getSystemAlerts(),
    refetchInterval: 15000,
  });
}

export function useAdminSystemMetrics() {
  return useQuery({
    queryKey: ['admin-system-metrics'],
    queryFn: () => adminProfessorsApi.getSystemMetrics(),
    refetchInterval: 15000,
  });
}

export function useAdminBillingStats() {
  return useQuery({
    queryKey: ['admin-billing-stats'],
    queryFn: adminBillingApi.getStats,
    refetchInterval: 30000,
  });
}

export function useAdminBillingSubscriptions(params?: any) {
  return useQuery({
    queryKey: ['admin-billing-subscriptions', params],
    queryFn: () => adminBillingApi.getSubscriptions(params),
    refetchInterval: 30000,
  });
}

export function useAdminBillingRevenue() {
  return useQuery({
    queryKey: ['admin-billing-revenue'],
    queryFn: adminBillingApi.getRevenue,
    refetchInterval: 60000,
  });
}

export function useAdminBillingCoupons() {
  return useQuery({
    queryKey: ['admin-billing-coupons'],
    queryFn: adminBillingApi.getCoupons,
    refetchInterval: 30000,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminBillingApi.createCoupon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing-coupons'] });
      qc.invalidateQueries({ queryKey: ['admin-billing-stats'] });
      qc.invalidateQueries({ queryKey: ['billing-promotions'] });
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminBillingApi.updateCoupon(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing-coupons'] });
      qc.invalidateQueries({ queryKey: ['admin-billing-stats'] });
      qc.invalidateQueries({ queryKey: ['billing-promotions'] });
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useRetryFailedQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => adminProfessorsApi.retryFailedQueue(queueName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
      qc.invalidateQueries({ queryKey: ['admin-system-workers'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-logs'] });
    },
  });
}

export function useCleanCompletedQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => adminProfessorsApi.cleanCompletedQueue(queueName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
      qc.invalidateQueries({ queryKey: ['admin-system-workers'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
    },
  });
}

export function useCleanFailedQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => adminProfessorsApi.cleanFailedQueue(queueName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
      qc.invalidateQueries({ queryKey: ['admin-system-queues'] });
      qc.invalidateQueries({ queryKey: ['admin-system-workers'] });
      qc.invalidateQueries({ queryKey: ['admin-professor-sync-jobs'] });
    },
  });
}

export function useAdminBackups() {
  return useQuery({
    queryKey: ['admin-backups'],
    queryFn: () => adminProfessorsApi.getBackups(),
    refetchInterval: 30000,
  });
}

export function useRunBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: string) => adminProfessorsApi.runBackup(type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-backups'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
    },
  });
}

export function useRestoreBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProfessorsApi.restoreBackup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-backups'] });
      qc.invalidateQueries({ queryKey: ['admin-system-health'] });
    },
  });
}
