'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useCreateApplication, useOpportunity, useUpdateApplication } from '@/lib/hooks';
import { APPLICATION_STATUS_COLORS, OPPORTUNITY_TYPE_LABELS, cn, formatDate, formatDeadline } from '@/lib/utils';

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useOpportunity(params.id);
  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication();
  const opportunity = data as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!opportunity) {
    return <div className="mx-auto w-full max-w-[1200px] px-6 py-10 text-sm text-gray-500">Opportunity not found.</div>;
  }

  const deadline = formatDeadline(opportunity.deadline);
  const currentApplication = opportunity.currentApplication;
  const readiness = opportunity.readiness;
  const fit = opportunity.fit;
  const interviewPreparation = opportunity.interviewPreparation;

  const saveOpportunity = async () => {
    if (currentApplication) {
      await updateApplication.mutateAsync({ id: currentApplication.id, data: { status: 'saved' } });
      return;
    }
    await createApplication.mutateAsync({ opportunityId: opportunity.id, status: 'saved' });
  };

  const planOpportunity = async () => {
    if (currentApplication) {
      await updateApplication.mutateAsync({ id: currentApplication.id, data: { status: 'planning' } });
      return;
    }
    await createApplication.mutateAsync({ opportunityId: opportunity.id, status: 'planning' });
  };

  const markApplied = async () => {
    if (currentApplication) {
      await updateApplication.mutateAsync({ id: currentApplication.id, data: { status: 'applied' } });
      return;
    }
    await createApplication.mutateAsync({ opportunityId: opportunity.id, status: 'applied' });
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-6 py-6 xl:px-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-blue-200">{OPPORTUNITY_TYPE_LABELS[opportunity.type] || opportunity.type}</p>
            <h1 className="mt-2 text-3xl font-bold">{opportunity.title}</h1>
            <p className="mt-2 text-sm text-blue-100">
              {opportunity.professor?.fullName || opportunity.university?.name} {opportunity.department?.name ? `• ${opportunity.department.name}` : ''}
            </p>
          </div>
          <div className="space-y-2 text-right text-sm text-blue-100">
            <p>{opportunity.country?.flagEmoji} {opportunity.country?.name || 'Global'}</p>
            <p className={deadline.color.replace('text-', 'text-white ')}>{deadline.text}</p>
            {opportunity.officialUrl ? (
              <a href={opportunity.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-white">
                Official posting
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <article className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">{opportunity.description || 'No description provided.'}</p>
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Requirements</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">{opportunity.requirements || 'Requirements will be shared by the institution.'}</p>
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Interview Preparation</h2>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <PrepList title="Likely questions" items={interviewPreparation?.likelyQuestions || []} />
              <PrepList title="Preparation topics" items={interviewPreparation?.preparationTopics || []} />
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900">Reading list</h3>
              <div className="mt-2 space-y-2">
                {(interviewPreparation?.readingList || []).map((item: any, index: number) => (
                  <div key={`${item.title}-${index}`} className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p>{item.venue || 'Publication'} {item.year ? `• ${item.year}` : ''}</p>
                  </div>
                ))}
                {!(interviewPreparation?.readingList || []).length ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
                    No publication list available for this opportunity yet.
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Application Actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <button onClick={saveOpportunity} disabled={createApplication.isPending || updateApplication.isPending} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                Save Opportunity
              </button>
              <button onClick={planOpportunity} disabled={createApplication.isPending || updateApplication.isPending} className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-700 disabled:opacity-50">
                Move to Planning
              </button>
              <button onClick={markApplied} disabled={createApplication.isPending || updateApplication.isPending} className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 disabled:opacity-50">
                Mark as Applied
              </button>
              <Link href="/applications" className="rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700">
                Open Applications Board
              </Link>
            </div>
            {currentApplication?.status ? (
              <div className="mt-4">
                <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', APPLICATION_STATUS_COLORS[currentApplication.status])}>
                  Current status: {currentApplication.status.replace(/_/g, ' ')}
                </span>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">AI Guidance</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Readiness score" value={`${readiness?.score ?? 0}/100`} />
              <MetricCard label="Fit score" value={`${fit?.score ?? 0}/100`} />
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Missing documents</p>
                <p className="mt-1 text-sm text-gray-600">
                  {(readiness?.missingDocuments || []).length
                    ? readiness.missingDocuments.join(', ')
                    : 'No missing required documents detected.'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Fit reasons</p>
                <div className="mt-2 space-y-2">
                  {(fit?.reasons || []).map((reason: string) => (
                    <div key={reason} className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">{reason}</div>
                  ))}
                  {!(fit?.reasons || []).length ? (
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">Add more academic preference data to unlock stronger fit reasoning.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Opportunity Facts</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <FactRow label="University" value={opportunity.university?.name || 'N/A'} />
              <FactRow label="Department" value={opportunity.department?.name || 'N/A'} />
              <FactRow label="Professor" value={opportunity.professor?.fullName || 'N/A'} />
              <FactRow label="Funding" value={opportunity.fundingAmount ? `${opportunity.currency || ''} ${Number(opportunity.fundingAmount).toLocaleString()}` : (opportunity.isFullyFunded ? 'Fully funded' : 'Varies')} />
              <FactRow label="Deadline" value={opportunity.deadline ? formatDate(opportunity.deadline) : 'No stated deadline'} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{value}</span>
    </div>
  );
}

function PrepList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">{item}</div>
        ))}
      </div>
    </div>
  );
}
