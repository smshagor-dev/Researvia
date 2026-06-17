import { api, unwrap, setToken, setRefresh, clearTokens } from './client';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; fullName: string }) =>
    api.post('/auth/register', data).then((r) => {
      const result = unwrap<any>(r);
      if (result.accessToken) {
        setToken(result.accessToken, true);
        setRefresh(result.refreshToken, true);
      }
      return result;
    }),

  login: (data: { email: string; password: string; totpCode?: string; rememberMe?: boolean }) =>
    api.post('/auth/login', data).then((r) => {
      const result = unwrap<any>(r);
      if (result.accessToken) {
        const rememberMe = Boolean(data.rememberMe);
        setToken(result.accessToken, rememberMe);
        setRefresh(result.refreshToken, rememberMe);
      }
      return result;
    }),

  logout: () => api.post('/auth/logout').then(unwrap).finally(clearTokens),
  logoutAll: () => api.post('/auth/logout-all').then(unwrap).finally(clearTokens),

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
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
  getProfile: () => api.get('/users/me/profile').then(unwrap),
  updateProfile: (data: any) => api.put('/users/me/profile', data).then(unwrap),
  getNotifications: (params?: any) => api.get('/users/me/notifications', { params }).then(unwrap),
  getUnreadCount: () => api.get('/users/me/notifications/unread-count').then(unwrap),
  markRead: (id: string) => api.patch(`/users/me/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.post('/users/me/notifications/mark-all-read').then(unwrap),
  getSessions: () => api.get('/users/me/sessions').then(unwrap),
  revokeSession: (id: string) => api.delete(`/users/me/sessions/${id}`).then(unwrap),
  exportData: () => api.get('/users/me/export').then(unwrap),
  deleteAccount: () => api.delete('/users/me/account').then(unwrap),
};

export const studentApi = {
  getProfile: () => api.get('/student/profile').then(unwrap),
  getAcademicProfile: () => api.get('/profile/academic').then(unwrap),
  onboarding: (data: any) => api.post('/student/profile/onboarding', data).then(unwrap),
  updateProfile: (data: any) => api.patch('/student/profile', data).then(unwrap),
  updateBasic: (data: any) => api.patch('/student/profile/basic', data).then(unwrap),
  updateAcademic: (data: any) => api.patch('/student/profile/academic', data).then(unwrap),
  updateAcademicProfile: (data: any) => api.patch('/profile/academic', data).then(unwrap),
  updateResearch: (data: any) => api.patch('/student/profile/research', data).then(unwrap),
  updateSkills: (data: any) => api.patch('/student/profile/skills', data).then(unwrap),
  updatePreferences: (data: any) => api.patch('/student/profile/preferences', data).then(unwrap),
  getCompleteness: () => api.get('/student/profile/completeness').then(unwrap),
  parseCv: (data: any) => api.post('/profile/cv/parse', data).then(unwrap),
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

export const adminProfessorsApi = {
  list: (params?: any) => api.get('/admin/professors', { params }).then(unwrap),
  get: (id: string) => api.get(`/admin/professors/${id}`).then(unwrap),
  update: (id: string, data: any) => api.patch(`/admin/professors/${id}`, data).then(unwrap),
  resync: (id: string) => api.post(`/admin/professors/${id}/resync`).then(unwrap),
  discoverEmails: (id: string) => api.post(`/admin/professors/${id}/emails/discover`).then(unwrap),
  runDiscoverySync: (data?: any) => api.post('/admin/professors/sync/discover', data || {}).then(unwrap),
  runProfileSync: () => api.post('/admin/professors/sync/profiles').then(unwrap),
  runPublicationSync: () => api.post('/admin/professors/sync/publications').then(unwrap),
  runDeduplication: () => api.post('/admin/professors/sync/deduplicate').then(unwrap),
  getSyncJobs: () => api.get('/admin/professors/sync/jobs').then(unwrap),
  getSyncLogs: (params?: any) => api.get('/admin/professors/sync/logs', { params }).then(unwrap),
  getPendingEmails: (params?: any) => api.get('/admin/professors/emails/pending', { params }).then(unwrap),
  getEmailDetail: (id: string) => api.get(`/admin/professors/emails/${id}`).then(unwrap),
  approveEmail: (id: string) => api.post(`/admin/professors/emails/${id}/approve`).then(unwrap),
  rejectEmail: (id: string, reason?: string) => api.post(`/admin/professors/emails/${id}/reject`, { reason }).then(unwrap),
  requestEmailReview: (id: string) => api.post(`/admin/professors/emails/${id}/request-review`).then(unwrap),
  getSystemHealth: () => api.get('/admin/system/health').then(unwrap),
  getSystemQueues: () => api.get('/admin/system/queues').then(unwrap),
  getSystemWorkers: () => api.get('/admin/system/workers').then(unwrap),
  getSystemAlerts: () => api.get('/admin/system/alerts').then(unwrap),
  getSystemMetrics: () => api.get('/admin/system/metrics').then(unwrap),
  retryFailedQueue: (queueName: string) => api.post(`/admin/system/queues/${queueName}/retry-failed`).then(unwrap),
  cleanCompletedQueue: (queueName: string) => api.post(`/admin/system/queues/${queueName}/clean-completed`).then(unwrap),
  cleanFailedQueue: (queueName: string) => api.post(`/admin/system/queues/${queueName}/clean-failed`).then(unwrap),
  getBackups: () => api.get('/admin/backups').then(unwrap),
  runBackup: (type: string) => api.post('/admin/backups/run', { type }).then(unwrap),
  restoreBackup: (id: string) => api.post(`/admin/backups/${id}/restore`).then(unwrap),
};

// ─── Scholarships ────────────────────────────────────────────────────────────
export const scholarshipsApi = {
  list: (params?: any) => api.get('/scholarships', { params }).then(unwrap),
  get: (id: string) => api.get(`/scholarships/${id}`).then(unwrap),
  unlock: (id: string) => api.post(`/scholarships/${id}/unlock`).then(unwrap),
  save: (id: string, data?: any) => api.post(`/scholarships/${id}/save`, data || {}).then(unwrap),
  unsave: (id: string) => api.delete(`/scholarships/${id}/save`).then(unwrap),
  getSaved: (params?: any) => api.get('/scholarships/saved', { params }).then(unwrap),
  updateSavedStatus: (id: string, data: any) => api.patch(`/scholarships/${id}/saved-status`, data).then(unwrap),
};

export const opportunitiesApi = {
  list: (params?: any) => api.get('/opportunities', { params }).then(unwrap),
  get: (id: string) => api.get(`/opportunities/${id}`).then(unwrap),
  unlock: (id: string) => api.post(`/opportunities/${id}/unlock`).then(unwrap),
  getDashboard: () => api.get('/dashboard/opportunities').then(unwrap),
};

export const applicationsApi = {
  list: (params?: any) => api.get('/applications', { params }).then(unwrap),
  create: (data: any) => api.post('/applications', data).then(unwrap),
  update: (id: string, data: any) => api.patch(`/applications/${id}`, data).then(unwrap),
};

export const interviewsApi = {
  create: (data: any) => api.post('/interviews', data).then(unwrap),
  update: (id: string, data: any) => api.patch(`/interviews/${id}`, data).then(unwrap),
};

export const adminOpportunitiesApi = {
  list: (params?: any) => api.get('/admin/opportunities', { params }).then(unwrap),
  update: (id: string, data: any) => api.patch(`/admin/opportunities/${id}`, data).then(unwrap),
  approve: (id: string) => api.post(`/admin/opportunities/${id}/approve`).then(unwrap),
  reject: (id: string) => api.post(`/admin/opportunities/${id}/reject`).then(unwrap),
  sync: (id: string) => api.post(`/admin/opportunities/${id}/sync`).then(unwrap),
  discover: () => api.post('/admin/opportunities/sync/discover').then(unwrap),
  syncAll: () => api.post('/admin/opportunities/sync').then(unwrap),
  qualityScore: () => api.post('/admin/opportunities/quality-score').then(unwrap),
};

export const adminScholarshipsApi = {
  list: (params?: any) => api.get('/admin/scholarships', { params }).then(unwrap),
  get: (id: string) => api.get(`/admin/scholarships/${id}`).then(unwrap),
  update: (id: string, data: any) => api.patch(`/admin/scholarships/${id}`, data).then(unwrap),
  approve: (id: string) => api.post(`/admin/scholarships/${id}/approve`).then(unwrap),
  reject: (id: string) => api.post(`/admin/scholarships/${id}/reject`).then(unwrap),
  resync: (id: string) => api.post(`/admin/scholarships/${id}/resync`).then(unwrap),
  discover: (data?: any) => api.post('/admin/scholarships/sync/discover', data || {}).then(unwrap),
  syncDetails: (data?: any) => api.post('/admin/scholarships/sync/details', data || {}).then(unwrap),
  syncDeadlines: () => api.post('/admin/scholarships/sync/deadlines').then(unwrap),
  syncQuality: (data?: any) => api.post('/admin/scholarships/sync/quality', data || {}).then(unwrap),
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

export const outreachApi = {
  generate: (data: any) => api.post('/outreach/generate', data).then(unwrap),
  send: (data: any) => api.post('/outreach/send', data).then(unwrap),
  pause: (id: string) => api.post(`/outreach/threads/${id}/pause`).then(unwrap),
  resume: (id: string) => api.post(`/outreach/threads/${id}/resume`).then(unwrap),
  updateStage: (id: string, stage: string) => api.patch(`/outreach/threads/${id}/stage`, { stage }).then(unwrap),
  threads: (params?: any) => api.get('/outreach/threads', { params }).then(unwrap),
  thread: (id: string) => api.get(`/outreach/threads/${id}`).then(unwrap),
  analytics: () => api.get('/outreach/analytics').then(unwrap),
  admin: () => api.get('/dashboard/admin/outreach').then(unwrap),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  getMatchScore: (professorId: string) => api.get(`/ai/match-score/${professorId}`).then(unwrap),
  getScholarshipRecommendations: () => api.get('/ai/scholarship-recommendations').then(unwrap),
  // Streaming endpoints handled separately via EventSource
};

export const matchesApi = {
  refresh: (data?: any) => api.post('/matches/refresh', data || {}).then(unwrap),
  getProfessorMatches: (params?: any) => api.get('/matches/professors', { params }).then(unwrap),
  getProfessorMatch: (professorId: string) => api.get(`/matches/professors/${professorId}`).then(unwrap),
  getScholarshipMatches: (params?: any) => api.get('/matches/scholarships', { params }).then(unwrap),
  getScholarshipMatch: (scholarshipId: string) => api.get(`/matches/scholarships/${scholarshipId}`).then(unwrap),
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
  getSyncStats: () => api.get('/universities/sync/stats').then(unwrap),
  sync: () => api.post('/universities/sync').then(unwrap),
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
  getUserDetail: (id: string) => api.get(`/admin/users/${id}`).then(unwrap),
  updateUserDetail: (id: string, data: any) => api.patch(`/admin/users/${id}`, data).then(unwrap),
  uploadUserAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/admin/users/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
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
  getSystemSettings: (prefix?: string) => api.get('/admin/system-settings', { params: prefix ? { prefix } : undefined }).then(unwrap),
  updateSystemSettings: (items: Array<{ key: string; value: unknown; description?: string | null }>) =>
    api.post('/admin/system-settings', { items }).then(unwrap),
  deleteSystemSetting: (key: string) => api.patch(`/admin/system-settings/${encodeURIComponent(key)}/delete`).then(unwrap),
};

export const adminMatchesApi = {
  getStats: () => api.get('/admin/matches/stats').then(unwrap),
  getJobs: () => api.get('/admin/matches/jobs').then(unwrap),
  recalculate: (data?: any) => api.post('/admin/matches/recalculate', data || {}).then(unwrap),
};

export const billingApi = {
  get: () => api.get('/billing').then(unwrap),
  checkout: (data: any) => api.post('/billing/checkout', data).then(unwrap),
  getPaymentMethods: () => api.get('/billing/payment-methods').then(unwrap),
  getPromotions: () => api.get('/billing/promotions').then(unwrap),
  createNowPayment: (data: any) => api.post('/billing/nowpayments/create', data).then(unwrap),
  portal: () => api.post('/billing/portal').then(unwrap),
  cancel: () => api.delete('/subscriptions/cancel').then(unwrap),
  invoices: () => api.get('/billing/invoices').then(unwrap),
  usage: () => api.get('/billing/usage').then(unwrap),
  applyCoupon: (code: string, planSlug?: string) => api.post('/billing/coupons/apply', { code, planSlug }).then(unwrap),
};

export const adminBillingApi = {
  getStats: () => api.get('/admin/billing/stats').then(unwrap),
  getSubscriptions: (params?: any) => api.get('/admin/billing/subscriptions', { params }).then(unwrap),
  getRevenue: () => api.get('/admin/billing/revenue').then(unwrap),
  getCoupons: () => api.get('/admin/billing/coupons').then(unwrap),
  createCoupon: (data: any) => api.post('/admin/billing/coupons', data).then(unwrap),
  updateCoupon: (id: string, data: any) => api.patch(`/admin/billing/coupons/${id}`, data).then(unwrap),
  getPlans: () => api.get('/admin/billing/plans').then(unwrap),
  createPlan: (data: any) => api.post('/admin/billing/plans', data).then(unwrap),
  updatePlan: (id: string, data: any) => api.patch(`/admin/billing/plans/${id}`, data).then(unwrap),
};
