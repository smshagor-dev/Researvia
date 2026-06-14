'use client';
import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi } from '@/lib/api';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function AdminPlansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: subscriptionsApi.getPlans,
  });
  const rows = data as any[] || [];

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
        <p className="mt-1 text-sm text-gray-500">Subscription plan catalog used by billing and feature access.</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((plan: any) => (
            <div key={plan.id} className="rounded-xl border border-gray-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
                  <p className="text-sm text-gray-500">{plan.slug}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">${Number(plan.priceMonthly).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">monthly</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div>Credits / mo: {plan.creditsPerMonth}</div>
                <div>Emails / day: {plan.emailSendsPerDay}</div>
                <div>Reveals / mo: {plan.professorRevealsPerMonth}</div>
                <div>AI / mo: {plan.aiGenerationsPerMonth}</div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-700">
                {[
                  ['Inbox sync', plan.hasInboxSync],
                  ['AI match score', plan.hasAiMatchScore],
                  ['Bulk email', plan.hasBulkEmail],
                  ['Analytics', plan.hasAnalytics],
                ].map(([label, enabled]) => (
                  <div key={String(label)} className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${enabled ? 'text-green-500' : 'text-gray-300'}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
