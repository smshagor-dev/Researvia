'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { useApplications, useCreateInterview, useUpdateApplication, useUpdateInterview } from '@/lib/hooks';
import {
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
  INTERVIEW_STATUS_LABELS,
  OPPORTUNITY_TYPE_LABELS,
  cn,
  formatDate,
} from '@/lib/utils';

const COLUMNS = ['saved', 'planning', 'applied', 'under_review', 'interview', 'offer_received', 'accepted', 'rejected'];

export default function ApplicationsPage() {
  const { data, isLoading } = useApplications({ perPage: 100 });
  const updateApplication = useUpdateApplication();
  const createInterview = useCreateInterview();
  const updateInterview = useUpdateInterview();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [form, setForm] = useState({
    scheduledAt: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    meetingLink: '',
    notes: '',
  });

  const result = data as any;
  const applications = result?.data || [];
  const board = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const column of COLUMNS) map.set(column, []);
    for (const application of applications) {
      map.get(application.status)?.push(application);
    }
    return map;
  }, [applications]);

  const handleDrop = async (status: string) => {
    if (!draggingId) return;
    await updateApplication.mutateAsync({ id: draggingId, data: { status } });
    setDraggingId(null);
  };

  const scheduleInterview = async () => {
    if (!selectedApplication) return;

    if (selectedApplication.interviews?.length) {
      await updateInterview.mutateAsync({
        id: selectedApplication.interviews[0].id,
        data: {
          scheduledAt: form.scheduledAt,
          timezone: form.timezone,
          meetingLink: form.meetingLink,
          notes: form.notes,
          status: 'rescheduled',
        },
      });
    } else {
      await createInterview.mutateAsync({
        applicationId: selectedApplication.id,
        scheduledAt: form.scheduledAt,
        timezone: form.timezone,
        meetingLink: form.meetingLink,
        notes: form.notes,
      });
    }

    setSelectedApplication(null);
    setForm({
      scheduledAt: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      meetingLink: '',
      notes: '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 px-6 py-6 xl:px-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Application Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">Drag applications between stages, schedule interviews, and keep offers visible in one place.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-8">
        {COLUMNS.map((column) => (
          <div
            key={column}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(column)}
            className="rounded-2xl border border-gray-100 bg-white p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">{APPLICATION_STATUS_LABELS[column]}</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {board.get(column)?.length || 0}
              </span>
            </div>
            <div className="space-y-3">
              {(board.get(column) || []).map((application: any) => (
                <article
                  key={application.id}
                  draggable
                  onDragStart={() => setDraggingId(application.id)}
                  className="cursor-grab rounded-xl border border-gray-100 bg-gray-50 p-3 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{application.opportunity.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{OPPORTUNITY_TYPE_LABELS[application.opportunity.type] || application.opportunity.type}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', APPLICATION_STATUS_COLORS[application.status])}>
                      {APPLICATION_STATUS_LABELS[application.status]}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <p>{application.opportunity.country?.flagEmoji} {application.opportunity.country?.name || 'Global'}</p>
                    <p>Readiness {application.readiness?.score ?? 0}/100</p>
                    <p>Fit {application.fit?.score ?? 0}/100</p>
                    {application.opportunity.deadline ? <p>Deadline {formatDate(application.opportunity.deadline)}</p> : null}
                  </div>

                  {application.interviews?.length ? (
                    <div className="mt-3 rounded-lg bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-700">
                      {INTERVIEW_STATUS_LABELS[application.interviews[0].status]}: {new Date(application.interviews[0].scheduledAt).toLocaleString()}
                    </div>
                  ) : null}

                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setSelectedApplication(application)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700">
                      <CalendarPlus className="h-3.5 w-3.5" />
                      {application.interviews?.length ? 'Update interview' : 'Schedule'}
                    </button>
                    {(column === 'offer_received' || column === 'accepted') && (
                      <button
                        onClick={() => updateApplication.mutate({ id: application.id, data: { status: column === 'offer_received' ? 'accepted' : 'accepted' } })}
                        className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {!(board.get(column) || []).length ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
                  Drop applications here
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {selectedApplication ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Interview Management</h2>
                <p className="text-sm text-gray-500">{selectedApplication.opportunity.title}</p>
              </div>
              <button onClick={() => setSelectedApplication(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600">Close</button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Scheduled at</span>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Timezone</span>
                <input
                  value={form.timezone}
                  onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Meeting link</span>
                <input
                  value={form.meetingLink}
                  onChange={(event) => setForm((current) => ({ ...current, meetingLink: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Notes</span>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900">Preparation checklist</p>
                <div className="mt-2 space-y-1">
                  {(selectedApplication.interviewPreparation?.likelyQuestions || []).slice(0, 3).map((item: string) => (
                    <p key={item}>• {item}</p>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSelectedApplication(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
                <button
                  onClick={scheduleInterview}
                  disabled={!form.scheduledAt || createInterview.isPending || updateInterview.isPending}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {createInterview.isPending || updateInterview.isPending ? 'Saving...' : 'Save Interview'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
