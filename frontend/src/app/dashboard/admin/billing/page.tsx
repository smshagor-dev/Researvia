'use client';

import { useMemo, useState } from 'react';
import { AreaChart, Loader2, TicketPercent } from 'lucide-react';
import { useAdminBillingCoupons, useAdminBillingRevenue, useAdminBillingStats, useAdminBillingSubscriptions, useCreateCoupon } from '@/lib/hooks';

export default function AdminBillingPage() {
  const { data: stats, isLoading } = useAdminBillingStats();
  const { data: revenue } = useAdminBillingRevenue();
  const { data: coupons } = useAdminBillingCoupons();
  const { data: subscriptions } = useAdminBillingSubscriptions();
  const createCoupon = useCreateCoupon();
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: 10, maxUses: 100, expiresAt: '' });

  const statData = stats as any;
  const couponRows = coupons as any[] || [];
  const revenueRows = revenue as any[] || [];
  const subRows = subscriptions as any[] || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-300" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6 px-6 py-6 xl:px-8">
      <section className="rounded-3xl bg-gradient-to-r from-red-700 via-slate-950 to-orange-700 p-6 text-white">
        <h1 className="text-3xl font-bold">Billing Analytics</h1>
        <p className="mt-2 text-sm text-red-100">Revenue, MRR, ARR, subscriber health, coupon performance, and plan distribution.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Revenue" value={`$${Number(statData?.revenue || 0).toFixed(2)}`} />
        <Metric label="MRR" value={`$${Number(statData?.mrr || 0).toFixed(2)}`} />
        <Metric label="ARR" value={`$${Number(statData?.arr || 0).toFixed(2)}`} />
        <Metric label="Subscribers" value={String(statData?.activeSubscribers || 0)} />
        <Metric label="Churn" value={`${((statData?.churnRate || 0) * 100).toFixed(1)}%`} />
        <Metric label="Failed Payments" value={String(statData?.failedPayments || 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Revenue Timeline</h2>
            <AreaChart className="h-5 w-5 text-red-300" />
          </div>
          <div className="mt-4 space-y-3">
            {revenueRows.map((item: any) => (
              <div key={item.month} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <span>{item.month}</span>
                <span className="font-semibold">${Number(item.amount || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create Coupon</h2>
            <TicketPercent className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="mt-4 grid gap-3">
            <input value={form.code} onChange={(e) => setForm((v) => ({ ...v, code: e.target.value }))} placeholder="SUMMER50" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            <select value={form.discountType} onChange={(e) => setForm((v) => ({ ...v, discountType: e.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
            <input type="number" value={form.discountValue} onChange={(e) => setForm((v) => ({ ...v, discountValue: Number(e.target.value) }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            <input type="number" value={form.maxUses} onChange={(e) => setForm((v) => ({ ...v, maxUses: Number(e.target.value) }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            <input type="date" value={form.expiresAt} onChange={(e) => setForm((v) => ({ ...v, expiresAt: e.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            <button
              onClick={() => createCoupon.mutate(form)}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              Create Coupon
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100">
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <div className="mt-4 space-y-3">
          {subRows.map((sub: any) => (
            <div key={sub.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{sub.user?.fullName || sub.userId}</p>
                <p className="text-slate-400">{sub.user?.email}</p>
              </div>
              <div className="text-right">
                <p>{sub.plan?.name}</p>
                <p className="text-slate-400">{sub.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100">
        <h2 className="text-lg font-semibold">Coupon Usage</h2>
        <div className="mt-4 space-y-3">
          {couponRows.map((coupon: any) => (
            <div key={coupon.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{coupon.code}</p>
                <p className="text-slate-400">{coupon.discountType} {coupon.discountValue}</p>
              </div>
              <div className="text-right">
                <p>{coupon.usedCount}/{coupon.maxUses || '∞'}</p>
                <p className="text-slate-400">{coupon.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
