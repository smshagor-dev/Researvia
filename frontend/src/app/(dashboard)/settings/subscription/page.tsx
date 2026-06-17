'use client';

import { useState } from 'react';
import { Check, CreditCard, Loader2, Receipt, Sparkles } from 'lucide-react';
import { useBilling, useBillingCheckout, useBillingPortal } from '@/lib/hooks';
import { billingApi } from '@/lib/api';
import { cn, formatCredits, formatDate } from '@/lib/utils';

type BillingCycle = 'monthly' | 'yearly';

export default function SubscriptionPage() {
  const { data, isLoading, refetch } = useBilling();
  const checkout = useBillingCheckout();
  const portal = useBillingPortal();
  const [interval, setInterval] = useState<BillingCycle>('monthly');
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const billing = data as any;
  const plans = (billing?.plans || []) as any[];
  const metrics = (billing?.usage?.metrics || []) as any[];
  const promotions = (billing?.promotions || []) as any[];
  const currentPlanSlug = billing?.subscription?.plan?.slug || 'free';
  const currentPlan = plans.find((plan) => plan.slug === currentPlanSlug) || billing?.subscription?.plan || null;

  const handleCheckout = async (planSlug: string) => {
    if (planSlug === currentPlanSlug || planSlug === 'free') {
      return;
    }

    setPendingPlan(planSlug);
    try {
      const result = await checkout.mutateAsync({ planSlug, interval, couponCode: couponCode || undefined });
      if ((result as any)?.checkoutUrl) {
        window.location.href = (result as any).checkoutUrl;
      }
    } finally {
      setPendingPlan(null);
    }
  };

  const handlePortal = async () => {
    const result = await portal.mutateAsync();
    if ((result as any)?.url) {
      window.location.href = (result as any).url;
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await billingApi.cancel();
      await refetch();
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500 dark:text-cyan-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-6 py-6 xl:px-8">
      <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,_#f8fafc,_#e2e8f0_45%,_#dbeafe)] p-6 text-slate-950 shadow-xl shadow-slate-200/80 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,_#0f172a,_#111827_45%,_#172554)] dark:text-white dark:shadow-2xl dark:shadow-slate-950/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-700/80 dark:text-cyan-200/80">Billing Control</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold">
              <Sparkles className="h-7 w-7 text-cyan-600 dark:text-cyan-300" />
              {currentPlan?.name || 'Free'} plan
            </h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              Credits: {formatCredits(billing?.credits?.balance || 0)}. Next renewal {billing?.subscription?.currentPeriodEnd ? formatDate(billing.subscription.currentPeriodEnd) : 'not scheduled'}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePortal}
              className="rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium text-slate-900 backdrop-blur transition hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Billing portal
            </button>
            {currentPlanSlug !== 'free' ? (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="rounded-full border border-rose-300/70 bg-rose-100/90 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:opacity-60 dark:border-rose-300/30 dark:bg-rose-400/10 dark:text-rose-100 dark:hover:bg-rose-400/15"
              >
                {isCancelling ? 'Cancelling...' : billing?.subscription?.cancelAtPeriodEnd ? 'Cancellation scheduled' : 'Cancel at period end'}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Current Plan" value={currentPlan?.name || 'Free'} />
        <SummaryCard label="Credits" value={formatCredits(billing?.credits?.balance || 0)} />
        <SummaryCard label="Invoices" value={String((billing?.invoices || []).length)} />
        <SummaryCard label="Usage Metrics" value={String(metrics.length)} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Promo codes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Verify a promo before checkout or load one from the active campaign list.</p>
          </div>
          {promoMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{promoMessage}</p> : null}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="ENTER-CODE"
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              onClick={async () => {
                setPromoMessage(null);
                try {
                  const result = await billingApi.applyCoupon(couponCode, currentPlanSlug);
                  setPromoMessage(result?.valid ? `${result.coupon?.code} is ready to use.` : result?.message || 'Promo could not be applied.');
                } catch (error: any) {
                  setPromoMessage(error?.response?.data?.message || 'Promo could not be applied.');
                }
              }}
              disabled={!couponCode.trim()}
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              Verify
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {promotions.slice(0, 4).map((promo: any) => (
              <button
                key={promo.id}
                onClick={() => {
                  setCouponCode(promo.code);
                  setPromoMessage(`${promo.code} loaded for your next checkout.`);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/10"
              >
                <p className="font-semibold text-slate-900 dark:text-slate-100">{promo.code}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {promo.discountType === 'percentage' ? `${promo.discountValue}% off` : `$${promo.discountValue} off`}
                  {promo.expiresAt ? ` - ends ${formatDate(promo.expiresAt)}` : ''}
                </p>
              </button>
            ))}
            {!promotions.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No active promos are available right now.</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Available plans</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Plans load dynamically from billing configuration.</p>
          </div>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950/80">
            {(['monthly', 'yearly'] as BillingCycle[]).map((value) => (
              <button
                key={value}
                onClick={() => setInterval(value)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition',
                  interval === value ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950' : 'text-slate-500 dark:text-slate-400',
                )}
              >
                {value === 'monthly' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan: any) => {
            const isCurrent = plan.slug === currentPlanSlug;
            const monthlyPrice = interval === 'yearly' ? Number(plan.priceYearly || 0) / 12 : Number(plan.priceMonthly || 0);
            const fullPrice = interval === 'yearly' ? Number(plan.priceYearly || 0) : Number(plan.priceMonthly || 0);

            return (
              <article
                key={plan.id}
                className={cn(
                  'rounded-[24px] border p-5 transition',
                  isCurrent
                    ? 'border-cyan-400 bg-cyan-50/60 shadow-lg shadow-cyan-100 dark:bg-cyan-500/10 dark:shadow-cyan-950/30'
                    : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/70',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{plan.slug}</p>
                  </div>
                  {isCurrent ? <span className="rounded-full bg-cyan-500 px-2.5 py-1 text-xs font-semibold text-white">Current</span> : null}
                </div>

                <div className="mt-4">
                  <p className="text-3xl font-semibold text-slate-950 dark:text-slate-50">${monthlyPrice.toFixed(2)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    / month
                    {interval === 'yearly' ? ` - billed $${fullPrice.toFixed(2)} yearly` : ''}
                  </p>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {renderFeature(`${plan.creditsPerMonth} credits / month`)}
                  {renderFeature(labelLimit(plan.professorRevealsPerMonth, 'professor reveals'))}
                  {renderFeature(labelLimit(plan.aiGenerationsPerMonth, 'AI generations'))}
                  {renderFeature(labelLimit(plan.emailSendsPerDay, 'emails / day'))}
                  {renderFeature(labelLimit(plan.scholarshipUnlocksPerMonth, 'scholarship unlocks'))}
                  {renderFeature(labelLimit(plan.opportunityUnlocksPerMonth, 'opportunity unlocks'))}
                </div>

                <button
                  onClick={() => handleCheckout(plan.slug)}
                  disabled={isCurrent || pendingPlan === plan.slug || plan.slug === 'free'}
                  className={cn(
                    'mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition',
                    isCurrent || plan.slug === 'free'
                      ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400',
                  )}
                >
                  {pendingPlan === plan.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isCurrent ? 'Current plan' : `Choose ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Usage and limits</h2>
          </div>
          <div className="mt-4 space-y-3">
            {metrics.map((metric: any) => (
              <div key={metric.metricType} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{metric.metricType.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {metric.currentCount}
                    {metric.limit === null ? '' : ` / ${metric.limit}`}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {metric.remaining === null ? 'Unlimited on this plan' : `${metric.remaining} remaining this period`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent invoices</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(billing?.invoices || []).slice(0, 8).map((invoice: any) => (
              <div key={invoice.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{invoice.invoiceNumber || invoice.stripeInvoiceId || 'Invoice'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{invoice.billedAt ? formatDate(invoice.billedAt) : 'Pending date'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">${Number(invoice.amountPaid || invoice.totalAmount || 0).toFixed(2)}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{invoice.status}</p>
                  </div>
                </div>
              </div>
            ))}
            {!(billing?.invoices || []).length ? <p className="text-sm text-slate-500 dark:text-slate-400">No invoices available yet.</p> : null}
          </div>
        </section>
      </div>

      {currentPlan ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Current plan limits</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <LimitCard label="Professor reveals" value={labelLimit(currentPlan.professorRevealsPerMonth, 'per month')} />
            <LimitCard label="AI generations" value={labelLimit(currentPlan.aiGenerationsPerMonth, 'per month')} />
            <LimitCard label="Email sends" value={labelLimit(currentPlan.emailSendsPerDay, 'per day')} />
            <LimitCard label="Scholarship unlocks" value={labelLimit(currentPlan.scholarshipUnlocksPerMonth, 'per month')} />
            <LimitCard label="Opportunity unlocks" value={labelLimit(currentPlan.opportunityUnlocksPerMonth, 'per month')} />
            <LimitCard label="Credits balance" value={formatCredits(billing?.credits?.balance || 0)} />
          </div>
          {metrics.length ? (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Tracking {metrics.length} metered actions across the current billing period.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">{value}</p>
    </div>
  );
}

function LimitCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function renderFeature(label: string) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
      <span>{label}</span>
    </div>
  );
}

function labelLimit(value: number, suffix: string) {
  if (value >= 9999) {
    return `Unlimited ${suffix}`;
  }
  return `${value} ${suffix}`;
}
