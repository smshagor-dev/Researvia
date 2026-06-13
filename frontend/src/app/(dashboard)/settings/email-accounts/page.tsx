'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { emailAccountsApi } from '@/lib/api';
import {
  CheckCircle2,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Server,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';

type ProviderTab = 'GMAIL' | 'OUTLOOK' | 'CUSTOM';

type EmailAccount = {
  id: string;
  type: 'SYSTEM' | 'CUSTOM';
  provider: 'SYSTEM' | 'GMAIL' | 'OUTLOOK' | 'CUSTOM';
  label: string | null;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  imapHost: string | null;
  imapPort: number | null;
  imapSecure: boolean;
  imapUsername: string | null;
  mailboxStatus: string;
  isDefault: boolean;
  isActive: boolean;
  isSystemManaged: boolean;
  isEditable: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
  lastTestError?: string | null;
};

const gmailPreset = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: '465',
  smtpSecure: true,
  imapHost: 'imap.gmail.com',
  imapPort: '993',
  imapSecure: true,
};

const outlookPreset = {
  smtpHost: 'smtp.office365.com',
  smtpPort: '587',
  smtpSecure: false,
  imapHost: 'outlook.office365.com',
  imapPort: '993',
  imapSecure: true,
};

const emptyForm = (tab: ProviderTab) => ({
  label: '',
  email: '',
  smtpHost: tab === 'GMAIL' ? gmailPreset.smtpHost : tab === 'OUTLOOK' ? outlookPreset.smtpHost : '',
  smtpPort: tab === 'GMAIL' ? gmailPreset.smtpPort : tab === 'OUTLOOK' ? outlookPreset.smtpPort : '465',
  smtpSecure: tab === 'GMAIL' ? gmailPreset.smtpSecure : tab === 'OUTLOOK' ? outlookPreset.smtpSecure : true,
  smtpUsername: '',
  smtpPassword: '',
  imapHost: tab === 'GMAIL' ? gmailPreset.imapHost : tab === 'OUTLOOK' ? outlookPreset.imapHost : '',
  imapPort: tab === 'GMAIL' ? gmailPreset.imapPort : tab === 'OUTLOOK' ? outlookPreset.imapPort : '993',
  imapSecure: tab === 'GMAIL' ? gmailPreset.imapSecure : tab === 'OUTLOOK' ? outlookPreset.imapSecure : true,
  imapUsername: '',
  imapPassword: '',
  isDefault: false,
  isActive: true,
});

export default function EmailAccountsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<ProviderTab>('GMAIL');
  const [editing, setEditing] = useState<EmailAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm('GMAIL'));

  const { data, isLoading } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: emailAccountsApi.list,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const accounts = (data as EmailAccount[] | undefined) || [];
  const systemAccount = accounts.find((account) => account.type === 'SYSTEM') || null;
  const personalAccounts = accounts.filter((account) => account.type === 'CUSTOM');

  const groupedAccounts = useMemo(
    () => personalAccounts.sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    [personalAccounts],
  );

  const openAddModal = (nextTab: ProviderTab) => {
    setEditing(null);
    setTab(nextTab);
    setForm(emptyForm(nextTab));
    setMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (account: EmailAccount) => {
    const nextTab = account.provider === 'OUTLOOK' ? 'OUTLOOK' : account.provider === 'GMAIL' ? 'GMAIL' : 'CUSTOM';
    setEditing(account);
    setTab(nextTab);
    setForm({
      label: account.label || '',
      email: account.email,
      smtpHost: account.smtpHost,
      smtpPort: String(account.smtpPort),
      smtpSecure: account.smtpSecure,
      smtpUsername: account.smtpUsername,
      smtpPassword: '',
      imapHost: account.imapHost || '',
      imapPort: account.imapPort ? String(account.imapPort) : '',
      imapSecure: account.imapSecure,
      imapUsername: account.imapUsername || '',
      imapPassword: '',
      isDefault: account.isDefault,
      isActive: account.isActive,
    });
    setMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm('GMAIL'));
  };

  const persistAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      label: form.label,
      email: form.email,
      smtpHost: form.smtpHost,
      smtpPort: Number(form.smtpPort),
      smtpSecure: form.smtpSecure,
      smtpUsername: form.smtpUsername || form.email,
      smtpPassword: form.smtpPassword,
      imapHost: form.imapHost || null,
      imapPort: form.imapPort ? Number(form.imapPort) : null,
      imapSecure: form.imapSecure,
      imapUsername: form.imapUsername || form.smtpUsername || form.email,
      imapPassword: form.imapPassword || form.smtpPassword,
      provider: tab,
      isDefault: form.isDefault,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await emailAccountsApi.update(editing.id, payload);
      } else if (tab === 'GMAIL') {
        await emailAccountsApi.createGmail(payload);
      } else {
        await emailAccountsApi.createCustom(payload);
      }

      await qc.invalidateQueries({ queryKey: ['email-accounts'] });
      closeModal();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Unable to save email account.');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (accountId: string, action: () => Promise<unknown>, successText?: string) => {
    setActionId(accountId);
    setMessage(null);
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ['email-accounts'] });
      if (successText) setMessage(successText);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Email account action failed.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Mail className="h-6 w-6 text-sky-600" />
            Email Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose the mailbox used for outreach and manage your personal SMTP accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openAddModal('GMAIL')}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Add Gmail
          </button>
          <button
            onClick={() => openAddModal('CUSTOM')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Server className="h-4 w-4" />
            Add SMTP
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
          <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-900">System Mailbox</h2>
            </div>

            {systemAccount ? (
              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-start">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-sm font-semibold text-slate-900">{systemAccount.email}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    SMTP: {systemAccount.smtpHost}:{systemAccount.smtpPort}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    IMAP: {systemAccount.imapHost}:{systemAccount.imapPort}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge text={systemAccount.mailboxStatus} tone="slate" />
                  <Badge text={systemAccount.provider} tone="sky" />
                  <Badge text="Default" tone="amber" />
                </div>
                <button
                  onClick={() =>
                    runAction(systemAccount.id, () => emailAccountsApi.setDefault(systemAccount.id), 'System mailbox set for sending.')
                  }
                  disabled={actionId === systemAccount.id || !systemAccount.isActive}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {actionId === systemAccount.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                  Use for sending
                </button>
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Your system mailbox will appear here after provisioning completes.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Personal Email Accounts</h2>
                <p className="mt-1 text-sm text-slate-500">Manage Gmail, Outlook, and custom SMTP accounts.</p>
              </div>
              <button
                onClick={() => openAddModal('OUTLOOK')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add Outlook
              </button>
            </div>

            <div className="space-y-3">
              {groupedAccounts.length === 0 && (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">No personal email accounts connected yet.</p>
              )}

              {groupedAccounts.map((account) => (
                <div key={account.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{account.label || account.email}</p>
                        <Badge text={account.provider} tone="sky" />
                        <Badge text={account.mailboxStatus} tone="slate" />
                        {account.isDefault && <Badge text="Default" tone="amber" />}
                        {!account.isActive && <Badge text="Inactive" tone="rose" />}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{account.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        SMTP {account.smtpHost}:{account.smtpPort} • IMAP {account.imapHost || 'N/A'}:{account.imapPort || 'N/A'}
                      </p>
                      {account.lastTestedAt && (
                        <p className="mt-2 text-xs text-slate-500">
                          Last test: {new Date(account.lastTestedAt).toLocaleString()} {account.lastTestStatus ? `• ${account.lastTestStatus}` : ''}
                        </p>
                      )}
                      {account.lastTestError && <p className="mt-1 text-xs text-rose-600">{account.lastTestError}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        busy={actionId === `${account.id}:default`}
                        onClick={() =>
                          runAction(
                            `${account.id}:default`,
                            () => emailAccountsApi.setDefault(account.id),
                            `${account.label || account.email} is now the default sender.`,
                          )
                        }
                        label={account.isDefault ? 'Sending account' : 'Use for sending'}
                        icon={account.isDefault ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Star className="h-4 w-4" />}
                      />
                      <ActionButton
                        busy={actionId === `${account.id}:test`}
                        onClick={() =>
                          runAction(
                            `${account.id}:test`,
                            async () => {
                              const result = await emailAccountsApi.testConnection(account.id);
                              setMessage(result.success ? 'Connection test passed.' : result.error || 'Connection test failed.');
                            },
                          )
                        }
                        label="Test connection"
                      />
                      <ActionButton onClick={() => openEditModal(account)} label="Edit" icon={<Pencil className="h-4 w-4" />} />
                      <ActionButton
                        busy={actionId === `${account.id}:delete`}
                        onClick={() =>
                          runAction(
                            `${account.id}:delete`,
                            () => emailAccountsApi.delete(account.id),
                            `${account.label || account.email} removed.`,
                          )
                        }
                        label="Delete"
                        icon={<Trash2 className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {editing ? 'Edit Email Account' : 'Add Email Account'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Choose a provider and save the mailbox you want to send from.</p>
              </div>
              <button onClick={closeModal} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200">
                Close
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {(['GMAIL', 'OUTLOOK', 'CUSTOM'] as ProviderTab[]).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    if (editing) return;
                    setTab(option);
                    setForm(emptyForm(option));
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === option ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  } ${editing ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  {option === 'CUSTOM' ? 'Custom SMTP' : option}
                </button>
              ))}
            </div>

            {tab === 'GMAIL' && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                To use Gmail SMTP, enable 2-Step Verification in Google Account and create an App Password. Use that App Password here, not your normal Gmail password.
                <p className="mt-2 text-xs text-amber-800">
                  Gmail preset: SMTP `smtp.gmail.com:465 (SSL)` and IMAP `imap.gmail.com:993 (SSL)`.
                </p>
              </div>
            )}

            <form onSubmit={persistAccount} className="grid gap-4 sm:grid-cols-2">
              <Field label="Account label">
                <input
                  required
                  value={form.label}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Research Gmail"
                />
              </Field>

              <Field label={tab === 'GMAIL' ? 'Gmail address' : 'Email address'}>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                      smtpUsername: tab !== 'CUSTOM' ? event.target.value : prev.smtpUsername,
                      imapUsername: tab !== 'CUSTOM' ? event.target.value : prev.imapUsername,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="you@gmail.com"
                />
              </Field>

              <Field label={tab === 'GMAIL' ? 'App password' : 'SMTP password'}>
                <input
                  required={!editing}
                  type="password"
                  value={form.smtpPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, smtpPassword: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder={editing ? 'Leave blank to keep current password' : 'Enter password'}
                />
              </Field>

              <Field label="Active">
                <label className="flex h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  Enable this account for sending
                </label>
              </Field>

              {tab === 'CUSTOM' && (
                <>
                  <Field label="SMTP host">
                    <input
                      required
                      value={form.smtpHost}
                      onChange={(event) => setForm((prev) => ({ ...prev, smtpHost: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="SMTP port">
                    <input
                      required
                      value={form.smtpPort}
                      onChange={(event) => setForm((prev) => ({ ...prev, smtpPort: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="SMTP username">
                    <input
                      required
                      value={form.smtpUsername}
                      onChange={(event) => setForm((prev) => ({ ...prev, smtpUsername: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="SMTP secure">
                    <label className="flex h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.smtpSecure}
                        onChange={(event) => setForm((prev) => ({ ...prev, smtpSecure: event.target.checked }))}
                      />
                      Use SSL/TLS
                    </label>
                  </Field>
                  <Field label="IMAP host">
                    <input
                      value={form.imapHost}
                      onChange={(event) => setForm((prev) => ({ ...prev, imapHost: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="IMAP port">
                    <input
                      value={form.imapPort}
                      onChange={(event) => setForm((prev) => ({ ...prev, imapPort: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="IMAP username">
                    <input
                      value={form.imapUsername}
                      onChange={(event) => setForm((prev) => ({ ...prev, imapUsername: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="IMAP password">
                    <input
                      type="password"
                      value={form.imapPassword}
                      onChange={(event) => setForm((prev) => ({ ...prev, imapPassword: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder={editing ? 'Leave blank to mirror current SMTP password' : 'Optional'}
                    />
                  </Field>
                  <Field label="IMAP secure">
                    <label className="flex h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.imapSecure}
                        onChange={(event) => setForm((prev) => ({ ...prev, imapSecure: event.target.checked }))}
                      />
                      Use SSL/TLS
                    </label>
                  </Field>
                </>
              )}

              {tab !== 'CUSTOM' && (
                <>
                  <Field label="SMTP host">
                    <input readOnly value={form.smtpHost} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </Field>
                  <Field label="SMTP port">
                    <input readOnly value={form.smtpPort} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </Field>
                  <Field label="IMAP host">
                    <input readOnly value={form.imapHost} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </Field>
                  <Field label="IMAP port">
                    <input readOnly value={form.imapPort} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </Field>
                </>
              )}

              <Field label="Default sender" className="sm:col-span-2">
                <label className="flex h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(event) => setForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
                  />
                  Use this account for new sends
                </label>
              </Field>

              <div className="flex gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ text, tone }: { text: string; tone: 'sky' | 'amber' | 'slate' | 'rose' }) {
  const classes = {
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[tone]}`}>{text}</span>;
}

function ActionButton({
  onClick,
  label,
  icon,
  busy,
}: {
  onClick: () => void;
  label: string;
  icon?: ReactNode;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
