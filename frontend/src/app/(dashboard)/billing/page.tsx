'use client';

import { useState } from 'react';
import { CreditCard, Loader2, Receipt, TicketPercent, Users } from 'lucide-react';
import { useApplyCoupon, useBilling, useBillingCheckout, useBillingPortal } from '@/lib/hooks';
import { APPLICATION_STATUS_COLORS, cn, formatCredits, formatDate } from '@/lib/utils';

export default function BillingPage() {
  const { data, isLoading } = useBilling();
  const checkout = useBillingCheckout();
  const portal = useBillingPortal();
  const applyCoupon = useApplyCoupon();
  const [couponCode, setCouponCode] = useState('');
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  const billing = data as any;
  const plans = [billing?.subscription?.plan].filter(Boolean);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6 px-6 py-6 xl:px-8">
      <section className="rounded-3xl bg-gradient-to-r from-emerald-700 via-slate-900 to-blue-900 p-6 text-white">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-2 text-sm text-emerald-100">Current plan, credits, usage, invoices, coupons, and team access all in one place.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Current Plan" value={billing?.subscription?.plan?.name || 'Free'} />
        <StatCard label="Credits Remaining" value={formatCredits(billing?.credits?.balance || 0)} />
        <StatCard label="Next Renewal" value={billing?.subscription?.currentPeriodEnd ? formatDate(billing.subscription.currentPeriodEnd) : 'N/A'} />
        <StatCard label="Team Members" value={String(billing?.team?.members?.length || 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Usage Metering</h2>
            <CreditCard className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(billing?.usage?.metrics || []).map((metric: any) => (
              <div key={metric.metricType} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">{metric.metricType.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{metric.currentCount}{metric.limit === null ? '' : ` / ${metric.limit}`}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {metric.remaining === null ? 'Unlimited on this plan' : `${metric.remaining} remaining`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            <Receipt className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-4 space-y-3">
            <button
              onClick={async () => {
                const result = await portal.mutateAsync();
                if ((result as any)?.url) window.location.href = (result as any).url;
              }}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
            >
              Open Billing Portal
            </button>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-medium text-gray-900">Apply coupon</p>
              <div className="mt-3 flex gap-2">
                <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="ENTER-CODE" className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <button onClick={() => applyCoupon.mutate(couponCode)} className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700">
                  Apply
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-medium text-gray-900">Upgrade / downgrade</p>
              <div className="mt-3 flex gap-2">
                <select value={interval} onChange={(e) => setInterval(e.target.value as any)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <button
                  onClick={() => checkout.mutate({ planSlug: 'pro', interval })}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Invoice History</h2>
          <Receipt className="h-5 w-5 text-gray-400" />
        </div>
        <div className="mt-4 space-y-3">
          {(billing?.invoices || []).map((invoice: any) => (
            <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-gray-900">{invoice.invoiceNumber || invoice.stripeInvoiceId || 'Invoice'}</p>
                <p className="text-gray-500">{invoice.billedAt ? formatDate(invoice.billedAt) : 'Pending date'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">${Number(invoice.amountPaid || invoice.totalAmount || 0).toFixed(2)}</p>
                <p className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {invoice.status}
                </p>
              </div>
            </div>
          ))}
          {!(billing?.invoices || []).length ? <p className="text-sm text-gray-500">No invoices yet.</p> : null}
        </div>
      </section>

      {billing?.team ? (
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Enterprise Team</h2>
            <Users className="h-5 w-5 text-fuchsia-500" />
          </div>
          <div className="mt-4 space-y-2">
            {billing.team.members.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{member.user.fullName}</p>
                  <p className="text-gray-500">{member.user.email}</p>
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
