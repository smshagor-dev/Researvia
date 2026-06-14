'use client';

import { useState } from 'react';
import {
  useDeleteAccount,
  useExportData,
  useLogoutAll,
  useRevokeSession,
  useSessions,
} from '@/lib/hooks';
import { Download, Laptop, Loader2, LogOut, Shield, Trash2 } from 'lucide-react';

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never';
}

export default function SecuritySettingsPage() {
  const [exportPreview, setExportPreview] = useState<string | null>(null);
  const sessionsQuery = useSessions();
  const revokeSession = useRevokeSession();
  const logoutAll = useLogoutAll();
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();

  const sessions = ((sessionsQuery.data as any)?.sessions || []) as Array<any>;

  const handleExport = async () => {
    const result = await exportData.mutateAsync();
    setExportPreview(JSON.stringify(result, null, 2).slice(0, 3000));
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          <Shield className="h-6 w-6 text-emerald-500" />
          Security
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Review active sessions, revoke access, export your data, and manage account recovery posture.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Sessions</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Terminate devices you no longer trust.</p>
            </div>
            <button
              type="button"
              onClick={() => logoutAll.mutate()}
              disabled={logoutAll.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
            >
              {logoutAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Logout All
            </button>
          </div>

          <div className="space-y-3">
            {sessionsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading sessions...</div>
            ) : null}

            {sessions.map((session) => (
              <div key={session.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-sky-500" />
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {session.isCurrent ? 'Current session' : 'Signed-in session'}
                    </p>
                    {session.revokedAt ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">Revoked</span> : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{session.userAgent || 'Unknown device'}</p>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500 dark:text-slate-500 sm:grid-cols-3">
                    <span>IP: {session.ipAddress || 'Unknown'}</span>
                    <span>Last active: {formatDate(session.lastActivityAt)}</span>
                    <span>Expires: {formatDate(session.expiresAt)}</span>
                  </div>
                </div>

                {!session.isCurrent && !session.revokedAt ? (
                  <button
                    type="button"
                    onClick={() => revokeSession.mutate(session.id)}
                    disabled={revokeSession.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {revokeSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Terminate
                  </button>
                ) : null}
              </div>
            ))}

            {!sessions.length && !sessionsQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No active sessions found.
              </div>
            ) : null}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">GDPR Export</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Download a full copy of your account data, profile, applications, billing, and session history.
            </p>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportData.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
            >
              {exportData.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Generate Export
            </button>
            {exportPreview ? (
              <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{exportPreview}</pre>
            ) : null}
          </section>

          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/10">
            <h2 className="text-lg font-semibold text-rose-800 dark:text-rose-200">Delete Account</h2>
            <p className="mt-1 text-sm text-rose-700/80 dark:text-rose-200/80">
              This revokes all sessions and marks your account as deleted. Use only if you intend to permanently leave the platform.
            </p>
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm('Delete your account and revoke all sessions? This cannot be undone.');
                if (confirmed) {
                  deleteAccount.mutate();
                }
              }}
              disabled={deleteAccount.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {deleteAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Account
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
