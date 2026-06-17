'use client';

import { useState } from 'react';
import { CreditCard, Loader2, Receipt, Users } from 'lucide-react';
import { useApplyCoupon, useBilling, useBillingCheckout, useBillingPaymentMethods, useBillingPortal, useNowPaymentsCheckout } from '@/lib/hooks';
import { APPLICATION_STATUS_COLORS, cn, formatCredits, formatDate } from '@/lib/utils';

export default function BillingPage() {
  const { data, isLoading } = useBilling();
  const { data: paymentMethodsData } = useBillingPaymentMethods();
  const checkout = useBillingCheckout();
  const nowPaymentsCheckout = useNowPaymentsCheckout();
  const portal = useBillingPortal();
  const applyCoupon = useApplyCoupon();
  const [couponCode, setCouponCode] = useState('');
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [provider, setProvider] = useState<'stripe' | 'nowpayments'>('stripe');
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const billing = data as any;
  const plans = (billing?.plans || []) as any[];
  const currentPlanSlug = billing?.subscription?.plan?.slug || 'free';
  const promotions = (billing?.promotions || []) as any[];
  const paymentMethods = (paymentMethodsData as any)?.methods || [];
  const nowPaymentsMethod = paymentMethods.find((method: any) => method.provider === 'nowpayments');
  const nowPaymentsEnabled = Boolean(nowPaymentsMethod?.enabled);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-300" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6 px-6 py-6 xl:px-8">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-emerald-100 via-white to-blue-100 p-6 text-slate-950 shadow-sm dark:border-slate-800 dark:from-emerald-700 dark:via-slate-900 dark:to-blue-900 dark:text-white">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-100">Current plan, credits, usage, invoices, coupons, and team access all in one place.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Current Plan" value={billing?.subscription?.plan?.name || 'Free'} />
        <StatCard label="Credits Remaining" value={formatCredits(billing?.credits?.balance || 0)} />
        <StatCard label="Next Renewal" value={billing?.subscription?.currentPeriodEnd ? formatDate(billing.subscription.currentPeriodEnd) : 'N/A'} />
        <StatCard label="Live Promos" value={String(promotions.length)} />
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Promotions</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Apply a promo code manually or load one from the active campaign list.</p>
          </div>
          {promoMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{promoMessage}</p> : null}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex gap-2">
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="ENTER-CODE" className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
            <button
              onClick={async () => {
                setPromoMessage(null);
                try {
                  const result = await applyCoupon.mutateAsync({ code: couponCode, planSlug: currentPlanSlug });
                  setPromoMessage(result?.valid ? `${result.coupon?.code} is ready to use at checkout.` : result?.message || 'Promo could not be applied.');
                } catch (error: any) {
                  setPromoMessage(error?.response?.data?.message || 'Promo could not be applied.');
                }
              }}
              disabled={applyCoupon.isPending || !couponCode.trim()}
              className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
            >
              {applyCoupon.isPending ? 'Applying...' : 'Apply promo'}
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {promotions.slice(0, 4).map((promo: any) => (
              <button
                key={promo.id}
                onClick={() => {
                  setCouponCode(promo.code);
                  setPromoMessage(`${promo.code} loaded. Apply it to use the discount.`);
                }}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
              >
                <p className="font-semibold text-gray-900 dark:text-slate-100">{promo.code}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {promo.discountType === 'percentage' ? `${promo.discountValue}% off` : `$${promo.discountValue} off`}
                  {promo.expiresAt ? ` • ends ${formatDate(promo.expiresAt)}` : ''}
                </p>
              </button>
            ))}
            {!promotions.length ? <p className="text-sm text-gray-500 dark:text-slate-400">No active promotions right now.</p> : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Usage Metering</h2>
            <CreditCard className="h-5 w-5 text-blue-500 dark:text-blue-300" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(billing?.usage?.metrics || []).map((metric: any) => (
              <div key={metric.metricType} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{metric.metricType.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{metric.currentCount}{metric.limit === null ? '' : ` / ${metric.limit}`}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {metric.remaining === null ? 'Unlimited on this plan' : `${metric.remaining} remaining`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Actions</h2>
            <Receipt className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
          </div>
          <div className="mt-4 space-y-3">
            <button
              onClick={async () => {
                const result = await portal.mutateAsync();
                if ((result as any)?.url) window.location.href = (result as any).url;
              }}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            >
              Open Billing Portal
            </button>
            <div className="rounded-xl border border-gray-100 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Upgrade / downgrade</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setProvider('stripe')}
                  className={cn('rounded-full px-3 py-1.5 text-xs font-medium', provider === 'stripe' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950' : 'border border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-400')}
                >
                  Card / Stripe
                </button>
                {nowPaymentsEnabled ? (
                  <button
                    onClick={() => setProvider('nowpayments')}
                    className={cn('rounded-full px-3 py-1.5 text-xs font-medium', provider === 'nowpayments' ? 'bg-emerald-600 text-white' : 'border border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300')}
                  >
                    Crypto / NOWPayments
                  </button>
                ) : null}
              </div>
              {provider === 'nowpayments' && nowPaymentsEnabled ? (
                <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                  Supported crypto: {(nowPaymentsMethod?.supportedCurrencies || []).join(', ')}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <select value={interval} onChange={(e) => setInterval(e.target.value as any)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                {plans
                  .filter((plan: any) => plan.slug !== 'free')
                  .map((plan: any) => (
                    <button
                      key={plan.id}
                      onClick={async () => {
                        if (provider === 'nowpayments' && nowPaymentsEnabled) {
                          const result = await nowPaymentsCheckout.mutateAsync({
                            planSlug: plan.slug,
                            interval,
                            couponCode: couponCode || undefined,
                            payCurrency: nowPaymentsMethod?.supportedCurrencies?.[0],
                          });
                          if ((result as any)?.checkoutUrl) {
                            window.location.href = (result as any).checkoutUrl;
                          }
                          return;
                        }

                        const result = await checkout.mutateAsync({ planSlug: plan.slug, interval, couponCode: couponCode || undefined });
                        if ((result as any)?.checkoutUrl) {
                          window.location.href = (result as any).checkoutUrl;
                        }
                      }}
                      disabled={plan.slug === currentPlanSlug || checkout.isPending || nowPaymentsCheckout.isPending}
                      className={cn(
                        'rounded-xl px-4 py-2 text-sm font-medium',
                        plan.slug === currentPlanSlug
                          ? 'border border-gray-200 bg-gray-100 text-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                          : provider === 'nowpayments' && nowPaymentsEnabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white',
                      )}
                    >
                      {plan.slug === currentPlanSlug
                        ? `${plan.name} active`
                        : provider === 'nowpayments' && nowPaymentsEnabled
                          ? `Pay crypto for ${plan.name}`
                          : `Choose ${plan.name}`}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Invoice History</h2>
          <Receipt className="h-5 w-5 text-gray-400 dark:text-slate-500" />
        </div>
        <div className="mt-4 space-y-3">
          {(billing?.invoices || []).map((invoice: any) => (
            <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/70">
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">{invoice.invoiceNumber || invoice.stripeInvoiceId || 'Invoice'}</p>
                <p className="text-gray-500 dark:text-slate-400">{invoice.billedAt ? formatDate(invoice.billedAt) : 'Pending date'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-slate-100">${Number(invoice.amountPaid || invoice.totalAmount || 0).toFixed(2)}</p>
                <p className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {invoice.status}
                </p>
              </div>
            </div>
          ))}
          {!(billing?.invoices || []).length ? <p className="text-sm text-gray-500 dark:text-slate-400">No invoices yet.</p> : null}
        </div>
      </section>

      {billing?.team ? (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Enterprise Team</h2>
            <Users className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-300" />
          </div>
          <div className="mt-4 space-y-2">
            {billing.team.members.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/70">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{member.user.fullName}</p>
                  <p className="text-gray-500 dark:text-slate-400">{member.user.email}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', APPLICATION_STATUS_COLORS.accepted)}>{member.role}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
