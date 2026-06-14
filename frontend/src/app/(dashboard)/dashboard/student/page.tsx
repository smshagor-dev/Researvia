'use client';

import Link from 'next/link';
import {
  useApplications,
  useEmailAccounts,
  useFavorites,
  useOpportunityDashboard,
  useSavedScholarships,
  useStudentCompleteness,
  useStudentProfile,
} from '@/lib/hooks';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';

const fieldLabels: Record<string, string> = {
  fullName: 'Full name',
  nationality: 'Nationality',
  currentCountry: 'Current country',
  currentDegreeLevel: 'Current degree level',
  currentUniversity: 'Current university',
  department: 'Department',
  majorSubject: 'Major subject',
  expectedGraduationYear: 'Expected graduation year',
  primaryResearchArea: 'Primary research area',
  interestedDegree: 'Interested degree',
  preferredStudyCountries: 'Preferred study countries',
  fundingNeed: 'Funding need',
  skills: 'Skills',
  cv: 'CV or resume',
  shortBio: 'Short bio',
  careerGoal: 'Career goal',
  defaultSendingEmailAccountId: 'Default sending email account',
};

export default function StudentDashboardPage() {
  const { data: profileData, isLoading } = useStudentProfile();
  const { data: completenessData } = useStudentCompleteness();
  const { data: accountsData } = useEmailAccounts();
  const { data: favoritesData } = useFavorites({ perPage: 1 });
  const { data: scholarshipsData } = useSavedScholarships({ perPage: 1 });
  const { data: applicationsData } = useApplications({ perPage: 1 });
  const { data: opportunityDashboard } = useOpportunityDashboard();

  const profile = (profileData as any)?.profile;
  const completeness = completenessData as any;
  const accounts = (accountsData as any[]) || [];
  const systemMailbox = accounts.find((account) => account.type === 'SYSTEM');
  const selectedSendingEmail = accounts.find((account) => account.isDefault);
  const favoriteCount = (favoritesData as any)?.meta?.total ?? (favoritesData as any)?.data?.length ?? 0;
  const scholarshipCount = (scholarshipsData as any)?.meta?.total ?? (scholarshipsData as any)?.data?.length ?? 0;
  const applicationCount = (applicationsData as any)?.meta?.total ?? (applicationsData as any)?.data?.length ?? 0;
  const opportunityStats = (opportunityDashboard as any) || {};
  const professorReady = !['primaryResearchArea', 'skills', 'currentUniversity'].some((field) =>
    (completeness?.missingFields || []).includes(field),
  );
  const scholarshipReady = !['interestedDegree', 'preferredStudyCountries', 'fundingNeed'].some((field) =>
    (completeness?.missingFields || []).includes(field),
  );
  const checklist = (completeness?.missingFields || []).map((field: string) => fieldLabels[field] || field);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6 px-6 py-6 xl:px-8">
      <section className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
        <h1 className="text-2xl font-bold">{profile?.preferredName || profile?.fullName || 'Welcome'}</h1>
        <p className="mt-1 text-sm text-blue-100">
          Your student profile powers professor matching, scholarship targeting, and better outreach emails.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Profile completeness"
          value={`${completeness?.percentage || 0}%`}
          description={profile?.onboardingCompleted ? 'Onboarding completed' : 'Finish onboarding to unlock better matches'}
        />
        <SummaryCard
          title="System mailbox"
          value={systemMailbox?.email || 'Not provisioned yet'}
          description={systemMailbox?.mailboxStatus ? `Status: ${systemMailbox.mailboxStatus}` : 'Created automatically for every student'}
        />
        <SummaryCard
          title="Selected sending email"
          value={selectedSendingEmail?.email || systemMailbox?.email || 'Choose an email account'}
          description={selectedSendingEmail ? `Default: ${selectedSendingEmail.label || selectedSendingEmail.provider}` : 'System mailbox will be used as fallback'}
        />
        <SummaryCard
          title="Matching readiness"
          value={professorReady && scholarshipReady ? 'Ready' : 'Needs info'}
          description="Complete your profile to improve professor and scholarship targeting"
        />
        <SummaryCard
          title="Applications"
          value={String(opportunityStats.totalApplications ?? applicationCount ?? 0)}
          description={`${opportunityStats.offersCount ?? 0} offers and ${opportunityStats.acceptanceRate ?? 0}% acceptance rate`}
        />
      </div>

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
            {checklist.length === 0 ? (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Your student profile is in a strong state for outreach.
              </div>
            ) : (
              checklist.slice(0, 8).map((field: string) => (
                <div key={field} className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-slate-950 dark:text-slate-300">
                  Missing: {field}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { href: '/settings/profile', label: 'Edit Student Profile', icon: UserRound },
              { href: '/settings/academic-profile', label: 'Academic Match Profile', icon: GraduationCap },
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Professor Matching Status</h2>
            {professorReady ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-amber-500" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {professorReady
              ? `Your profile is ready for professor discovery. You currently have ${favoriteCount} saved professor${favoriteCount === 1 ? '' : 's'}.`
              : 'Add your research area, university, and at least one skill to improve professor recommendations.'}
          </p>
          <Link href="/professors" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
            <Search className="h-4 w-4" />
            Explore professors
          </Link>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Scholarship Matching Status</h2>
            {scholarshipReady ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-amber-500" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {scholarshipReady
              ? `Your degree and country preferences are set. You currently have ${scholarshipCount} saved scholarship${scholarshipCount === 1 ? '' : 's'}.`
              : 'Set your interested degree, target countries, and funding need to get better scholarship recommendations.'}
          </p>
          <Link href="/scholarships" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
            <GraduationCap className="h-4 w-4" />
            Explore scholarships
          </Link>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Application Pipeline</h2>
            <Link href="/applications" className="text-sm font-semibold text-blue-600 dark:text-blue-300">
              Open kanban
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryMini label="Saved" value={String(opportunityStats.statusCounts?.saved ?? 0)} />
            <SummaryMini label="Applied" value={String(opportunityStats.statusCounts?.applied ?? 0)} />
            <SummaryMini label="Interview" value={String(opportunityStats.statusCounts?.interview ?? 0)} />
            <SummaryMini label="Offer" value={String(opportunityStats.statusCounts?.offer_received ?? 0)} />
          </div>
          <div className="mt-4 space-y-2">
            {((opportunityDashboard as any)?.upcomingInterviews || []).slice(0, 3).map((item: any) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="font-medium text-gray-900 dark:text-slate-100">{item.application?.opportunity?.title}</p>
                <p className="text-gray-500 dark:text-slate-400">{new Date(item.scheduledAt).toLocaleString()} ({item.timezone})</p>
              </div>
            ))}
            {!((opportunityDashboard as any)?.upcomingInterviews || []).length ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400">
                No upcoming interviews yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Missing Fields Checklist</h2>
          <Link href="/onboarding/student" className="text-sm font-semibold text-blue-600 dark:text-blue-300">
            Continue onboarding
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {checklist.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              No critical profile gaps found.
            </div>
          ) : (
            checklist.map((item: string) => (
              <div key={item} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                {item}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">{value}</p>
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{description}</p>
    </section>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
