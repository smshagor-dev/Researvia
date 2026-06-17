'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw, Search, Sparkles } from 'lucide-react';
import {
  useAdminProfessor,
  useAdminProfessorEmailDiscovery,
  useAdminProfessors,
  useAdminProfessorResync,
  useAdminProfessorUpdate,
  useAdminSyncJobs,
  useAdminSyncLogs,
  useRunDeduplication,
  useRunDiscoverySync,
  useRunProfileSync,
  useRunPublicationSync,
} from '@/lib/hooks';

type AdminProfessorRow = {
  id: string;
  name: string;
  university: string | null;
  country: string | null;
  department: string | null;
  researchAreas: string[];
  verifiedEmailCount: number;
  verificationStatus: string;
  isPublic: boolean;
  sourceType: string;
  dataQualityScore: number | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

const verificationOptions = ['pending', 'verified', 'failed', 'manual_review'];
const sourceOptions = ['openalex', 'orcid', 'crossref', 'ror', 'manual', 'import'];

export default function AdminProfessorsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [selectedUniversityName, setSelectedUniversityName] = useState('');
  const [query, setQuery] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [hasEmail, setHasEmail] = useState('');
  const [page, setPage] = useState(1);
  const [syncLogsPage, setSyncLogsPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    verificationStatus: 'pending',
    sourceType: 'manual',
    dataQualityScore: '',
    isPublic: true,
  });

  const params = useMemo(
    () => ({
      q: query || undefined,
      university: selectedUniversityId || undefined,
      verificationStatus: verificationStatus || undefined,
      hasEmail: hasEmail === '' ? undefined : hasEmail === 'true',
      page,
      pageSize: 15,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    [hasEmail, page, query, selectedUniversityId, verificationStatus],
  );

  const syncJobsQuery = useAdminSyncJobs();
  const syncLogsQuery = useAdminSyncLogs({ page: syncLogsPage, pageSize: 3 });
  const runDiscoverySync = useRunDiscoverySync();
  const runProfileSync = useRunProfileSync();
  const runPublicationSync = useRunPublicationSync();
  const runDeduplication = useRunDeduplication();

  const syncJobs = (syncJobsQuery.data as any[]) || [];
  const syncLogsData = (syncLogsQuery.data as any) || {};
  const syncLogs = (syncLogsData.data || []) as any[];
  const syncLogsMeta = syncLogsData.meta || {};
  const discoveryQueue = syncJobs.find((queue: any) => queue.queueName === 'professor-discovery');
  const profileQueue = syncJobs.find((queue: any) => queue.queueName === 'professor-profile-sync');
  const hasDiscoveryBacklog =
    Number(discoveryQueue?.counts?.active || 0) +
      Number(discoveryQueue?.counts?.waiting || 0) +
      Number(discoveryQueue?.counts?.delayed || 0) >
    0;
  const hasProfileBacklog =
    Number(profileQueue?.counts?.active || 0) +
      Number(profileQueue?.counts?.waiting || 0) +
      Number(profileQueue?.counts?.delayed || 0) >
    0;
  const shouldPollProfessors =
    hasDiscoveryBacklog || hasProfileBacklog || runDiscoverySync.isPending || runProfileSync.isPending;
  const { data, isLoading, isFetching } = useAdminProfessors(params, {
    refetchInterval: shouldPollProfessors ? 10000 : false,
  });
  const detailQuery = useAdminProfessor(selectedId);
  const updateProfessor = useAdminProfessorUpdate();
  const resyncProfessor = useAdminProfessorResync();
  const discoverProfessorEmails = useAdminProfessorEmailDiscovery();
  const rows = (((data as any)?.data || []) as AdminProfessorRow[]);
  const meta = (data as any)?.meta || {};
  const detail = detailQuery.data as any;
  const jobCounts = syncJobs.reduce(
    (acc, queue) => {
      acc.running += Number(queue?.counts?.active || 0);
      acc.failed += Number(queue?.counts?.failed || 0);
      acc.waiting += Number(queue?.counts?.waiting || 0) + Number(queue?.counts?.delayed || 0);
      return acc;
    },
    { running: 0, failed: 0, waiting: 0 },
  );
  const lastSyncTime = syncLogs.find((log) => log.completedAt || log.createdAt)?.completedAt || syncLogs[0]?.createdAt || null;
  const activeSyncMessage = hasDiscoveryBacklog
    ? `Professor loading is in progress. ${Number(discoveryQueue?.counts?.active || 0)} running and ${Number(discoveryQueue?.counts?.waiting || 0)} queued job(s).`
    : hasProfileBacklog
      ? `Profile sync is processing. ${Number(profileQueue?.counts?.active || 0)} running and ${Number(profileQueue?.counts?.waiting || 0)} queued job(s).`
      : null;

  useEffect(() => {
    if (!detail || !editMode) return;
    setForm({
      fullName: detail.fullName || '',
      verificationStatus: detail.verificationStatus || 'pending',
      sourceType: detail.sourceType || 'manual',
      dataQualityScore: detail.dataQualityScore?.toString() || '',
      isPublic: Boolean(detail.isPublic),
    });
  }, [detail, editMode]);

  useEffect(() => {
    setPage(1);
  }, [selectedUniversityId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSelectedUniversityId(params.get('university') || '');
    setSelectedUniversityName(params.get('universityName') || '');
  }, []);

  useEffect(() => {
    if (!shouldPollProfessors) return;

    queryClient.invalidateQueries({ queryKey: ['admin-professors'] });
  }, [queryClient, shouldPollProfessors, syncJobsQuery.dataUpdatedAt, syncLogsQuery.dataUpdatedAt]);

  const openModal = (id: string, mode: 'view' | 'edit') => {
    setSelectedId(id);
    setEditMode(mode === 'edit');
  };

  const closeModal = () => {
    setSelectedId('');
    setEditMode(false);
  };

  const saveChanges = async () => {
    if (!selectedId) return;
    await updateProfessor.mutateAsync({
      id: selectedId,
      data: {
        fullName: form.fullName,
        verificationStatus: form.verificationStatus,
        sourceType: form.sourceType,
        isPublic: form.isPublic,
        dataQualityScore: form.dataQualityScore === '' ? null : Number(form.dataQualityScore),
      },
    });
    setEditMode(false);
  };

  const clearUniversityFilter = () => {
    setSelectedUniversityId('');
    setSelectedUniversityName('');
    router.push('/dashboard/admin/professors');
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[260px]">
          <h1 className="text-2xl font-bold text-gray-900">Professors</h1>
          <p className="mt-1 text-sm text-gray-500">Dedicated admin management for professor records and sync metadata.</p>
          {selectedUniversityId ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                University: {selectedUniversityName || selectedUniversityId}
              </span>
              <button
                type="button"
                onClick={clearUniversityFilter}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600"
              >
                Show all universities
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search professor, email, university..."
              className="w-72 rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={verificationStatus}
            onChange={(event) => {
              setVerificationStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All verification</option>
            {verificationOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            value={hasEmail}
            onChange={(event) => {
              setHasEmail(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All email states</option>
            <option value="true">Has verified email</option>
            <option value="false">No verified email</option>
          </select>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.6fr,1fr]">
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 dark:border-sky-500/20 dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,23,42,0.96),rgba(8,51,68,0.92))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Sync Control</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Professor Discovery Engine</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Queue discovery, profile, publication, and deduplication runs without blocking the admin page.
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Auto sync every 12 hours
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-sky-500 dark:text-sky-300" />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => runDiscoverySync.mutate({})}
              disabled={runDiscoverySync.isPending || hasDiscoveryBacklog}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/15 transition hover:bg-sky-500 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              {runDiscoverySync.isPending ? 'Queueing...' : hasDiscoveryBacklog ? 'Loading queued...' : 'Load Professors'}
            </button>
            <button
              type="button"
              onClick={() => runProfileSync.mutate()}
              disabled={runProfileSync.isPending || hasProfileBacklog}
              className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-50 dark:border-sky-400/20 dark:bg-white/5 dark:text-sky-200 dark:hover:bg-white/10"
            >
              {runProfileSync.isPending ? 'Queueing...' : hasProfileBacklog ? 'Profile Sync Running...' : 'Run Profile Sync'}
            </button>
            <button
              type="button"
              onClick={() => runPublicationSync.mutate()}
              disabled={runPublicationSync.isPending}
              className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-50 dark:border-sky-400/20 dark:bg-white/5 dark:text-sky-200 dark:hover:bg-white/10"
            >
              {runPublicationSync.isPending ? 'Queueing...' : 'Run Publication Sync'}
            </button>
            <button
              type="button"
              onClick={() => runDeduplication.mutate()}
              disabled={runDeduplication.isPending}
              className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-50 dark:border-sky-400/20 dark:bg-white/5 dark:text-sky-200 dark:hover:bg-white/10"
            >
              {runDeduplication.isPending ? 'Queueing...' : 'Run Deduplication'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Last sync time</p>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'No sync yet'}
            </p>
            {activeSyncMessage ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {activeSyncMessage}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Running</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{jobCounts.running}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Queued</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{jobCounts.waiting}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase text-gray-500 dark:text-slate-400">Failed</p>
              <p className="mt-2 text-lg font-semibold text-red-600 dark:text-rose-300">{jobCounts.failed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Recent Sync Logs</h3>
              <p className="text-sm text-gray-500">Processed, created, updated, skipped, and failure details.</p>
            </div>
            {syncLogsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-sky-500" /> : null}
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
            {syncLogs.length === 0 ? <p className="text-sm text-gray-500">No sync logs yet.</p> : null}
          </div>
          {syncLogs.length > 0 ? (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-600">
              <p>
                Page {syncLogsMeta.currentPage || 1} of {syncLogsMeta.totalPages || 1}
                {' '}·{' '}Showing up to 3 logs
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
              <p className="text-sm text-gray-500">Active BullMQ queues and recent job states.</p>
            </div>
            {syncJobsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-sky-500" /> : null}
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
            {syncJobs.length === 0 ? <p className="text-sm text-gray-500">No queued jobs yet.</p> : null}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeSyncMessage ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{activeSyncMessage} Total records and visible rows will refresh automatically.</span>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Professor</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Emails</th>
                  <th className="px-4 py-3">Quality Score</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Last Sync</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.department || row.researchAreas[0] || 'No department'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.university || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.country || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {row.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.verifiedEmailCount}</td>
                    <td className="px-4 py-3 text-gray-600">{row.dataQualityScore ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.sourceType}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(row.id, 'view')}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal(row.id, 'edit')}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => resyncProfessor.mutate(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700"
                        >
                          <RefreshCcw className={`h-3.5 w-3.5 ${resyncProfessor.isPending ? 'animate-spin' : ''}`} />
                          Resync
                        </button>
                        <button
                          type="button"
                          onClick={() => discoverProfessorEmails.mutate(row.id)}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700"
                        >
                          Collect Emails
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                      No professors matched the current admin filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
            <p>
              Page {meta.currentPage || 1} of {meta.totalPages || 1}
              {' '}·{' '}Total records: {meta.totalRecords || 0}
              {isFetching ? ' · Refreshing…' : ''}
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
                <h2 className="text-lg font-semibold text-gray-900">{editMode ? 'Edit professor' : 'Professor detail'}</h2>
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
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : detail ? (
                editMode ? (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Full name
                      <input
                        value={form.fullName}
                        onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Verification
                        <select
                          value={form.verificationStatus}
                          onChange={(event) => setForm((current) => ({ ...current, verificationStatus: event.target.value }))}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                        >
                          {verificationOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm font-medium text-gray-700">
                        Source
                        <select
                          value={form.sourceType}
                          onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                        >
                          {sourceOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Quality score
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={form.dataQualityScore}
                          onChange={(event) => setForm((current) => ({ ...current, dataQualityScore: event.target.value }))}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                        />
                      </label>

                      <label className="flex items-center gap-2 pt-7 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.isPublic}
                          onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))}
                        />
                        Visible on public catalog
                      </label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveChanges}
                        disabled={updateProfessor.isPending}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {updateProfessor.isPending ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 text-sm">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase text-gray-500">Professor</p>
                        <p className="mt-1 font-medium text-gray-900">{detail.fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">University</p>
                        <p className="mt-1 text-gray-700">{detail.university || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">Country</p>
                        <p className="mt-1 text-gray-700">{detail.country || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">Verification</p>
                        <p className="mt-1 text-gray-700">{detail.verificationStatus}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">Source</p>
                        <p className="mt-1 text-gray-700">{detail.sourceType}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">Quality score</p>
                        <p className="mt-1 text-gray-700">{detail.dataQualityScore ?? 'N/A'}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase text-gray-500">Research areas</p>
                      <p className="mt-1 text-gray-700">{detail.researchAreas?.join(', ') || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase text-gray-500">Emails</p>
                      <div className="mt-2 space-y-2">
                        {(detail.emails || []).map((email: any) => (
                          <div key={email.id} className="rounded-xl border border-gray-100 px-3 py-2">
                            <p className="font-medium text-gray-900">{email.email}</p>
                            <p className="text-xs text-gray-500">
                              {email.isVerified ? 'Verified' : 'Unverified'} · {email.verificationStatus}
                            </p>
                          </div>
                        ))}
                        {!detail.emails?.length ? <p className="text-gray-500">No emails stored.</p> : null}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">Professor details are unavailable.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {updateProfessor.isError ? <p className="mt-4 text-sm text-red-600">Failed to save professor changes.</p> : null}
      {resyncProfessor.isError ? <p className="mt-2 text-sm text-red-600">Failed to resync professor.</p> : null}
      {discoverProfessorEmails.isError ? <p className="mt-2 text-sm text-red-600">Failed to queue faculty email discovery.</p> : null}
      {detailQuery.isError ? <p className="mt-2 text-sm text-red-600">Failed to load professor detail.</p> : null}
    </div>
  );
}
