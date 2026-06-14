'use client';
import { useAdminDashboard } from '@/lib/hooks';
import { analyticsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Users, GraduationCap, BookOpen, CreditCard, Mail, CheckCircle, TrendingUp, ArrowRight, UserRound, Search, Inbox, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboardPage() {
  const { data: stats } = useAdminDashboard();
  const { data: growth } = useQuery({ queryKey:['user-growth'], queryFn: () => analyticsApi.getUserGrowth(30) });
  const s = stats as any || {};
  const growthData = growth as any[] || [];

  const cards = [
    { label:'Total Users', value: s.users || 0, icon: Users, color:'text-blue-600 bg-blue-50' },
    { label:'Professors', value: s.professors || 0, icon: GraduationCap, color:'text-green-600 bg-green-50' },
    { label:'Active Subscriptions', value: s.activeSubs || 0, icon: CreditCard, color:'text-purple-600 bg-purple-50' },
    { label:'Scholarships', value: s.scholarships || 0, icon: BookOpen, color:'text-orange-600 bg-orange-50' },
    { label:'Emails Sent Today', value: s.emailsSentToday || 0, icon: Mail, color:'text-indigo-600 bg-indigo-50' },
    { label:'Pending Verifications', value: s.pendingVerifications || 0, icon: CheckCircle, color:'text-red-600 bg-red-50' },
  ];
  const opsLinks = [
    { href: '/dashboard/admin/users', label: 'Manage users', detail: 'Roles, status, and credits', icon: Users },
    { href: '/dashboard/admin/students', label: 'Review students', detail: 'Onboarding and profile quality', icon: UserRound },
    { href: '/dashboard/admin/professors', label: 'Inspect professor data', detail: 'Search and verify source records', icon: Search },
    { href: '/dashboard/admin/mailboxes', label: 'Mail operations', detail: 'Mailbox health and settings', icon: Inbox },
    { href: '/dashboard/admin/verification', label: 'Approval queue', detail: 'Resolve pending email verification', icon: CheckCircle },
    { href: '/dashboard/student', label: 'Open user app', detail: 'See the live student-facing flow', icon: Settings },
  ];
  const userJourney = [
    'Frontend landing and auth entry points',
    'Student onboarding and profile completeness',
    'Professor discovery and email reveal flow',
    'Scholarship saving and application tracking',
    'Mailbox provisioning, sending, and inbox sync',
  ];

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {growthData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> User Growth (30 days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">End-to-End Platform Functions</h2>
            <p className="mt-1 text-sm text-gray-500">Jump straight into the core frontend, user, and admin workflows.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {opsLinks.map(({ href, label, detail, icon: Icon }) => (
              <Link key={href} href={href} className="group rounded-xl border border-gray-100 p-4 transition hover:border-red-200 hover:bg-red-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="mt-1 text-sm text-gray-500">{detail}</p>
                  </div>
                  <Icon className="h-5 w-5 text-red-500" />
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium text-red-600">
                  Open
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">User Journey Coverage</h2>
          <p className="mt-1 text-sm text-gray-500">This dashboard now surfaces the main flow from public frontend to student operations.</p>
          <div className="mt-4 space-y-3">
            {userJourney.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-600">{index + 1}</div>
                <p className="text-sm text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
