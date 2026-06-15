'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { universitiesApi } from '@/lib/api';

type UniversityRow = {
  id: string;
  name: string;
  city: string | null;
  type: string | null;
  qsRanking: number | null;
  country?: {
    name?: string | null;
  } | null;
};

export default function AdminUniversitiesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['admin-universities', page],
    queryFn: () => universitiesApi.list({ page, perPage: 15 }),
  });

  const statsQuery = useQuery({
    queryKey: ['admin-universities-sync-stats'],
    queryFn: () => universitiesApi.getSyncStats(),
  });

  const syncMutation = useMutation({
    mutationFn: () => universitiesApi.sync(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-universities'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-universities-sync-stats'] }),
      ]);
    },
  });

  const listResult = (listQuery.data as any) || {};
  const rows = ((listResult.data || []) as UniversityRow[]);
  const rawMeta = listResult.meta || {};
  const meta = {
    currentPage: rawMeta.currentPage ?? rawMeta.page ?? 1,
    totalPages: rawMeta.totalPages ?? rawMeta.lastPage ?? 1,
    totalRecords: rawMeta.totalRecords ?? rawMeta.total ?? 0,
  };
  const stats = (statsQuery.data as any) || {};
  const latestSync = stats.latestSync || null;
  const runningSync = stats.runningSync || null;

  const syncSummary = useMemo(() => {
    if (runningSync) {
      return {
        title: 'Sync in progress',
        detail: 'OpenAlex data is loading right now.',
      };
    }

    if (!latestSync) {
      return {
        title: 'No sync yet',
        detail: 'Use Load Universities to fetch the latest list.',
      };
    }

    const deactivatedCount = Number((latestSync.metadataJson as any)?.deactivatedCount || 0);
    return {
      title: latestSync.status === 'completed' ? 'Last sync completed' : `Last sync ${latestSync.status}`,
      detail: `Created ${latestSync.createdCount}, updated ${latestSync.updatedCount}, removed ${deactivatedCount}.`,
    };
  }, [latestSync, runningSync]);

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Universities</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            OpenAlex-powered institution records for search filters, scholarship data, and professor matching.
          </p>
        </div>
        <button
          type="button"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || Boolean(runningSync)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          {syncMutation.isPending ? 'Loading...' : 'Load Universities'}
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 dark:border-sky-400/20 dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,23,42,0.96),rgba(8,51,68,0.92))]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">All Universities</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{stats.totalActive ?? meta.totalRecords}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Active universities currently visible across the platform.</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">Last Sync</p>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            {latestSync?.completedAt
              ? new Date(latestSync.completedAt).toLocaleString()
              : latestSync?.startedAt
                ? new Date(latestSync.startedAt).toLocaleString()
                : 'Not synced yet'}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{syncSummary.detail}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">Auto Sync</p>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">Every {stats.syncIntervalHours ?? 12} hours</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Missing universities from the latest API snapshot are automatically marked inactive and removed from the list.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{syncSummary.title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Trigger: {(runningSync?.metadataJson as any)?.triggeredBy || (latestSync?.metadataJson as any)?.triggeredBy || 'system'}
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400">
            <p>Inactive universities: {stats.totalInactive ?? 0}</p>
            <p>{runningSync ? 'A sync is running now.' : 'Manual sync is available anytime.'}</p>
          </div>
        </div>
        {syncMutation.isError ? (
          <p className="mt-4 text-sm text-red-600">University sync failed. Please try again after a moment.</p>
        ) : null}
        {statsQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">Could not load university sync stats.</p>
        ) : null}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/10 dark:bg-white/5">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">QS Rank</th>
                  <th className="px-4 py-3">Professors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 dark:border-white/5">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.country?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.city || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.type || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.qsRanking || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/admin/professors?university=${encodeURIComponent(row.id)}&universityName=${encodeURIComponent(row.name)}`}
                        className="inline-flex rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-50 dark:border-sky-400/20 dark:text-sky-200 dark:hover:bg-white/10"
                      >
                        View All
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
                      No active universities found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <p>
              Page {meta.currentPage} of {meta.totalPages}
              {' '}·{' '}Total records: {meta.totalRecords}
              {listQuery.isFetching ? ' · Refreshing...' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={meta.currentPage <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50 dark:border-white/10"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => (meta.currentPage < meta.totalPages ? current + 1 : current))}
                disabled={meta.currentPage >= meta.totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50 dark:border-white/10"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
