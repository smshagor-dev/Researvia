'use client';

import { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, BookmarkPlus, Search, ExternalLink } from 'lucide-react';
import { useCreateApplication, useCountries, useOpportunities } from '@/lib/hooks';
import { APPLICATION_STATUS_COLORS, OPPORTUNITY_TYPE_LABELS, cn, formatDeadline } from '@/lib/utils';

const OPPORTUNITY_TYPES = [
  'phd_position',
  'research_assistant',
  'teaching_assistant',
  'research_internship',
  'lab_position',
  'research_grant',
  'fellowship',
  'postdoc',
  'exchange_program',
];

function OpportunitiesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const createApplication = useCreateApplication();

  const params = {
    q: searchParams.get('q') || '',
    type: searchParams.get('type') || '',
    countryId: searchParams.get('countryId') || '',
    fullyFunded: searchParams.get('fullyFunded') || '',
    deadlineTo: searchParams.get('deadlineTo') || '',
    sortBy: searchParams.get('sortBy') || 'deadline',
    page: Number(searchParams.get('page') || '1'),
    perPage: 18,
  };

  const { data, isLoading } = useOpportunities(params);
  const { data: countries } = useCountries();

  const result = data as any;
  const opportunities = result?.data || [];
  const meta = result?.meta || { page: 1, lastPage: 1, total: 0 };

  const updateParam = useCallback((key: string, value: string) => {
    const current = new URLSearchParams(searchParams.toString());
    if (value) current.set(key, value);
    else current.delete(key);
    if (key !== 'page') current.delete('page');
    router.push(`/opportunities?${current.toString()}`);
  }, [router, searchParams]);

  const handleSave = async (opportunityId: string) => {
    setSavingId(opportunityId);
    try {
      await createApplication.mutateAsync({ opportunityId, status: 'saved' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Research Opportunity Marketplace</h1>
        <p className="text-sm text-gray-500">Discover verified academic openings, save them into your pipeline, and move from planning to offer.</p>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[2fr,1fr,1fr,1fr,1fr]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            defaultValue={params.q}
            placeholder="Search title, requirements, or topic..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') updateParam('q', (event.target as HTMLInputElement).value);
            }}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
        <select value={params.type} onChange={(event) => updateParam('type', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="">All opportunity types</option>
          {OPPORTUNITY_TYPES.map((value) => (
            <option key={value} value={value}>{OPPORTUNITY_TYPE_LABELS[value]}</option>
          ))}
        </select>
        <select value={params.countryId} onChange={(event) => updateParam('countryId', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="">All countries</option>
          {(countries as any[])?.map((country: any) => (
            <option key={country.id} value={country.id}>{country.flagEmoji} {country.name}</option>
          ))}
        </select>
        <select value={params.fullyFunded} onChange={(event) => updateParam('fullyFunded', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="">All funding</option>
          <option value="true">Fully funded</option>
          <option value="false">Partially/self funded</option>
        </select>
        <select value={params.sortBy} onChange={(event) => updateParam('sortBy', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="deadline">Deadline</option>
          <option value="qualityScore">Quality score</option>
          <option value="createdAt">Newest</option>
          <option value="fundingAmount">Funding amount</option>
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <input
          type="date"
          value={params.deadlineTo}
          onChange={(event) => updateParam('deadlineTo', event.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
        />
        <span>{isLoading ? 'Loading opportunities...' : `${meta.total?.toLocaleString?.() || 0} opportunities found`}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {opportunities.map((opportunity: any) => {
            const deadline = formatDeadline(opportunity.deadline);
            return (
              <div key={opportunity.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/opportunities/${opportunity.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                      {opportunity.title}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500">
                      {opportunity.professor?.fullName || opportunity.department?.name || opportunity.university?.name || 'Academic opportunity'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(opportunity.id)}
                    disabled={savingId === opportunity.id}
                    className="rounded-lg p-2 transition hover:bg-blue-50"
                  >
                    {savingId === opportunity.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <BookmarkPlus className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {OPPORTUNITY_TYPE_LABELS[opportunity.type] || opportunity.type}
                  </span>
                  {opportunity.fit?.score != null ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Fit {opportunity.fit.score}/100
                    </span>
                  ) : null}
                  {opportunity.readiness?.score != null ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Ready {opportunity.readiness.score}/100
                    </span>
                  ) : null}
                  {opportunity.currentApplication?.status ? (
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', APPLICATION_STATUS_COLORS[opportunity.currentApplication.status])}>
                      {opportunity.currentApplication.status.replace(/_/g, ' ')}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>{opportunity.country?.flagEmoji} {opportunity.country?.name || 'Global'}</p>
                  <p>{opportunity.fundingAmount ? `${opportunity.currency || ''} ${Number(opportunity.fundingAmount).toLocaleString()}` : 'Funding varies by program'}</p>
                  <p className={deadline.color}>{deadline.text}</p>
                </div>

                <p className="mt-4 line-clamp-4 flex-1 text-sm text-gray-500">
                  {opportunity.description || opportunity.requirements || 'View the detail page for the full opportunity brief.'}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                  <Link href={`/opportunities/${opportunity.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600">
                    View details
                  </Link>
                  {opportunity.officialUrl ? (
                    <a href={opportunity.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                      Official link
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-[1680px] px-6 py-6 text-sm text-gray-500 xl:px-8">Loading opportunities...</div>}>
      <OpportunitiesPageContent />
    </Suspense>
  );
}
