'use client';

import { useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Search } from 'lucide-react';
import {
  useAdminOpportunities,
  useAdminOpportunityApprove,
  useAdminOpportunityDiscover,
  useAdminOpportunityQualityScore,
  useAdminOpportunityReject,
  useAdminOpportunitySync,
  useAdminOpportunitySyncAll,
  useAdminOpportunityUpdate,
} from '@/lib/hooks';
import { OPPORTUNITY_TYPE_LABELS, formatDate } from '@/lib/utils';

export default function AdminOpportunitiesPage() {
  const [query, setQuery] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const params = useMemo(() => ({
    q: query || undefined,
    verificationStatus: verificationStatus || undefined,
    status: status || undefined,
    page: 1,
    perPage: 50,
    sortBy: 'createdAt',
  }), [query, status, verificationStatus]);

  const { data, isLoading, isFetching } = useAdminOpportunities(params);
  const approve = useAdminOpportunityApprove();
  const reject = useAdminOpportunityReject();
  const sync = useAdminOpportunitySync();
  const discover = useAdminOpportunityDiscover();
  const syncAll = useAdminOpportunitySyncAll();
  const quality = useAdminOpportunityQualityScore();
  const update = useAdminOpportunityUpdate();

  const rows = ((data as any)?.data || []) as any[];

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunity Marketplace Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Approve, reject, edit, sync, and quality-check academic opportunities across the marketplace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => discover.mutate()} disabled={discover.isPending} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {discover.isPending ? 'Queueing...' : 'Run Discovery'}
          </button>
          <button type="button" onClick={() => syncAll.mutate()} disabled={syncAll.isPending} className="rounded-xl border border-red-300/30 px-4 py-2 text-sm font-medium text-red-200 disabled:opacity-50">
            {syncAll.isPending ? 'Queueing...' : 'Sync'}
          </button>
          <button type="button" onClick={() => quality.mutate()} disabled={quality.isPending} className="rounded-xl border border-red-300/30 px-4 py-2 text-sm font-medium text-red-200 disabled:opacity-50">
            {quality.isPending ? 'Queueing...' : 'Analytics'}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, description, or requirements..." className="w-full rounded-xl border border-white/10 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white" />
        </div>
        <select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
          <option value="">All verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="manual_review">Manual review</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-300" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">University</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Quality</th>
                <th className="px-4 py-3">Applications</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 align-top text-slate-200">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setSelected(row)} className="text-left font-medium hover:text-red-300">{row.title}</button>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{OPPORTUNITY_TYPE_LABELS[row.type] || row.type}</td>
                  <td className="px-4 py-3 text-slate-400">{row.university?.name || row.professor?.fullName || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-400">{row.deadline ? formatDate(row.deadline) : 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-400">{row.verificationStatus}</td>
                  <td className="px-4 py-3 text-slate-400">{row.status}</td>
                  <td className="px-4 py-3 text-slate-400">{row.qualityScore ?? 0}</td>
                  <td className="px-4 py-3 text-slate-400">{row._count?.applications ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => approve.mutate(row.id)} className="rounded-lg border border-emerald-300/30 px-3 py-1.5 text-xs font-medium text-emerald-300">Approve</button>
                      <button type="button" onClick={() => reject.mutate(row.id)} className="rounded-lg border border-rose-300/30 px-3 py-1.5 text-xs font-medium text-rose-300">Reject</button>
                      <button type="button" onClick={() => sync.mutate(row.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-300/30 px-3 py-1.5 text-xs font-medium text-red-200">
                        <RefreshCcw className={`h-3.5 w-3.5 ${sync.isPending ? 'animate-spin' : ''}`} />
                        Sync
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Edit Opportunity</h2>
                <p className="text-sm text-slate-400">{selected.id}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300">Close</button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm">
              <label className="block">
                <span className="font-medium text-slate-200">Title</span>
                <input value={selected.title} onChange={(event) => setSelected((current: any) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
              </label>
              <label className="block">
                <span className="font-medium text-slate-200">Description</span>
                <textarea value={selected.description || ''} onChange={(event) => setSelected((current: any) => ({ ...current, description: event.target.value }))} rows={5} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
              </label>
              <label className="block">
                <span className="font-medium text-slate-200">Requirements</span>
                <textarea value={selected.requirements || ''} onChange={(event) => setSelected((current: any) => ({ ...current, requirements: event.target.value }))} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="font-medium text-slate-200">Verification</span>
                  <select value={selected.verificationStatus || 'pending'} onChange={(event) => setSelected((current: any) => ({ ...current, verificationStatus: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white">
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="manual_review">Manual review</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-medium text-slate-200">Status</span>
                  <select value={selected.status || 'draft'} onChange={(event) => setSelected((current: any) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="closed">Closed</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300">Cancel</button>
                <button
                  type="button"
                  onClick={async () => {
                    await update.mutateAsync({
                      id: selected.id,
                      data: {
                        title: selected.title,
                        description: selected.description,
                        requirements: selected.requirements,
                        verificationStatus: selected.verificationStatus,
                        status: selected.status,
                      },
                    });
                    setSelected(null);
                  }}
                  disabled={update.isPending}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {update.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isFetching ? <p className="mt-4 text-sm text-slate-400">Refreshing opportunity data...</p> : null}
    </div>
  );
}
