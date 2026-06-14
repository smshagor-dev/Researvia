'use client';

import { Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import { useAdminMatchJobs, useAdminMatchStats, useAdminRecalculateMatches } from '@/lib/hooks';

export default function AdminMatchesPage() {
  const statsQuery = useAdminMatchStats();
  const jobsQuery = useAdminMatchJobs();
  const recalculate = useAdminRecalculateMatches();

  const stats = (statsQuery.data as any) || {};
  const queues = ((jobsQuery.data as any)?.queues || []) as any[];

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6 px-6 py-6 xl:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Match Engine</h1>
          <p className="mt-1 text-sm text-slate-400">Observe profile analysis, compatibility scoring, and refresh jobs across professor and scholarship matching.</p>
        </div>
        <button
          type="button"
          onClick={() => recalculate.mutate({ force: true, targetType: 'all' })}
          disabled={recalculate.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {recalculate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Recalculate Recent Users
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="Academic Profiles" value={stats.academicProfiles || 0} />
        <StatCard label="Professor Matches" value={stats.professorMatches || 0} />
        <StatCard label="Scholarship Matches" value={stats.scholarshipMatches || 0} />
        <StatCard label="CV Parses 24h" value={stats.cvParsesLast24h || 0} />
        <StatCard label="Avg Match Score" value={stats.averageMatchScore || '0.0'} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">AI Match Queues</h2>
            <p className="text-sm text-slate-400">Queue health for profile analysis, professor scoring, scholarship scoring, and bulk refresh jobs.</p>
          </div>
          <button type="button" onClick={() => { statsQuery.refetch(); jobsQuery.refetch(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
            <RefreshCcw className={`h-4 w-4 ${statsQuery.isFetching || jobsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm text-slate-200">
            <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-3">Queue</th>
                <th className="px-3 py-3">Active</th>
                <th className="px-3 py-3">Waiting</th>
                <th className="px-3 py-3">Failed</th>
                <th className="px-3 py-3">Stuck</th>
                <th className="px-3 py-3">Latency</th>
                <th className="px-3 py-3">Last Success</th>
                <th className="px-3 py-3">Last Failure</th>
              </tr>
            </thead>
            <tbody>
              {queues.map((queue) => (
                <tr key={queue.queueName} className="border-b border-white/5">
                  <td className="px-3 py-3 font-medium text-white">{queue.queueName}</td>
                  <td className="px-3 py-3">{queue.counts?.active || 0}</td>
                  <td className="px-3 py-3">{(queue.counts?.waiting || 0) + (queue.counts?.delayed || 0)}</td>
                  <td className="px-3 py-3 text-rose-300">{queue.counts?.failed || 0}</td>
                  <td className="px-3 py-3 text-amber-300">{queue.stuckJobs?.count || 0}</td>
                  <td className="px-3 py-3">{Math.round((queue.queueLatencyMs || 0) / 1000)}s</td>
                  <td className="px-3 py-3">{queue.lastSuccessfulJobAt ? new Date(queue.lastSuccessfulJobAt).toLocaleString() : 'Never'}</td>
                  <td className="px-3 py-3">{queue.lastFailedJobAt ? new Date(queue.lastFailedJobAt).toLocaleString() : 'Never'}</td>
                </tr>
              ))}
              {!queues.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">No AI queue telemetry available yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
