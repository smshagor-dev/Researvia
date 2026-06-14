'use client';

import { useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Search } from 'lucide-react';
import {
  useAdminScholarshipApprove,
  useAdminScholarshipDiscover,
  useAdminScholarshipReject,
  useAdminScholarshipResync,
  useAdminScholarships,
  useAdminScholarshipSyncDetails,
  useAdminScholarshipUpdate,
} from '@/lib/hooks';
import { DEGREE_LEVEL_LABELS, FUNDING_TYPE_LABELS, formatDate } from '@/lib/utils';

export default function AdminScholarshipsPage() {
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

  const { data, isLoading, isFetching } = useAdminScholarships(params);
  const approve = useAdminScholarshipApprove();
  const reject = useAdminScholarshipReject();
  const resync = useAdminScholarshipResync();
  const discover = useAdminScholarshipDiscover();
  const syncDetails = useAdminScholarshipSyncDetails();
  const update = useAdminScholarshipUpdate();

  const rows = ((data as any)?.data || []) as any[];

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scholarship Management</h1>
          <p className="mt-1 text-sm text-gray-500">Review, verify, resync, and curate funding opportunities discovered from trusted sources.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => discover.mutate({})} disabled={discover.isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {discover.isPending ? 'Queueing...' : 'Run Discovery'}
          </button>
          <button type="button" onClick={() => syncDetails.mutate({})} disabled={syncDetails.isPending} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-50">
            {syncDetails.isPending ? 'Queueing...' : 'Sync Details'}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or provider..." className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="">All verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Degree</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Funding</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Quality</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 align-top">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setSelected(row)} className="text-left font-medium text-gray-900 hover:text-blue-600">{row.title}</button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.providerName || row.university?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-600">{row.country?.name || 'Global'}</td>
                  <td className="px-4 py-3 text-gray-600">{DEGREE_LEVEL_LABELS[row.degreeLevel] || row.degreeLevel || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-600">{row.deadline ? formatDate(row.deadline) : 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-600">{FUNDING_TYPE_LABELS[row.fundingType] || row.fundingType}</td>
                  <td className="px-4 py-3 text-gray-600">{row.verificationStatus}</td>
                  <td className="px-4 py-3 text-gray-600">{row.status}</td>
                  <td className="px-4 py-3 text-gray-600">{row.qualityScore ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => approve.mutate(row.id)} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700">Approve</button>
                      <button type="button" onClick={() => reject.mutate(row.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700">Reject</button>
                      <button type="button" onClick={() => resync.mutate(row.id)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700">
                        <RefreshCcw className={`h-3.5 w-3.5 ${resync.isPending ? 'animate-spin' : ''}`} />
                        Resync
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-500">No scholarships matched the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Scholarship Detail</h2>
                <p className="text-sm text-gray-500">{selected.id}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600">Close</button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm">
              <label className="block">
                <span className="font-medium text-gray-700">Title</span>
                <input value={selected.title} onChange={(event) => setSelected((current: any) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
              </label>
              <label className="block">
                <span className="font-medium text-gray-700">Provider</span>
                <input value={selected.providerName || ''} onChange={(event) => setSelected((current: any) => ({ ...current, providerName: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
              </label>
              <label className="block">
                <span className="font-medium text-gray-700">Description</span>
                <textarea value={selected.description || ''} onChange={(event) => setSelected((current: any) => ({ ...current, description: event.target.value }))} rows={5} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="font-medium text-gray-700">Verification</span>
                  <select value={selected.verificationStatus || 'pending'} onChange={(event) => setSelected((current: any) => ({ ...current, verificationStatus: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2">
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-medium text-gray-700">Status</span>
                  <select value={selected.status || 'draft'} onChange={(event) => setSelected((current: any) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
                <button
                  type="button"
                  onClick={async () => {
                    await update.mutateAsync({
                      id: selected.id,
                      data: {
                        title: selected.title,
                        providerName: selected.providerName,
                        description: selected.description,
                        verificationStatus: selected.verificationStatus,
                        status: selected.status,
                      },
                    });
                    setSelected(null);
                  }}
                  disabled={update.isPending}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {update.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isFetching ? <p className="mt-4 text-sm text-gray-500">Refreshing scholarship data…</p> : null}
    </div>
  );
}
