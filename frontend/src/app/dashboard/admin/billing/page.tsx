'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AreaChart, Loader2, TicketPercent } from 'lucide-react';
import { useAdminBillingCoupons, useAdminBillingRevenue, useAdminBillingStats, useAdminBillingSubscriptions, useCreateCoupon, useUpdateCoupon } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';

export default function AdminBillingPage() {
  const { data: stats, isLoading } = useAdminBillingStats();
  const { data: revenue } = useAdminBillingRevenue();
  const { data: coupons } = useAdminBillingCoupons();
  const { data: subscriptions } = useAdminBillingSubscriptions();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: 10, maxUses: 100, expiresAt: '' });
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const statData = stats as any;
  const couponRows = (coupons as any[]) || [];
  const revenueRows = (revenue as any[]) || [];
  const subRows = (subscriptions as any[]) || [];

  const activeCouponCount = useMemo(() => couponRows.filter((coupon) => coupon.isActive).length, [couponRows]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-300" /></div>;
  }

  const resetForm = () => {
    setForm({ code: '', discountType: 'percentage', discountValue: 10, maxUses: 100, expiresAt: '' });
    setEditingPromoId(null);
  };

  const onSubmitPromo = async () => {
    setMessage(null);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        expiresAt: form.expiresAt || undefined,
        maxUses: form.maxUses || undefined,
      };

      if (editingPromoId) {
        await updateCoupon.mutateAsync({
          id: editingPromoId,
          data: payload,
        });
        setMessage('Promo updated successfully.');
      } else {
        await createCoupon.mutateAsync(payload);
        setMessage('Promo created successfully.');
      }

      resetForm();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || `Could not ${editingPromoId ? 'update' : 'create'} promo right now.`);
    }
  };

  const onToggleCoupon = async (coupon: any) => {
    setMessage(null);
    try {
      await updateCoupon.mutateAsync({
        id: coupon.id,
        data: { isActive: !coupon.isActive },
      });
      setMessage(`${coupon.code} is now ${coupon.isActive ? 'inactive' : 'active'}.`);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Could not update promo status.');
    }
  };

  const onEditCoupon = (coupon: any) => {
    setEditingPromoId(coupon.id);
    setForm({
      code: coupon.code || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: Number(coupon.discountValue || 0),
      maxUses: Number(coupon.maxUses || 100),
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : '',
    });
    setMessage(`Editing ${coupon.code}`);
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6 px-6 py-6 xl:px-8">
      <section className="rounded-3xl bg-gradient-to-r from-red-700 via-slate-950 to-orange-700 p-6 text-white">
        <h1 className="text-3xl font-bold">Billing Analytics</h1>
        <p className="mt-2 text-sm text-red-100">Revenue, MRR, ARR, subscriber health, promo performance, and plan distribution.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Revenue" value={`$${Number(statData?.revenue || 0).toFixed(2)}`} />
        <Metric label="MRR" value={`$${Number(statData?.mrr || 0).toFixed(2)}`} />
        <Metric label="ARR" value={`$${Number(statData?.arr || 0).toFixed(2)}`} />
        <Metric label="Subscribers" value={String(statData?.activeSubscribers || 0)} />
        <Metric label="Active Promos" value={String(activeCouponCount)} />
        <Metric label="Failed Payments" value={String(statData?.failedPayments || 0)} />
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Payment Method Setup</h2>
            <p className="mt-1 text-sm text-slate-400">Operational payment settings are separated by provider. Production activation is controlled by server-side secrets, not by admin toggles.</p>
          </div>
          <Link href="/dashboard/admin/settings?group=payment-stripe" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
            Open Payment Settings
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ProviderCard title="Stripe" description="Configure production Stripe plan mapping. Activation requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET on the server." href="/dashboard/admin/settings?group=payment-stripe" />
          <ProviderCard title="NOWPayments" description="Configure production crypto checkout behavior. Activation requires NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET on the server." href="/dashboard/admin/settings?group=payment-nowpayments" />
        </div>
      </section>

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

        <section id="promos" className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingPromoId ? 'Edit Promo' : 'Create Promo'}</h2>
            <TicketPercent className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Promo Code</span>
              <input value={form.code} onChange={(e) => setForm((v) => ({ ...v, code: e.target.value }))} placeholder="SUMMER50" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Discount Type</span>
              <select value={form.discountType} onChange={(e) => setForm((v) => ({ ...v, discountType: e.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Discount Value</span>
              <input type="number" value={form.discountValue} onChange={(e) => setForm((v) => ({ ...v, discountValue: Number(e.target.value) }))} placeholder="Discount value" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Max Uses</span>
              <input type="number" value={form.maxUses} onChange={(e) => setForm((v) => ({ ...v, maxUses: Number(e.target.value) }))} placeholder="Max uses" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-300">Expiry Date</span>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm((v) => ({ ...v, expiresAt: e.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
            </label>
            <button
              onClick={onSubmitPromo}
              disabled={createCoupon.isPending || updateCoupon.isPending}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {createCoupon.isPending || updateCoupon.isPending
                ? (editingPromoId ? 'Saving...' : 'Creating...')
                : (editingPromoId ? 'Save Changes' : 'Create Promo')}
            </button>
            {editingPromoId ? (
              <button
                onClick={resetForm}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cancel Edit
              </button>
            ) : null}
            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
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

      <section id="promo-usage" className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-slate-100">
        <h2 className="text-lg font-semibold">Promo Usage</h2>
        <div className="mt-4 space-y-3">
          {couponRows.map((coupon: any) => (
            <div key={coupon.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{coupon.code}</p>
                  <p className="text-slate-400">{coupon.discountType} {coupon.discountValue}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Expires {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'never'} • Used {coupon.usedCount}/{coupon.maxUses || 'unlimited'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={coupon.isActive ? 'text-emerald-300' : 'text-amber-300'}>{coupon.isActive ? 'Active' : 'Inactive'}</p>
                  <button
                    onClick={() => onEditCoupon(coupon)}
                    className="mt-2 block w-full rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                  >
                    Edit promo
                  </button>
                  <button
                    onClick={() => onToggleCoupon(coupon)}
                    disabled={updateCoupon.isPending}
                    className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {coupon.isActive ? 'Pause promo' : 'Activate promo'}
                  </button>
                </div>
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

function ProviderCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Configure</p>
    </Link>
  );
}
