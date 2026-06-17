'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Search, Sparkles } from 'lucide-react';
import {
  useAdminScholarship,
  useAdminScholarshipApprove,
  useAdminScholarshipDeadlineSync,
  useAdminScholarshipDiscover,
  useAdminScholarshipQualitySync,
  useAdminScholarshipReject,
  useAdminScholarshipResync,
  useAdminScholarships,
  useAdminScholarshipSyncDetails,
  useAdminScholarshipUpdate,
  useAdminSyncJobs,
  useAdminSyncLogs,
} from '@/lib/hooks';
import { DEGREE_LEVEL_LABELS, FUNDING_TYPE_LABELS, formatDate } from '@/lib/utils';

const SCHOLARSHIP_QUEUES = [
  'scholarship-discovery',
  'scholarship-sync',
  'scholarship-deadline-check',
  'scholarship-quality-score',
] as const;

export default function AdminScholarshipsPage() {
  const [query, setQuery] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [syncLogsPage, setSyncLogsPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({
    title: '',
    providerName: '',
    description: '',
    verificationStatus: 'pending',
    status: 'draft',
  });

  const params = useMemo(
    () => ({
      q: query || undefined,
      verificationStatus: verificationStatus || undefined,
      status: status || undefined,
      page,
      perPage: 15,
      sortBy: 'createdAt',
    }),
    [page, query, status, verificationStatus],
  );

  const { data, isLoading, isFetching } = useAdminScholarships(params);
  const detailQuery = useAdminScholarship(selectedId);
  const syncJobsQuery = useAdminSyncJobs();
  const syncLogsQuery = useAdminSyncLogs({ page: syncLogsPage, pageSize: 4 });
  const approve = useAdminScholarshipApprove();
  const reject = useAdminScholarshipReject();
  const resync = useAdminScholarshipResync();
  const discover = useAdminScholarshipDiscover();
  const syncDetails = useAdminScholarshipSyncDetails();
  const syncDeadlines = useAdminScholarshipDeadlineSync();
  const syncQuality = useAdminScholarshipQualitySync();
  const update = useAdminScholarshipUpdate();

  const rows = ((data as any)?.data || []) as any[];
  const meta = (data as any)?.meta || {};
  const detail = detailQuery.data as any;
  const syncJobs = ((syncJobsQuery.data as any[]) || []).filter((queue) => SCHOLARSHIP_QUEUES.includes(queue.queueName));
  const syncLogsData = (syncLogsQuery.data as any) || {};
  const syncLogs = ((syncLogsData.data || []) as any[]).filter((log) => SCHOLARSHIP_QUEUES.includes(log.queueName));
  const syncLogsMeta = syncLogsData.meta || {};
  const queueCounts = syncJobs.reduce(
    (acc, queue) => {
      acc.running += Number(queue?.counts?.active || 0);
      acc.waiting += Number(queue?.counts?.waiting || 0) + Number(queue?.counts?.delayed || 0);
      acc.failed += Number(queue?.counts?.failed || 0);
      return acc;
    },
    { running: 0, waiting: 0, failed: 0 },
  );
  const isSyncBusy = queueCounts.running > 0 || queueCounts.waiting > 0;
  const lastSyncTime =
    syncLogs.find((log) => log.completedAt || log.createdAt)?.completedAt ||
    syncLogs[0]?.createdAt ||
    null;

  useEffect(() => {
    if (!detail) {
      return;
    }

    setForm({
      title: detail.title || '',
      providerName: detail.providerName || '',
      description: detail.description || '',
      verificationStatus: detail.verificationStatus || 'pending',
      status: detail.status || 'draft',
    });
  }, [detail]);

  useEffect(() => {
    setPage(1);
  }, [query, status, verificationStatus]);

  const closeModal = () => {
    setSelectedId('');
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scholarship Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fully automated scholarship discovery, detail sync, deadline monitoring, and quality scoring.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.6fr,1fr]">
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 dark:border-amber-500/20 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.92),rgba(15,23,42,0.96),rgba(124,45,18,0.92))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Sync Control</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Scholarship Automation Engine</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Discovery, details sync, deadline checks, and quality score refresh now run as one continuous automated pipeline.
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Auto sync every 12 hours
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-amber-500 dark:text-amber-300" />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => discover.mutate({})}
              disabled={discover.isPending}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-50"
            >
              {discover.isPending ? 'Queueing...' : 'Run Discovery'}
            </button>
            <button
              type="button"
              onClick={() => syncDetails.mutate({})}
              disabled={syncDetails.isPending}
              className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
            >
              {syncDetails.isPending ? 'Queueing...' : 'Sync Details'}
            </button>
            <button
              type="button"
              onClick={() => syncDeadlines.mutate()}
              disabled={syncDeadlines.isPending}
              className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
            >
              {syncDeadlines.isPending ? 'Queueing...' : 'Check Deadlines'}
            </button>
            <button
              type="button"
              onClick={() => syncQuality.mutate({})}
              disabled={syncQuality.isPending}
              className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
            >
              {syncQuality.isPending ? 'Queueing...' : 'Refresh Quality'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Last sync time</p>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'No sync yet'}
            </p>
            {isSyncBusy ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Scholarship sync is running. Records refresh automatically.
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Running</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{queueCounts.running}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Queued</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{queueCounts.waiting}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Failed</p>
              <p className="mt-2 text-lg font-semibold text-red-600 dark:text-rose-300">{queueCounts.failed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Recent Sync Logs</h3>
              <p className="text-sm text-gray-500">Discovery, details, deadlines, and quality job activity.</p>
            </div>
            {syncLogsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : null}
          </div>
          <div className="space-y-3">
            {syncLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{log.queueName}</p>
                    <p className="text-xs text-gray-500">{log.jobName}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{log.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                  <span>Processed: {log.processedCount}</span>
                  <span>Created: {log.createdCount}</span>
                  <span>Updated: {log.updatedCount}</span>
                  <span>Skipped: {log.skippedCount}</span>
                </div>
                {log.errorMessage ? <p className="mt-2 text-xs text-red-600">{log.errorMessage}</p> : null}
              </div>
            ))}
            {syncLogs.length === 0 ? <p className="text-sm text-gray-500">No scholarship sync logs yet.</p> : null}
          </div>
          {syncLogs.length > 0 ? (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-600">
              <p>
                Page {syncLogsMeta.currentPage || 1} of {syncLogsMeta.totalPages || 1} · Showing up to 4 logs
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSyncLogsPage((current) => Math.max(1, current - 1))}
                  disabled={(syncLogsMeta.currentPage || 1) <= 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSyncLogsPage((current) =>
                      (syncLogsMeta.currentPage || 1) < (syncLogsMeta.totalPages || 1) ? current + 1 : current,
                    )
                  }
                  disabled={(syncLogsMeta.currentPage || 1) >= (syncLogsMeta.totalPages || 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Queue Snapshot</h3>
              <p className="text-sm text-gray-500">Live scholarship queue backlog and progress.</p>
            </div>
            {syncJobsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : null}
          </div>
          <div className="space-y-3">
            {syncJobs.map((queue: any) => (
              <div key={queue.queueName} className="rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">{queue.queueName}</p>
                  <p className="text-xs text-gray-500">
                    Active {queue.counts?.active || 0} · Waiting {queue.counts?.waiting || 0} · Failed {queue.counts?.failed || 0}
                  </p>
                </div>
                <div className="mt-2 space-y-1">
                  {(queue.jobs || []).slice(0, 2).map((job: any) => (
                    <p key={job.id} className="text-xs text-gray-600">
                      {job.name} · {job.state} · progress {typeof job.progress === 'number' ? job.progress : 0}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {syncJobs.length === 0 ? <p className="text-sm text-gray-500">No scholarship queue activity yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title or provider..."
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={verificationStatus}
          onChange={(event) => setVerificationStatus(event.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-4">
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
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className="text-left font-medium text-gray-900 hover:text-amber-600"
                      >
                        {row.title}
                      </button>
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
                        <button
                          type="button"
                          onClick={() => approve.mutate(row.id)}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reject.mutate(row.id)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => resync.mutate(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700"
                        >
                          <RefreshCcw className={`h-3.5 w-3.5 ${resync.isPending ? 'animate-spin' : ''}`} />
                          Resync
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-500">
                      No scholarships matched the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
            <p>
              Page {meta.currentPage || 1} of {meta.totalPages || 1} · Total records: {meta.total || meta.totalRecords || 0}
              {isFetching ? ' · Refreshing...' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={(meta.currentPage || 1) <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => ((meta.currentPage || 1) < (meta.totalPages || 1) ? current + 1 : current))}
                disabled={(meta.currentPage || 1) >= (meta.totalPages || 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Scholarship Detail</h2>
                <p className="text-sm text-gray-500">{selectedId}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {detailQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : detail ? (
                <div className="space-y-4 text-sm">
                  <label className="block">
                    <span className="font-medium text-gray-700">Title</span>
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-gray-700">Provider</span>
                    <input
                      value={form.providerName}
                      onChange={(event) => setForm((current) => ({ ...current, providerName: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-gray-700">Description</span>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      rows={5}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="font-medium text-gray-700">Verification</span>
                      <select
                        value={form.verificationStatus}
                        onChange={(event) => setForm((current) => ({ ...current, verificationStatus: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      >
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-medium text-gray-700">Status</span>
                      <select
                        value={form.status}
                        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="closed">Closed</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Deadline</p>
                      <p className="mt-1 text-gray-700">{detail.deadline ? formatDate(detail.deadline) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Quality score</p>
                      <p className="mt-1 text-gray-700">{detail.qualityScore ?? 0}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await update.mutateAsync({
                          id: selectedId,
                          data: {
                            title: form.title,
                            providerName: form.providerName,
                            description: form.description,
                            verificationStatus: form.verificationStatus,
                            status: form.status,
                          },
                        });
                        closeModal();
                      }}
                      disabled={update.isPending}
                      className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {update.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">Scholarship details are unavailable.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
