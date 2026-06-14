'use client';

import { useAdminOutreach, useAdminSystemHealth } from '@/lib/hooks';
import { AlertCircle, BarChart3, MailCheck, Reply, Send, TrendingUp } from 'lucide-react';

export default function AdminOutreachPage() {
  const outreachQuery = useAdminOutreach();
  const healthQuery = useAdminSystemHealth();
  const stats = outreachQuery.data as any;
  const queues = ((healthQuery.data as any)?.queues?.items || []).filter((queue: any) => String(queue.queueName).startsWith('email-'));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Outreach Operations</h1>
        <p className="text-sm text-gray-500">Email sends, replies, follow-up performance, and queue health.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ['Emails Sent', stats?.emailsSent || 0, Send],
          ['Open Rate', `${stats?.openRate || 0}%`, BarChart3],
          ['Reply Rate', `${stats?.replyRate || 0}%`, Reply],
          ['Acceptance', `${stats?.acceptanceRate || 0}%`, TrendingUp],
          ['Failed Sends', stats?.failedSends || 0, AlertCircle],
        ].map(([label, value, Icon]: any) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              <Icon className="h-4 w-4" /> {label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-semibold text-gray-900">Follow-up Performance</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(stats?.followupPerformance || []).map((row: any) => (
              <div key={row.stage} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium capitalize text-gray-700">{row.stage.replace('followup', 'follow-up ')}</span>
                <span className="text-gray-500">{row.replies} replies from {row.threads} threads</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <MailCheck className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Queue Health</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {queues.map((queue: any) => (
              <div key={queue.queueName} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-gray-700">{queue.queueName}</span>
                <span className="text-gray-500">
                  {queue.counts?.waiting || 0} waiting, {queue.counts?.failed || 0} failed
                </span>
              </div>
            ))}
            {queues.length === 0 && <div className="px-4 py-6 text-sm text-gray-400">No email queue snapshots yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
