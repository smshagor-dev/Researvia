'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useOutreachAnalytics, useOutreachStageUpdate, useOutreachThreads } from '@/lib/hooks';
import { BarChart3, Mail, PauseCircle, Reply, Send } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

const stages = [
  { key: 'saved', label: 'Saved' },
  { key: 'planned', label: 'Planned' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'followup1', label: 'Follow-up' },
  { key: 'replied', label: 'Replied' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

export default function OutreachPage() {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const threadsQuery = useOutreachThreads({ perPage: 100 });
  const analyticsQuery = useOutreachAnalytics();
  const stageUpdate = useOutreachStageUpdate();
  const threads = (threadsQuery.data as any)?.data || [];
  const analytics = analyticsQuery.data as any;

  const moveThread = (stage: string) => {
    if (!draggedId) return;
    stageUpdate.mutate({ id: draggedId, stage });
    setDraggedId(null);
  };

  return (
    <div className="h-full min-h-0 bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Outreach Pipeline</h1>
            <p className="text-sm text-gray-500">Manage professor conversations and follow-up stages.</p>
          </div>
          <Link href="/inbox" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Mail className="h-4 w-4" /> Inbox
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Sent', analytics?.emailsSent || 0, Send],
            ['Open Rate', `${analytics?.openRate || 0}%`, BarChart3],
            ['Reply Rate', `${analytics?.replyRate || 0}%`, Reply],
            ['Failed', analytics?.failedSends || 0, PauseCircle],
          ].map(([label, value, Icon]: any) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                <Icon className="h-3.5 w-3.5" /> {label}
              </div>
              <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-[calc(100vh-220px)] gap-3 overflow-x-auto p-4">
        {stages.map((stage) => {
          const items = threads.filter((thread: any) => {
            if (stage.key === 'followup1') return ['followup1', 'followup2', 'followup3'].includes(thread.currentStage);
            return thread.currentStage === stage.key;
          });

          return (
            <section
              key={stage.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveThread(stage.key)}
              className="flex w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <h2 className="text-sm font-semibold text-gray-800">{stage.label}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{items.length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {items.map((thread: any) => (
                  <Link
                    key={thread.id}
                    href={`/inbox?thread=${thread.id}`}
                    draggable
                    onDragStart={() => setDraggedId(thread.id)}
                    className={cn(
                      'block rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow',
                      thread.replyReceived && 'border-green-200 bg-green-50',
                    )}
                  >
                    <div className="text-sm font-semibold text-gray-900">{thread.professor?.fullName || 'Professor'}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-gray-500">{thread.subject}</div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>{thread.professor?.university?.name || 'University'}</span>
                      <span>{thread.lastMessageAt ? formatRelativeTime(thread.lastMessageAt) : 'No send'}</span>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{thread.sentCount} sent</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{thread.openCount} opens</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
