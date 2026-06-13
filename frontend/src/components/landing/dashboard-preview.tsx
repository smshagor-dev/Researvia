import { BookOpen, Mail, MessageSquareText, TrendingUp, WalletCards } from 'lucide-react';

const stats = [
  { label: 'Email Sent', value: '1,248', icon: Mail, tone: 'bg-blue-50 text-blue-700' },
  { label: 'Open Rate', value: '74%', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700' },
  { label: 'Replies', value: '186', icon: MessageSquareText, tone: 'bg-purple-50 text-purple-700' },
  { label: 'Credits Left', value: '320', icon: WalletCards, tone: 'bg-amber-50 text-amber-700' },
];

const activity = [
  { name: 'Dr. Elena Park', detail: 'Opened your follow-up email', time: '4m ago' },
  { name: 'Prof. Marcus Lee', detail: 'Replied about PhD supervision', time: '18m ago' },
  { name: 'Dr. Amara Singh', detail: 'Email scheduled for tomorrow', time: '1h ago' },
];

const deadlines = [
  { title: 'ETH Excellence Scholarship', date: 'Feb 12', status: '12 days left' },
  { title: 'Oxford Clarendon Fund', date: 'Feb 18', status: '18 days left' },
  { title: 'DAAD Research Grant', date: 'Mar 03', status: '31 days left' },
];

export function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-purple-500/20 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl shadow-slate-900/12">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs font-semibold text-slate-500">ProfCRM workspace</span>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Academic pipeline</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Communication command center</h2>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Live tracking</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="recent-activity">
              <h3 id="recent-activity" className="text-sm font-bold text-slate-950">Recent Email Activity</h3>
              <div className="mt-4 space-y-3">
                {activity.map((item) => (
                  <div key={item.name} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="deadlines">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                <h3 id="deadlines" className="text-sm font-bold text-slate-950">Upcoming Scholarship Deadlines</h3>
              </div>
              <div className="mt-4 space-y-3">
                {deadlines.map((deadline) => (
                  <div key={deadline.title} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{deadline.title}</p>
                      <span className="text-xs font-bold text-indigo-600">{deadline.date}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{deadline.status}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
