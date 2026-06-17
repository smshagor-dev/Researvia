'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, subscriptionsApi } from '@/lib/api';
import { ArrowRight, CheckCircle2, CreditCard, Database, Loader2, RotateCcw, Save, Settings2 } from 'lucide-react';

type SettingFieldType = 'string' | 'boolean' | 'array';

type SystemSettingRow = {
  key: string;
  value: unknown;
  description: string | null;
  source: 'database' | 'default';
  updatedAt: string | null;
};

type PlanSummary = {
  id: string;
  slug: string;
  name: string;
};

type SettingField = {
  key: string;
  label: string;
  type: SettingFieldType;
  placeholder?: string;
  description: string;
};

type SettingCategory = {
  id: string;
  label: string;
  description: string;
  section: string;
  fields: SettingField[];
};

const EMPTY_STATUS = { type: '', message: '' };

export default function AdminSystemSettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <AdminSystemSettingsContent />
    </Suspense>
  );
}

function AdminSystemSettingsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: string; message: string }>(EMPTY_STATUS);

  const settingsQuery = useQuery<SystemSettingRow[]>({
    queryKey: ['admin-system-settings'],
    queryFn: () => adminApi.getSystemSettings(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const plansQuery = useQuery<PlanSummary[]>({
    queryKey: ['subscription-plans-admin-settings'],
    queryFn: async () => {
      const rows = await subscriptionsApi.getPlans();
      return ((rows as any[]) || []).map((plan) => ({
        id: String(plan.id),
        slug: String(plan.slug),
        name: String(plan.name),
      }));
    },
    staleTime: 60_000,
  });

  const categories = useMemo(
    () => buildSettingCategories(plansQuery.data || []),
    [plansQuery.data],
  );

  const fallbackCategoryId = categories[0]?.id || 'payment-stripe';
  const requestedCategoryId = searchParams.get('group');
  const activeCategoryId =
    requestedCategoryId && categories.some((category) => category.id === requestedCategoryId)
      ? requestedCategoryId
      : fallbackCategoryId;
  const activeCategory = categories.find((category) => category.id === activeCategoryId) || categories[0];

  const settingsMap = useMemo(() => {
    const entries = (settingsQuery.data || []).map((item) => [item.key, item] as const);
    return new Map<string, SystemSettingRow>(entries);
  }, [settingsQuery.data]);

  const fieldValue = (field: SettingField) => {
    const raw = draft[field.key];
    if (raw !== undefined) {
      return raw;
    }
    return formatValue(settingsMap.get(field.key)?.value, field.type);
  };

  const saveCategory = async () => {
    if (!activeCategory) return;
    setSaving(true);
    setStatus(EMPTY_STATUS);
    try {
      const items = activeCategory.fields.map((field) => ({
        key: field.key,
        value: parseValue(fieldValue(field), field.type),
        description: field.description,
      }));
      await adminApi.updateSystemSettings(items);
      setDraft((current) => {
        const next = { ...current };
        for (const field of activeCategory.fields) {
          delete next[field.key];
        }
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      setStatus({ type: 'success', message: `${activeCategory.label} settings updated.` });
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const resetSetting = async (key: string) => {
    setResettingKey(key);
    setStatus(EMPTY_STATUS);
    try {
      await adminApi.deleteSystemSetting(key);
      setDraft((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      setStatus({ type: 'success', message: `${key} reset to default.` });
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to reset setting.' });
    } finally {
      setResettingKey(null);
    }
  };

  const visibleRows = (settingsQuery.data || []).filter((row) => activeCategory?.fields.some((field) => field.key === row.key));

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Settings2 className="h-6 w-6 text-sky-300" />
            System Settings
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Production runtime config is grouped by operational area. Payment methods are organized separately and are activated only through server-side secrets, never by a dashboard toggle.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          <p className="font-semibold text-white">Resolved from database + defaults</p>
          <p className="mt-1 text-xs text-slate-500">Deleting a key falls back to the built-in default when one exists.</p>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <div className="mb-5 flex items-center gap-2 text-white">
          <CreditCard className="h-5 w-5 text-emerald-300" />
          <h2 className="text-lg font-semibold">Payment Method Setup</h2>
        </div>
        <div className="mb-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-100">Production activation model</p>
          <p className="mt-1 text-sm text-emerald-200/80">
            Stripe becomes active only when both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are present. NOWPayments becomes active only when both `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET` are present.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categories
            .filter((category) => category.section === 'payment_methods')
            .map((category) => {
              const isActive = category.id === activeCategoryId;
              return (
                <Link
                  key={category.id}
                  href={`/dashboard/admin/settings?group=${category.id}`}
                  className={`rounded-2xl border p-4 transition ${
                    isActive
                      ? 'border-emerald-400/40 bg-emerald-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{category.label}</p>
                      <p className="mt-1 text-sm text-slate-400">{category.description}</p>
                    </div>
                    <ArrowRight className={`h-4 w-4 ${isActive ? 'text-emerald-200' : 'text-slate-500'}`} />
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">{category.fields.length} settings</p>
                </Link>
              );
            })}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Setting Group</span>
              <select
                value={activeCategoryId}
                onChange={(event) => {
                  setStatus(EMPTY_STATUS);
                  window.location.href = `/dashboard/admin/settings?group=${event.target.value}`;
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-sky-400"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.section === 'payment_methods' ? `Payment Methods / ${category.label}` : category.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <p className="text-sm font-semibold text-sky-100">{activeCategory?.label}</p>
              <p className="mt-1 text-sm text-sky-200/80">{activeCategory?.description}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {settingsQuery.isLoading || plansQuery.isLoading || !activeCategory ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeCategory.fields.map((field) => {
                    const row = settingsMap.get(field.key);
                    const isBoolean = field.type === 'boolean';
                    return (
                      <div key={field.key} className={isBoolean ? 'md:col-span-2' : ''}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{field.label}</p>
                            <p className="text-xs text-slate-500">{field.key}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            row?.source === 'database' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {row?.source || 'default'}
                          </span>
                        </div>

                        {isBoolean ? (
                          <select
                            value={fieldValue(field)}
                            onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                          >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                          </select>
                        ) : field.type === 'array' ? (
                          <textarea
                            rows={4}
                            value={fieldValue(field)}
                            placeholder={field.placeholder}
                            onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400"
                          />
                        ) : (
                          <input
                            value={fieldValue(field)}
                            placeholder={field.placeholder}
                            onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400"
                          />
                        )}

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">{field.description}</p>
                          <button
                            type="button"
                            onClick={() => resetSetting(field.key)}
                            disabled={resettingKey === field.key}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-60"
                          >
                            {resettingKey === field.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            Reset
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={saveCategory}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0ea5e9,#2563eb)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/30 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save {activeCategory.label}
                  </button>
                  {status.message ? (
                    <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                      status.type === 'success' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'
                    }`}>
                      {status.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                      {status.message}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Resolved Keys</h2>
            <p className="mt-1 text-sm text-slate-500">Current values for the selected group, including database overrides and defaults.</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
            {activeCategory?.fields.length || 0} configured names
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm text-slate-200">
            <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Key</th>
                <th className="px-3 py-3">Value</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {activeCategory?.fields.map((field) => {
                const row = visibleRows.find((item) => item.key === field.key);
                return (
                  <tr key={field.key} className="border-b border-white/5 align-top">
                    <td className="px-3 py-3 font-mono text-xs text-sky-200">{field.key}</td>
                    <td className="px-3 py-3 text-slate-300">{stringifyValue(row?.value)}</td>
                    <td className="px-3 py-3">{row?.source || 'default'}</td>
                    <td className="px-3 py-3 text-slate-500">{row?.updatedAt ? new Date(row.updatedAt).toLocaleString() : 'Default only'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SettingsPageFallback() {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-[1680px] items-center justify-center px-6 py-6 xl:px-8">
      <Loader2 className="h-8 w-8 animate-spin text-sky-300" />
    </div>
  );
}

function buildSettingCategories(plans: PlanSummary[]): SettingCategory[] {
  const stripePlanFields = plans.flatMap((plan) => [
    {
      key: `billing.stripe.price_ids.${plan.slug}.monthly`,
      label: `${plan.name} monthly price ID`,
      type: 'string' as const,
      placeholder: 'price_xxx',
      description: `Stripe monthly price ID used for the ${plan.name} plan.`,
    },
    {
      key: `billing.stripe.price_ids.${plan.slug}.yearly`,
      label: `${plan.name} yearly price ID`,
      type: 'string' as const,
      placeholder: 'price_xxx',
      description: `Stripe yearly price ID used for the ${plan.name} plan.`,
    },
  ]);

  return [
    {
      id: 'payment-stripe',
      label: 'Stripe',
      section: 'payment_methods',
      description: 'Production Stripe checkout mapping. Activation is controlled by env secrets on the server.',
      fields: stripePlanFields.length
        ? stripePlanFields
        : [
            {
              key: 'billing.stripe.price_ids.pro.monthly',
              label: 'Pro monthly price ID',
              type: 'string',
              placeholder: 'price_xxx',
              description: 'Stripe monthly price ID for the Pro plan. Stripe is active only when secret and webhook keys are configured in server env.',
            },
            {
              key: 'billing.stripe.price_ids.pro.yearly',
              label: 'Pro yearly price ID',
              type: 'string',
              placeholder: 'price_xxx',
              description: 'Stripe yearly price ID for the Pro plan. Stripe is active only when secret and webhook keys are configured in server env.',
            },
          ],
    },
    {
      id: 'payment-nowpayments',
      label: 'NOWPayments',
      section: 'payment_methods',
      description: 'Production crypto payment configuration. Activation is controlled by env secrets on the server.',
      fields: [
        {
          key: 'billing.nowpayments.api_url',
          label: 'API URL',
          type: 'string',
          placeholder: 'https://api.nowpayments.io/v1',
          description: 'Base URL for NOWPayments API calls. Live activation still requires NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET in server env.',
        },
        {
          key: 'billing.nowpayments.supported_currencies',
          label: 'Supported currencies',
          type: 'array',
          placeholder: 'btc, eth, usdttrc20',
          description: 'Comma-separated crypto currency codes shown to users in production checkout.',
        },
        {
          key: 'billing.nowpayments.success_url',
          label: 'Success URL',
          type: 'string',
          placeholder: 'https://app.researvia.com/billing/success',
          description: 'Redirect URL after a successful crypto payment.',
        },
        {
          key: 'billing.nowpayments.cancel_url',
          label: 'Cancel URL',
          type: 'string',
          placeholder: 'https://app.researvia.com/billing/cancel',
          description: 'Redirect URL after the user cancels payment.',
        },
        {
          key: 'billing.nowpayments.ipn_callback_url',
          label: 'IPN callback URL',
          type: 'string',
          placeholder: 'https://api.researvia.com/v1/webhooks/nowpayments',
          description: 'Webhook endpoint NOWPayments posts transaction updates to. This should point to the production API domain.',
        },
      ],
    },
    {
      id: 'ai',
      label: 'AI',
      section: 'app',
      description: 'Model provider routing and default model selection.',
      fields: [
        { key: 'ai.provider', label: 'AI provider', type: 'string', placeholder: 'openai', description: 'Primary AI provider used for generation and scoring.' },
        { key: 'ai.anthropic.model', label: 'Anthropic model', type: 'string', placeholder: 'claude-3-5-sonnet-latest', description: 'Anthropic model name used when provider is set to Anthropic.' },
      ],
    },
    {
      id: 'email',
      label: 'Email',
      section: 'app',
      description: 'Delivery fallback and messaging behavior managed from the database.',
      fields: [
        { key: 'email.allow_fallback', label: 'Allow system mailbox fallback', type: 'boolean', description: 'If enabled, the system mailbox can be used when a personal mailbox is unavailable.' },
      ],
    },
    {
      id: 'discovery',
      label: 'Discovery',
      section: 'app',
      description: 'Research discovery and OpenAlex integration settings.',
      fields: [
        { key: 'discovery.openalex.base_url', label: 'OpenAlex base URL', type: 'string', placeholder: 'https://api.openalex.org', description: 'Base URL for OpenAlex discovery requests.' },
        { key: 'discovery.openalex.mailto', label: 'OpenAlex mailto', type: 'string', placeholder: 'ops@researvia.com', description: 'Contact email sent with OpenAlex requests for rate-limit hygiene.' },
      ],
    },
    {
      id: 'scholarships',
      label: 'Scholarships',
      section: 'app',
      description: 'Source endpoint management for scholarship imports.',
      fields: [
        { key: 'scholarships.sources.daad.endpoint', label: 'DAAD endpoint', type: 'string', placeholder: 'https://example.com/daad-feed', description: 'Custom endpoint for DAAD scholarship sync.' },
        { key: 'scholarships.sources.erasmus.endpoint', label: 'Erasmus endpoint', type: 'string', placeholder: 'https://example.com/erasmus-feed', description: 'Custom endpoint for Erasmus scholarship sync.' },
        { key: 'scholarships.sources.fulbright.endpoint', label: 'Fulbright endpoint', type: 'string', placeholder: 'https://example.com/fulbright-feed', description: 'Custom endpoint for Fulbright scholarship sync.' },
        { key: 'scholarships.sources.chevening.endpoint', label: 'Chevening endpoint', type: 'string', placeholder: 'https://example.com/chevening-feed', description: 'Custom endpoint for Chevening scholarship sync.' },
      ],
    },
    {
      id: 'platform',
      label: 'Platform URLs',
      section: 'app',
      description: 'Public URLs used by callbacks, storage, and generated links.',
      fields: [
        { key: 'app.public_backend_url', label: 'Public backend URL', type: 'string', placeholder: 'https://api.researvia.com', description: 'Externally reachable backend URL used in callbacks and generated links.' },
        { key: 'storage.public_base_url', label: 'Storage public base URL', type: 'string', placeholder: 'https://cdn.researvia.com', description: 'Public base URL used to build file and asset links.' },
      ],
    },
  ];
}

function formatValue(value: unknown, type: SettingFieldType) {
  if (type === 'boolean') {
    return value === true ? 'true' : 'false';
  }
  if (type === 'array') {
    return Array.isArray(value) ? value.map(String).join(', ') : typeof value === 'string' ? value : '';
  }
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function parseValue(value: string, type: SettingFieldType) {
  if (type === 'boolean') {
    return value === 'true';
  }
  if (type === 'array') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value.trim();
}

function stringifyValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value == null || value === '') {
    return 'Not set';
  }
  return String(value);
}
