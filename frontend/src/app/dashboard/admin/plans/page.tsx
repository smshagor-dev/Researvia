'use client';

import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle2, Loader2, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { useAdminBillingPlans, useCreateAdminPlan, useUpdateAdminPlan } from '@/lib/hooks';

type PlanForm = {
  name: string;
  slug: string;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  priceMonthly: number;
  priceYearly: number;
  creditsPerMonth: number;
  emailSendsPerDay: number;
  professorRevealsPerMonth: number;
  aiGenerationsPerMonth: number;
  opportunityUnlocksPerMonth: number;
  scholarshipUnlocksPerMonth: number;
  maxSavedProfessors: number;
  maxSavedScholarships: number;
  maxSmtpAccounts: number;
  maxOauthAccounts: number;
  hasInboxSync: boolean;
  hasAiMatchScore: boolean;
  hasBulkEmail: boolean;
  hasAnalytics: boolean;
  hasTeamAccess: boolean;
  isActive: boolean;
  sortOrder: number;
};

const DEFAULT_FORM: PlanForm = {
  name: '',
  slug: '',
  stripePriceIdMonthly: '',
  stripePriceIdYearly: '',
  priceMonthly: 0,
  priceYearly: 0,
  creditsPerMonth: 0,
  emailSendsPerDay: 0,
  professorRevealsPerMonth: 0,
  aiGenerationsPerMonth: 0,
  opportunityUnlocksPerMonth: 0,
  scholarshipUnlocksPerMonth: 0,
  maxSavedProfessors: 0,
  maxSavedScholarships: 0,
  maxSmtpAccounts: 0,
  maxOauthAccounts: 0,
  hasInboxSync: false,
  hasAiMatchScore: false,
  hasBulkEmail: false,
  hasAnalytics: false,
  hasTeamAccess: false,
  isActive: true,
  sortOrder: 0,
};

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400';

export default function AdminPlansPage() {
  const plansQuery = useAdminBillingPlans();
  const createPlan = useCreateAdminPlan();
  const updatePlan = useUpdateAdminPlan();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(DEFAULT_FORM);
  const [error, setError] = useState('');

  const rows = ((plansQuery.data as any[]) || []);
  const saving = createPlan.isPending || updatePlan.isPending;

  useEffect(() => {
    if (!open) {
      setForm(DEFAULT_FORM);
      setEditingId(null);
      setError('');
    }
  }, [open]);

  const openCreate = () => {
    setForm({
      ...DEFAULT_FORM,
      sortOrder: rows.length,
    });
    setEditingId(null);
    setError('');
    setOpen(true);
  };

  const openEdit = (plan: any) => {
    setForm({
      name: plan.name || '',
      slug: plan.slug || '',
      stripePriceIdMonthly: plan.stripePriceIdMonthly || '',
      stripePriceIdYearly: plan.stripePriceIdYearly || '',
      priceMonthly: Number(plan.priceMonthly || 0),
      priceYearly: Number(plan.priceYearly || 0),
      creditsPerMonth: Number(plan.creditsPerMonth || 0),
      emailSendsPerDay: Number(plan.emailSendsPerDay || 0),
      professorRevealsPerMonth: Number(plan.professorRevealsPerMonth || 0),
      aiGenerationsPerMonth: Number(plan.aiGenerationsPerMonth || 0),
      opportunityUnlocksPerMonth: Number(plan.opportunityUnlocksPerMonth || 0),
      scholarshipUnlocksPerMonth: Number(plan.scholarshipUnlocksPerMonth || 0),
      maxSavedProfessors: Number(plan.maxSavedProfessors || 0),
      maxSavedScholarships: Number(plan.maxSavedScholarships || 0),
      maxSmtpAccounts: Number(plan.maxSmtpAccounts || 0),
      maxOauthAccounts: Number(plan.maxOauthAccounts || 0),
      hasInboxSync: Boolean(plan.hasInboxSync),
      hasAiMatchScore: Boolean(plan.hasAiMatchScore),
      hasBulkEmail: Boolean(plan.hasBulkEmail),
      hasAnalytics: Boolean(plan.hasAnalytics),
      hasTeamAccess: Boolean(plan.hasTeamAccess),
      isActive: Boolean(plan.isActive),
      sortOrder: Number(plan.sortOrder || 0),
    });
    setEditingId(plan.id);
    setError('');
    setOpen(true);
  };

  const submit = async () => {
    setError('');
    try {
      if (editingId) {
        await updatePlan.mutateAsync({ id: editingId, data: form });
      } else {
        await createPlan.mutateAsync(form);
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Plans</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Manage subscription plans end to end. Add a new plan from the popup, update existing limits, and keep pricing ready for future billing methods.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f97316,#ef4444)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-950/30"
        >
          <Plus className="h-4 w-4" />
          Add New Plan
        </button>
      </div>

      {plansQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-300" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((plan: any) => (
            <div key={plan.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${plan.isActive ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                      {plan.isActive ? 'active' : 'inactive'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{plan.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(plan)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Monthly" value={`$${Number(plan.priceMonthly).toFixed(2)}`} />
                <MetricCard label="Yearly" value={`$${Number(plan.priceYearly).toFixed(2)}`} />
                <MetricCard label="Credits / mo" value={String(plan.creditsPerMonth)} />
                <MetricCard label="Emails / day" value={String(plan.emailSendsPerDay)} />
                <MetricCard label="Professor reveals" value={String(plan.professorRevealsPerMonth)} />
                <MetricCard label="AI generations" value={String(plan.aiGenerationsPerMonth)} />
                <MetricCard label="Opportunity unlocks" value={String(plan.opportunityUnlocksPerMonth || 0)} />
                <MetricCard label="Scholarship unlocks" value={String(plan.scholarshipUnlocksPerMonth || 0)} />
              </div>

              <div className="mt-5 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                <FeatureFlag label="Inbox sync" enabled={plan.hasInboxSync} />
                <FeatureFlag label="AI match score" enabled={plan.hasAiMatchScore} />
                <FeatureFlag label="Bulk email" enabled={plan.hasBulkEmail} />
                <FeatureFlag label="Analytics" enabled={plan.hasAnalytics} />
                <FeatureFlag label="Team access" enabled={plan.hasTeamAccess} />
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400">
                <p>Stripe monthly: {plan.stripePriceIdMonthly || 'Not set'}</p>
                <p className="mt-1">Stripe yearly: {plan.stripePriceIdYearly || 'Not set'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#081120] p-6 text-slate-100 shadow-2xl shadow-black/50">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{editingId ? 'Edit Plan' : 'Create New Plan'}</h2>
                <p className="mt-1 text-sm text-slate-400">This popup updates the live subscription plan catalog used by billing, quotas, and unlock rules.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-orange-300" />
                  Basics
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Plan name">
                    <input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} className={INPUT_CLASS} />
                  </Field>
                  <Field label="Slug">
                    <input value={form.slug} onChange={(e) => setForm((v) => ({ ...v, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} className={INPUT_CLASS} />
                  </Field>
                  <Field label="Monthly price">
                    <input type="number" value={form.priceMonthly} onChange={(e) => setNumber(setForm, 'priceMonthly', e.target.value)} className={INPUT_CLASS} />
                  </Field>
                  <Field label="Yearly price">
                    <input type="number" value={form.priceYearly} onChange={(e) => setNumber(setForm, 'priceYearly', e.target.value)} className={INPUT_CLASS} />
                  </Field>
                  <Field label="Sort order">
                    <input type="number" value={form.sortOrder} onChange={(e) => setNumber(setForm, 'sortOrder', e.target.value)} className={INPUT_CLASS} />
                  </Field>
                  <ToggleField
                    label="Plan active"
                    checked={form.isActive}
                    onChange={(checked) => setForm((v) => ({ ...v, isActive: checked }))}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-white">Stripe</h3>
                <div className="mt-4 grid gap-4">
                  <Field label="Stripe monthly price ID">
                    <input value={form.stripePriceIdMonthly} onChange={(e) => setForm((v) => ({ ...v, stripePriceIdMonthly: e.target.value }))} className={INPUT_CLASS} />
                  </Field>
                  <Field label="Stripe yearly price ID">
                    <input value={form.stripePriceIdYearly} onChange={(e) => setForm((v) => ({ ...v, stripePriceIdYearly: e.target.value }))} className={INPUT_CLASS} />
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
                <h3 className="text-lg font-semibold text-white">Usage Limits</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <NumberField label="Credits / month" value={form.creditsPerMonth} onChange={(value) => setNumber(setForm, 'creditsPerMonth', value)} />
                  <NumberField label="Emails / day" value={form.emailSendsPerDay} onChange={(value) => setNumber(setForm, 'emailSendsPerDay', value)} />
                  <NumberField label="Professor reveals / month" value={form.professorRevealsPerMonth} onChange={(value) => setNumber(setForm, 'professorRevealsPerMonth', value)} />
                  <NumberField label="AI generations / month" value={form.aiGenerationsPerMonth} onChange={(value) => setNumber(setForm, 'aiGenerationsPerMonth', value)} />
                  <NumberField label="Opportunity unlocks / month" value={form.opportunityUnlocksPerMonth} onChange={(value) => setNumber(setForm, 'opportunityUnlocksPerMonth', value)} />
                  <NumberField label="Scholarship unlocks / month" value={form.scholarshipUnlocksPerMonth} onChange={(value) => setNumber(setForm, 'scholarshipUnlocksPerMonth', value)} />
                  <NumberField label="Saved professors" value={form.maxSavedProfessors} onChange={(value) => setNumber(setForm, 'maxSavedProfessors', value)} />
                  <NumberField label="Saved scholarships" value={form.maxSavedScholarships} onChange={(value) => setNumber(setForm, 'maxSavedScholarships', value)} />
                  <NumberField label="SMTP accounts" value={form.maxSmtpAccounts} onChange={(value) => setNumber(setForm, 'maxSmtpAccounts', value)} />
                  <NumberField label="OAuth accounts" value={form.maxOauthAccounts} onChange={(value) => setNumber(setForm, 'maxOauthAccounts', value)} />
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
                <h3 className="text-lg font-semibold text-white">Feature Access</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ToggleField label="Inbox sync" checked={form.hasInboxSync} onChange={(checked) => setForm((v) => ({ ...v, hasInboxSync: checked }))} />
                  <ToggleField label="AI match score" checked={form.hasAiMatchScore} onChange={(checked) => setForm((v) => ({ ...v, hasAiMatchScore: checked }))} />
                  <ToggleField label="Bulk email" checked={form.hasBulkEmail} onChange={(checked) => setForm((v) => ({ ...v, hasBulkEmail: checked }))} />
                  <ToggleField label="Analytics" checked={form.hasAnalytics} onChange={(checked) => setForm((v) => ({ ...v, hasAnalytics: checked }))} />
                  <ToggleField label="Team access" checked={form.hasTeamAccess} onChange={(checked) => setForm((v) => ({ ...v, hasTeamAccess: checked }))} />
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-rose-300">{error}</div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f97316,#ef4444)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingId ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function FeatureFlag({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className={`h-4 w-4 ${enabled ? 'text-emerald-400' : 'text-slate-600'}`} />
      <span>{label}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
    </Field>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
        checked ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-900 text-slate-300'
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${checked ? 'bg-emerald-500/20 text-emerald-100' : 'bg-slate-800 text-slate-400'}`}>
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  );
}

function setNumber(setter: Dispatch<SetStateAction<PlanForm>>, key: keyof PlanForm, value: string) {
  setter((current) => ({
    ...current,
    [key]: value === '' ? 0 : Number(value),
  }));
}
