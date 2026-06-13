'use client';

import Link from 'next/link';
import { useStudentCompleteness, useStudentProfile } from '@/lib/hooks';
import { ArrowRight, FileText, GraduationCap, Loader2, Mail, UserRound } from 'lucide-react';

export default function StudentDashboardPage() {
  const { data: profileData, isLoading } = useStudentProfile();
  const { data: completenessData } = useStudentCompleteness();
  const profile = (profileData as any)?.profile;
  const completeness = completenessData as any;

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
        <h1 className="text-2xl font-bold">{profile?.preferredName || profile?.fullName || 'Welcome'}</h1>
        <p className="mt-1 text-sm text-blue-100">Your student profile powers professor matching, scholarship targeting, and better outreach emails.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Profile Completeness</h2>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">{completeness?.percentage || 0}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 dark:bg-slate-800">
            <div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" style={{ width: `${completeness?.percentage || 0}%` }} />
          </div>
          <div className="mt-4 space-y-2">
            {(completeness?.missingFields || []).slice(0, 6).map((field: string) => (
              <div key={field} className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-slate-950 dark:text-slate-300">
                Missing: {field}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { href: '/settings/profile', label: 'Edit Student Profile', icon: UserRound },
              { href: '/settings/documents', label: 'Manage Documents', icon: FileText },
              { href: '/settings/email-accounts', label: 'Choose Sending Email', icon: Mail },
              { href: '/onboarding/student', label: 'Revisit Onboarding', icon: GraduationCap },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-blue-500" /> {label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
