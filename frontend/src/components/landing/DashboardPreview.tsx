'use client';

import { motion } from 'framer-motion';
import { BookOpen, Mail, MessageSquareText, TrendingUp, WalletCards } from 'lucide-react';

const stats = [
  { label: 'Email Sent', value: '1,248', icon: Mail, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  { label: 'Open Rate', value: '74%', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
  { label: 'Replies', value: '186', icon: MessageSquareText, tone: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' },
  { label: 'Credits Left', value: '320', icon: WalletCards, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
];

const activity = [
  { name: 'Dr. Elena Park', detail: 'Opened your follow-up email', time: '4m ago' },
  { name: 'Prof. Marcus Lee', detail: 'Replied about PhD supervision', time: '18m ago' },
  { name: 'Dr. Amara Singh', detail: 'Email scheduled for tomorrow', time: '1h ago' },
];

export function DashboardPreview() {
  return (
    <motion.div
      className="relative"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-500/25 via-blue-500/10 to-purple-500/25 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/15 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/30">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ResearVia workspace</span>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Academic pipeline</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Communication command center</h2>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Live tracking</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, tone }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12 }}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Recent Email Activity</h3>
              <div className="mt-4 space-y-3">
                {activity.map((item) => (
                  <div key={item.name} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-white/[0.04]">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">Scholarship Deadlines</h3>
              </div>
              <div className="mt-4 space-y-3">
                {['ETH Excellence', 'Oxford Clarendon', 'DAAD Grant'].map((title, index) => (
                  <div key={title} className="rounded-lg border border-slate-100 p-3 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{12 + index * 6}d</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Application deadline</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
