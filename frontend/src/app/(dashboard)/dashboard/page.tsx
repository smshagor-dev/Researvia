'use client';

import { useMe, useEmailStats, useFavorites, useSavedScholarships, useCredits, useMySubscription } from '@/lib/hooks';
import { useAuthStore } from '@/lib/stores/authStore';
import Link from 'next/link';
import {
  Users, BookOpen, Mail, Star, TrendingUp, Coins,
  ArrowRight, GraduationCap, BarChart3, Clock, CheckCircle2,
} from 'lucide-react';
import { formatCredits, formatDeadline } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: emailStats } = useEmailStats();
  const { data: favorites } = useFavorites({ perPage: 5 });
  const { data: savedScholarships } = useSavedScholarships({ perPage: 5 });
  const { data: credits } = useCredits();
  const { data: subscription } = useMySubscription();

  const stats = emailStats as any;
  const favData = (favorites as any)?.data || [];
  const schData = (savedScholarships as any)?.data || [];
  const creditBalance = (credits as any)?.balance || 0;
  const planName = (subscription as any)?.plan?.name || 'Free';

  const statCards = [
    { label: 'Emails Sent', value: stats?.sent || 0, icon: Mail, color: 'bg-blue-50 text-blue-600', sub: `${stats?.replyRate || 0}% reply rate` },
    { label: 'Email Opens', value: stats?.opened || 0, icon: TrendingUp, color: 'bg-green-50 text-green-600', sub: `${stats?.openRate || 0}% open rate` },
    { label: 'Saved Professors', value: favData.length, icon: Star, color: 'bg-yellow-50 text-yellow-600', sub: 'Track your outreach' },
    { label: 'Credits Left', value: formatCredits(creditBalance), icon: Coins, color: 'bg-purple-50 text-purple-600', sub: `${planName} plan` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 text-gray-900 dark:text-slate-100">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">
          Welcome back, {user?.fullName?.split(' ')[0] || 'Scholar'} 👋
        </h1>
        <p className="text-blue-100 text-sm">
          Manage your academic outreach from one place.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link href="/professors" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition flex items-center gap-2">
            <Users className="w-4 h-4" /> Discover Professors
          </Link>
          <Link href="/scholarships" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Find Scholarships
          </Link>
          <Link href="/inbox" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition flex items-center gap-2">
            <Mail className="w-4 h-4" /> Open Inbox
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-gray-100 bg-white p-5 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="mt-0 text-2xl font-bold text-gray-900 dark:text-slate-100">{card.value}</p>
              <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-slate-200">{card.label}</p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Saved Professors */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-slate-100">
              <Star className="w-4 h-4 text-yellow-500" /> Saved Professors
            </h2>
            <Link href="/saved/professors" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {favData.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto mb-2 h-10 w-10 text-gray-200 dark:text-slate-700" />
                <p className="text-sm text-gray-400 dark:text-slate-500">No saved professors yet</p>
                <Link href="/professors" className="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-block">
                  Discover professors →
                </Link>
              </div>
            ) : (
              favData.map((fav: any) => (
                <Link key={fav.id} href={`/professors/${fav.professor.id}`}
                  className="group flex items-center gap-3 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-slate-800">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {fav.professor.fullName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600 dark:text-slate-100">{fav.professor.fullName}</p>
                    <p className="truncate text-xs text-gray-400 dark:text-slate-500">{fav.professor.university?.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                    fav.status === 'replied' ? 'bg-green-100 text-green-700' :
                    fav.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{fav.status}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Scholarship Deadlines */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-slate-100">
              <Clock className="w-4 h-4 text-orange-500" /> Upcoming Deadlines
            </h2>
            <Link href="/saved/scholarships" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {schData.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="mx-auto mb-2 h-10 w-10 text-gray-200 dark:text-slate-700" />
                <p className="text-sm text-gray-400 dark:text-slate-500">No saved scholarships yet</p>
                <Link href="/scholarships" className="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-block">
                  Find scholarships →
                </Link>
              </div>
            ) : (
              schData.map((saved: any) => {
                const deadline = formatDeadline(saved.scholarship.deadline);
                return (
                  <Link key={saved.id} href={`/scholarships/${saved.scholarship.id}`}
                    className="group flex items-center gap-3 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-slate-800">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600 dark:text-slate-100">
                        {saved.scholarship.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{saved.scholarship.fundingType?.replace('_', ' ')}</p>
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${deadline.color}`}>
                      {deadline.text}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-slate-100">
          <BarChart3 className="w-4 h-4 text-blue-500" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/professors', label: 'Find Professors', icon: Users, color: 'blue' },
            { href: '/scholarships', label: 'Search Scholarships', icon: BookOpen, color: 'green' },
            { href: '/inbox', label: 'Compose Email', icon: Mail, color: 'purple' },
            { href: '/settings/profile', label: 'Complete Profile', icon: GraduationCap, color: 'orange' },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}
              className={`group flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-${color}-100 p-4 text-center transition hover:border-${color}-300 hover:bg-${color}-50 dark:border-slate-700 dark:hover:bg-slate-800`}>
              <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center transition group-hover:bg-${color}-200`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
