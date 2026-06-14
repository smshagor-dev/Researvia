'use client';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { api, unwrap } from '@/lib/api/client';
import { Loader2, TrendingUp, Building2, Users, GraduationCap, BookOpen } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { data: platform, isLoading } = useQuery({
    queryKey: ['admin-analytics-platform'],
    queryFn: analyticsApi.getPlatformStats,
  });
  const { data: topUniversities } = useQuery({
    queryKey: ['admin-top-universities'],
    queryFn: () => api.get('/analytics/top-universities').then(unwrap),
  });
  const stats = platform as any || {};
  const universityRows = topUniversities as any[] || [];

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Platform-level growth and coverage metrics for the admin team.</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Users', value: stats.users || 0, icon: Users },
              { label: 'Professors', value: stats.professors || 0, icon: GraduationCap },
              { label: 'Scholarships', value: stats.scholarships || 0, icon: BookOpen },
              { label: 'Active subscriptions', value: stats.activeSubscriptions || 0, icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-white p-5">
                <Icon className="h-5 w-5 text-red-500" />
                <p className="mt-3 text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Building2 className="h-5 w-5 text-red-500" />
              Top Universities By Professor Count
            </h2>
            <div className="space-y-3">
              {universityRows.map((row: any) => (
                <div key={row.university?.id || row.professorCount} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{row.university?.name || 'Unknown university'}</p>
                    <p className="text-xs text-gray-500">Indexed in professor search</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{row.professorCount} professors</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
