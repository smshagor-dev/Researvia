export type AuthUserLike = {
  role?: string | null;
  studentOnboardingCompleted?: boolean | null;
};

export function getPostAuthRedirect(user?: AuthUserLike | null) {
  const normalizedRole = String(user?.role || '').toLowerCase();

  if (normalizedRole === 'admin' || normalizedRole === 'super_admin') {
    return '/dashboard/admin/dashboard';
  }

  if (!user?.studentOnboardingCompleted) {
    return '/onboarding/student';
  }

  return '/dashboard/student';
}
