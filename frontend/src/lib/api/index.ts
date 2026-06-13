import { api, unwrap, setToken, setRefresh, clearTokens } from './client';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; fullName: string }) =>
    api.post('/auth/register', data).then(unwrap),

  login: (data: { email: string; password: string; totpCode?: string; rememberMe?: boolean }) =>
    api.post('/auth/login', data).then((r) => {
      const result = unwrap<any>(r);
      if (result.accessToken) {
        setToken(result.accessToken);
        setRefresh(result.refreshToken);
      }
      return result;
    }),

  logout: () => api.post('/auth/logout').then(unwrap).finally(clearTokens),

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }).then(unwrap),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }).then(unwrap),

  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`).then(unwrap),

  enable2FA: (password: string) => api.post('/auth/2fa/enable', { password }).then(unwrap),
  confirm2FA: (totpCode: string) => api.post('/auth/2fa/confirm', { totpCode }).then(unwrap),
  disable2FA: (totpCode: string) => api.post('/auth/2fa/disable', { totpCode }).then(unwrap),
  changePassword: (data: any) => api.post('/auth/change-password', data).then(unwrap),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: () => api.get('/users/me').then(unwrap),
  updateMe: (data: any) => api.patch('/users/me', data).then(unwrap),
  getProfile: () => api.get('/users/me/profile').then(unwrap),
  updateProfile: (data: any) => api.put('/users/me/profile', data).then(unwrap),
  getNotifications: (params?: any) => api.get('/users/me/notifications', { params }).then(unwrap),
  getUnreadCount: () => api.get('/users/me/notifications/unread-count').then(unwrap),
  markRead: (id: string) => api.patch(`/users/me/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.post('/users/me/notifications/mark-all-read').then(unwrap),
};

export const studentApi = {
  getProfile: () => api.get('/student/profile').then(unwrap),
  onboarding: (data: any) => api.post('/student/profile/onboarding', data).then(unwrap),
  updateProfile: (data: any) => api.patch('/student/profile', data).then(unwrap),
  updateBasic: (data: any) => api.patch('/student/profile/basic', data).then(unwrap),
  updateAcademic: (data: any) => api.patch('/student/profile/academic', data).then(unwrap),
  updateResearch: (data: any) => api.patch('/student/profile/research', data).then(unwrap),
  updateSkills: (data: any) => api.patch('/student/profile/skills', data).then(unwrap),
  updatePreferences: (data: any) => api.patch('/student/profile/preferences', data).then(unwrap),
  getCompleteness: () => api.get('/student/profile/completeness').then(unwrap),
  uploadDocument: (type: string, file: File) => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    return api.post('/student/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
  deleteDocument: (id: string) => api.delete(`/student/documents/${id}`).then(unwrap),
};

// ─── Professors ───────────────────────────────────────────────────────────────
export const professorsApi = {
  list: (params?: any) => api.get('/professors', { params }).then(unwrap),
  get: (id: string) => api.get(`/professors/${id}`).then(unwrap),
  getSimilar: (id: string) => api.get(`/professors/${id}/similar`).then(unwrap),
  revealEmail: (id: string) => api.post(`/professors/${id}/reveal-email`).then(unwrap),
  getStats: () => api.get('/professors/stats').then(unwrap),
};

// ─── Scholarships ────────────────────────────────────────────────────────────
export const scholarshipsApi = {
  list: (params?: any) => api.get('/scholarships', { params }).then(unwrap),
  get: (id: string) => api.get(`/scholarships/${id}`).then(unwrap),
  save: (id: string, data?: any) => api.post(`/scholarships/${id}/save`, data || {}).then(unwrap),
  unsave: (id: string) => api.delete(`/scholarships/${id}/save`).then(unwrap),
  getSaved: (params?: any) => api.get('/scholarships/saved', { params }).then(unwrap),
  updateSavedStatus: (id: string, data: any) => api.patch(`/scholarships/${id}/saved-status`, data).then(unwrap),
};

// ─── Favorites ────────────────────────────────────────────────────────────────
export const favoritesApi = {
  list: (params?: any) => api.get('/favorites', { params }).then(unwrap),
  save: (professorId: string, note?: string) => api.post(`/favorites/${professorId}`, { note }).then(unwrap),
  remove: (professorId: string) => api.delete(`/favorites/${professorId}`).then(unwrap),
  updateStatus: (professorId: string, status: string, note?: string) =>
    api.patch(`/favorites/${professorId}/status`, { status, note }).then(unwrap),
  check: (professorId: string) => api.get(`/favorites/${professorId}/check`).then(unwrap),
};

// ─── Email Threads ────────────────────────────────────────────────────────────
export const emailThreadsApi = {
  list: (params?: any) => api.get('/email-threads', { params }).then(unwrap),
  get: (id: string) => api.get(`/email-threads/${id}`).then(unwrap),
  create: (data: any) => api.post('/email-threads', data).then(unwrap),
  update: (id: string, data: any) => api.patch(`/email-threads/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete(`/email-threads/${id}`).then(unwrap),
  getStats: () => api.get('/email-threads/stats').then(unwrap),
  sendMessage: (threadId: string, data: any) =>
    api.post(`/email-threads/${threadId}/messages`, data).then(unwrap),
};

// ─── Email Accounts ───────────────────────────────────────────────────────────
export const emailAccountsApi = {
  list: () => api.get('/email-accounts').then(unwrap),
  createCustom: (data: any) => api.post('/email-accounts/custom', data).then(unwrap),
  createGmail: (data: any) => api.post('/email-accounts/gmail', data).then(unwrap),
  update: (id: string, data: any) => api.patch(`/email-accounts/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete(`/email-accounts/${id}`).then(unwrap),
  setDefault: (id: string) => api.post(`/email-accounts/${id}/set-default`).then(unwrap),
  testConnection: (id: string) => api.post(`/email-accounts/${id}/test-connection`).then(unwrap),
  getSmtp: () => api.get('/email-accounts/smtp').then(unwrap),
  createSmtp: (data: any) => api.post('/email-accounts/smtp', data).then(unwrap),
  updateSmtp: (id: string, data: any) => api.patch(`/email-accounts/smtp/${id}`, data).then(unwrap),
  deleteSmtp: (id: string) => api.delete(`/email-accounts/smtp/${id}`).then(unwrap),
  verifySmtp: (id: string) => api.post(`/email-accounts/smtp/${id}/verify`).then(unwrap),
  getOAuth: () => api.get('/email-accounts/oauth').then(unwrap),
  updateOAuth: (id: string, data: any) => api.patch(`/email-accounts/oauth/${id}`, data).then(unwrap),
  disconnectOAuth: (id: string) => api.delete(`/email-accounts/oauth/${id}`).then(unwrap),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  getMatchScore: (professorId: string) => api.get(`/ai/match-score/${professorId}`).then(unwrap),
  getScholarshipRecommendations: () => api.get('/ai/scholarship-recommendations').then(unwrap),
  // Streaming endpoints handled separately via EventSource
};

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptionsApi = {
  getPlans: () => api.get('/subscriptions/plans').then(unwrap),
  getMy: () => api.get('/subscriptions/my').then(unwrap),
  checkout: (planSlug: string, interval: string) =>
    api.post('/subscriptions/checkout', { planSlug, interval }).then(unwrap),
  cancel: () => api.delete('/subscriptions/cancel').then(unwrap),
  getBillingPortal: () => api.get('/subscriptions/billing-portal').then(unwrap),
};

// ─── Credits ─────────────────────────────────────────────────────────────────
export const creditsApi = {
  getBalance: () => api.get('/credits/balance').then(unwrap),
  getTransactions: (params?: any) => api.get('/credits/transactions', { params }).then(unwrap),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getEmailStats: () => api.get('/analytics/email-stats').then(unwrap),
  getPlatformStats: () => api.get('/analytics/platform').then(unwrap),
  getUserGrowth: (days?: number) => api.get('/analytics/user-growth', { params: { days } }).then(unwrap),
};

// ─── Universities ─────────────────────────────────────────────────────────────
export const universitiesApi = {
  list: (params?: any) => api.get('/universities', { params }).then(unwrap),
  get: (id: string) => api.get(`/universities/${id}`).then(unwrap),
  getCountries: () => api.get('/universities/countries').then(unwrap),
};

// ─── Research Areas ───────────────────────────────────────────────────────────
export const researchAreasApi = {
  list: () => api.get('/research-areas').then(unwrap),
};

// ─── Search ───────────────────────────────────────────────────────────────────
export const searchApi = {
  autocomplete: (q: string, type?: string) =>
    api.get('/search/autocomplete', { params: { q, type } }).then(unwrap),
  global: (q: string) => api.get('/search', { params: { q } }).then(unwrap),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard').then(unwrap),
  getUsers: (params?: any) => api.get('/admin/users', { params }).then(unwrap),
  updateRole: (id: string, role: string) => api.post(`/admin/users/${id}/role`, { role }).then(unwrap),
  updateStatus: (id: string, status: string) => api.post(`/admin/users/${id}/status`, { status }).then(unwrap),
  adjustCredits: (id: string, amount: number, description: string) =>
    api.post(`/admin/users/${id}/credits`, { amount, description }).then(unwrap),
  getAuditLogs: (params?: any) => api.get('/admin/audit-logs', { params }).then(unwrap),
  getImports: (params?: any) => api.get('/admin/imports', { params }).then(unwrap),
  getMailboxes: (params?: any) => api.get('/admin/mailboxes', { params }).then(unwrap),
  getMailboxStats: () => api.get('/admin/mailboxes/stats').then(unwrap),
  getStudents: (params?: any) => api.get('/admin/students', { params }).then(unwrap),
  getStudent: (id: string) => api.get(`/admin/students/${id}`).then(unwrap),
  updateStudentStatus: (id: string, status: string) => api.patch(`/admin/students/${id}/status`, { status }).then(unwrap),
  suspendMailbox: (id: string) => api.patch(`/admin/mailboxes/${id}/suspend`).then(unwrap),
  resetMailboxPassword: (id: string) => api.patch(`/admin/mailboxes/${id}/reset-password`).then(unwrap),
  getMailSettings: () => api.get('/admin/mail-settings').then(unwrap),
  updateMailSettings: (data: any) => api.post('/admin/mail-settings', data).then(unwrap),
};
