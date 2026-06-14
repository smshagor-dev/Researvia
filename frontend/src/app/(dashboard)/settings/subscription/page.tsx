'use client';
import { usePlans, useMySubscription, useCredits, useCreditTransactions } from '@/lib/hooks';
import { subscriptionsApi } from '@/lib/api';
import { useState } from 'react';
import { Check, Loader2, Zap, CreditCard, Coins, ArrowUpRight } from 'lucide-react';
import { cn, formatDate, formatCredits } from '@/lib/utils';

const PLAN_COLORS: Record<string,string> = {
  free: 'border-gray-200',
  starter: 'border-blue-300',
  pro: 'border-indigo-400 ring-2 ring-indigo-400',
  enterprise: 'border-purple-400',
};
const PLAN_BADGES: Record<string,string> = { pro: 'Most Popular', enterprise: 'Best Value' };

export default function SubscriptionPage() {
  const { data: plans } = usePlans();
  const { data: sub } = useMySubscription();
  const { data: credits } = useCredits();
  const { data: txns } = useCreditTransactions({ perPage: 10 });
  const [interval, setInterval] = useState<'monthly'|'yearly'>('monthly');
  const [checkingOut, setCheckingOut] = useState<string|null>(null);

  const plansArr = plans as any[] || [];
  const currentSub = sub as any;
  const creditBalance = (credits as any)?.balance || 0;
  const transactions = (txns as any)?.data || [];
  const currentPlanSlug = currentSub?.plan?.slug || 'free';

  const handleCheckout = async (planSlug: string) => {
    if (planSlug === 'free' || planSlug === currentPlanSlug) return;
    setCheckingOut(planSlug);
    try {
      const result = await subscriptionsApi.checkout(planSlug, interval);
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } finally { setCheckingOut(null); }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Zap className="w-6 h-6 text-blue-500" /> Subscription & Credits</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your plan and credit usage</p>
      </div>

      {/* Current plan & credits */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
          <p className="text-blue-100 text-sm mb-1">Current Plan</p>
          <p className="text-2xl font-bold capitalize">{currentPlanSlug}</p>
          {currentSub?.currentPeriodEnd && (
            <p className="text-blue-200 text-xs mt-2">Renews {formatDate(currentSub.currentPeriodEnd)}</p>
          )}
          {currentPlanSlug !== 'free' && (
            <button onClick={() => subscriptionsApi.cancel()} className="mt-3 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition">
              Cancel Plan
            </button>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-yellow-500" />
            <p className="text-sm text-gray-500">Available Credits</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCredits(creditBalance)}</p>
          <p className="text-xs text-gray-400 mt-1">5 credits per email reveal · 10 credits per AI generation</p>
        </div>
      </div>

      {/* Billing interval toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={cn('text-sm font-medium', interval === 'monthly' ? 'text-gray-900' : 'text-gray-400')}>Monthly</span>
        <button onClick={() => setInterval(p => p === 'monthly' ? 'yearly' : 'monthly')}
          className={cn('relative w-12 h-6 rounded-full transition-colors', interval === 'yearly' ? 'bg-blue-600' : 'bg-gray-200')}>
          <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', interval === 'yearly' ? 'left-7' : 'left-1')} />
        </button>
        <span className={cn('text-sm font-medium', interval === 'yearly' ? 'text-gray-900' : 'text-gray-400')}>
          Yearly <span className="text-green-600 font-bold">−17%</span>
        </span>
      </div>

      {/* Plans grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {plansArr.map((plan: any) => {
          const isCurrent = plan.slug === currentPlanSlug;
          const price = interval === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const monthlyPrice = interval === 'yearly' ? (plan.priceYearly / 12).toFixed(2) : plan.priceMonthly;
          return (
            <div key={plan.id} className={cn('bg-white rounded-xl border p-5 relative flex flex-col', PLAN_COLORS[plan.slug] || 'border-gray-200')}>
              {PLAN_BADGES[plan.slug] && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                  {PLAN_BADGES[plan.slug]}
                </div>
              )}
              <h3 className="font-bold text-gray-900 mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">${monthlyPrice}</span>
                <span className="text-gray-400 text-sm">/mo</span>
                {interval === 'yearly' && price > 0 && (
                  <p className="text-xs text-gray-400">${price}/year billed annually</p>
                )}
              </div>
              <div className="space-y-2 flex-1 mb-4">
                {[
                  `${plan.creditsPerMonth} credits/mo`,
                  `${plan.professorRevealsPerMonth === 9999 ? 'Unlimited' : plan.professorRevealsPerMonth} email reveals`,
                  `${plan.emailSendsPerDay === 9999 ? 'Unlimited' : plan.emailSendsPerDay} emails/day`,
                  `${plan.aiGenerationsPerMonth === 9999 ? 'Unlimited' : plan.aiGenerationsPerMonth} AI generations`,
                  plan.hasInboxSync && 'Inbox sync',
                  plan.hasAiMatchScore && 'AI match scoring',
                  plan.hasAnalytics && 'Advanced analytics',
                ].filter(Boolean).map((feature: any, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout(plan.slug)}
                disabled={isCurrent || checkingOut === plan.slug || plan.slug === 'free'}
                className={cn('w-full py-2.5 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2',
                  isCurrent ? 'bg-gray-100 text-gray-400 cursor-default' :
                  plan.slug === 'free' ? 'bg-gray-100 text-gray-500 cursor-default' :
                  'gradient-primary text-white hover:opacity-90 disabled:opacity-60')}>
                {checkingOut === plan.slug && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCurrent ? 'Current Plan' : plan.slug === 'free' ? 'Free Forever' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent credit transactions */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-500" /> Recent Credit Activity
        </h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400">No credit transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-700 capitalize">{tx.type.replace(/_/g,' ')}</p>
                  {tx.description && <p className="text-xs text-gray-400">{tx.description}</p>}
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-bold', tx.amount > 0 ? 'text-green-600' : 'text-red-500')}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
