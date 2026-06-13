'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Loader2, Mail, RefreshCcw, Save, ShieldCheck } from 'lucide-react';

export default function AdminMailboxesPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const { data: stats } = useQuery({ queryKey: ['mailbox-stats'], queryFn: adminApi.getMailboxStats, staleTime: 0, refetchOnMount: 'always' });
  const { data: mailboxes, isLoading } = useQuery({ queryKey: ['admin-mailboxes'], queryFn: () => adminApi.getMailboxes({ perPage: 50 }), staleTime: 0, refetchOnMount: 'always' });
  const { data: settings } = useQuery({ queryKey: ['mail-settings'], queryFn: adminApi.getMailSettings, staleTime: 0, refetchOnMount: 'always' });
  const [form, setForm] = useState<any>({});

  const current = { ...(settings as any || {}), ...form };
  const rows = (mailboxes as any)?.data || [];

  const saveSettings = async () => {
    setSaving(true);
    try {
      await adminApi.updateMailSettings({
        ...form,
        systemSmtpPort: current.systemSmtpPort ? Number(current.systemSmtpPort) : undefined,
        systemImapPort: current.systemImapPort ? Number(current.systemImapPort) : undefined,
        systemMailboxQuotaMb: current.systemMailboxQuotaMb ? Number(current.systemMailboxQuotaMb) : undefined,
      });
      setForm({});
      await qc.invalidateQueries({ queryKey: ['mail-settings'] });
    } finally {
      setSaving(false);
    }
  };

  const runMailboxAction = async (id: string, action: () => Promise<unknown>) => {
    setActionId(id);
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ['admin-mailboxes'] });
      await qc.invalidateQueries({ queryKey: ['mailbox-stats'] });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Mail className="h-6 w-6 text-red-500" />
          Mailboxes
        </h1>
        <p className="mt-1 text-sm text-gray-500">Database-managed mail settings, cPanel provisioning, and mailbox health.</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {['total', 'active', 'failed', 'suspended'].map((key) => (
          <div key={key} className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{key}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{(stats as any)?.[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-red-500" />
          Mail Settings From Database
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['systemMailDomain', 'Mail domain'],
            ['systemSmtpHost', 'SMTP host'],
            ['systemSmtpPort', 'SMTP port'],
            ['systemImapHost', 'IMAP host'],
            ['systemImapPort', 'IMAP port'],
            ['systemMailboxQuotaMb', 'Quota MB'],
            ['trackingBaseUrl', 'Tracking base URL'],
            ['cpanelBaseUrl', 'cPanel base URL'],
            ['cpanelUsername', 'cPanel username'],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
              <input
                value={current[key] || ''}
                onChange={(event) => setForm((prev: any) => ({ ...prev, [key]: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          ))}
          <label className="block md:col-span-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">cPanel API token</span>
            <input
              type="password"
              placeholder={(settings as any)?.hasCpanelApiToken ? 'Token saved. Enter a new token to replace it.' : 'Paste cPanel API token'}
              value={form.cpanelApiToken || ''}
              onChange={(event) => setForm((prev: any) => ({ ...prev, cpanelApiToken: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button onClick={saveSettings} disabled={saving} className="gradient-primary mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-900">Mailbox List</h2>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-red-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                <tr><th className="py-2">Email</th><th>Owner</th><th>Type</th><th>Status</th><th>Last Sync</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{row.email}</td>
                    <td className="text-gray-500">{row.user?.fullName || row.user?.email}</td>
                    <td className="text-gray-500">{row.type} / {row.provider}</td>
                    <td className="text-gray-500">{row.mailboxStatus}</td>
                    <td className="text-gray-400">{row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : 'Never'}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => runMailboxAction(`${row.id}:suspend`, () => adminApi.suspendMailbox(row.id))}
                          disabled={actionId === `${row.id}:suspend`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                          {actionId === `${row.id}:suspend` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Suspend'}
                        </button>
                        {row.type === 'SYSTEM' && (
                          <button
                            onClick={() => runMailboxAction(`${row.id}:reset`, () => adminApi.resetMailboxPassword(row.id))}
                            disabled={actionId === `${row.id}:reset`}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                          >
                            {actionId === `${row.id}:reset` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                            Reset password
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
