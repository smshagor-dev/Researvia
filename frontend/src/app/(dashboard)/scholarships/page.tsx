'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Bookmark, ExternalLink, Loader2, Search } from 'lucide-react';
import { scholarshipsApi } from '@/lib/api';
import { useCountries, useScholarships } from '@/lib/hooks';
import { DEGREE_LEVEL_LABELS, FUNDING_TYPE_LABELS, formatDeadline } from '@/lib/utils';

const FUNDING_TYPES = ['scholarship', 'grant', 'assistantship', 'fellowship', 'internship', 'exchange'];
const DEGREE_LEVELS = ['bachelor', 'master', 'phd', 'postdoc', 'mixed'];

function ScholarshipsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

  const params = {
    q: searchParams.get('q') || '',
    countryId: searchParams.get('countryId') || '',
    fundingType: searchParams.get('fundingType') || '',
    degreeLevel: searchParams.get('degreeLevel') || '',
    fullyFunded: searchParams.get('fullyFunded') || '',
    researchArea: searchParams.get('researchArea') || '',
    deadlineTo: searchParams.get('deadlineTo') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: Number(searchParams.get('page') || '1'),
    perPage: 20,
  };

  const { data, isLoading } = useScholarships(params);
  const { data: countries } = useCountries();
  const result = data as any;
  const scholarships = result?.data || [];
  const meta = result?.meta || { page: 1, lastPage: 1, total: 0 };

  const updateParam = useCallback((key: string, value: string) => {
    const current = new URLSearchParams(searchParams.toString());
    if (value) current.set(key, value);
    else current.delete(key);
    if (key !== 'page') current.delete('page');
    router.push(`/scholarships?${current.toString()}`);
  }, [router, searchParams]);

  const handleSave = async (scholarshipId: string) => {
    setSavingId(scholarshipId);
    try {
      await scholarshipsApi.save(scholarshipId);
      qc.invalidateQueries({ queryKey: ['saved-scholarships'] });
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Scholarship Discovery</h1>
        <p className="text-sm text-gray-500">Trusted funding opportunities with deadlines, eligibility, and official application links.</p>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[2fr,repeat(5,minmax(0,1fr))]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            defaultValue={params.q}
            placeholder="Search title or provider..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') updateParam('q', (event.target as HTMLInputElement).value);
            }}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
        <select value={params.countryId} onChange={(event) => updateParam('countryId', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="">All Countries</option>
          {(countries as any[])?.map((country: any) => (
            <option key={country.id} value={country.id}>{country.flagEmoji} {country.name}</option>
          ))}
        </select>
        <select value={params.degreeLevel} onChange={(event) => updateParam('degreeLevel', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="">All Degrees</option>
          {DEGREE_LEVELS.map((value) => (
            <option key={value} value={value}>{DEGREE_LEVEL_LABELS[value]}</option>
          ))}
        </select>
        <select value={params.fundingType} onChange={(event) => updateParam('fundingType', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="">All Types</option>
          {FUNDING_TYPES.map((value) => (
            <option key={value} value={value}>{FUNDING_TYPE_LABELS[value]}</option>
          ))}
        </select>
        <select value={params.fullyFunded} onChange={(event) => updateParam('fullyFunded', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="">All Funding Coverage</option>
          <option value="true">Fully Funded</option>
          <option value="false">Not Fully Funded</option>
        </select>
        <select value={params.sortBy} onChange={(event) => updateParam('sortBy', event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="newest">Newest</option>
          <option value="deadline">Deadline</option>
          <option value="fundingAmount">Funding Amount</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <input
          type="text"
          defaultValue={params.researchArea}
          placeholder="Research area"
          onKeyDown={(event) => {
            if (event.key === 'Enter') updateParam('researchArea', (event.target as HTMLInputElement).value);
          }}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
        />
        <input
          type="date"
          value={params.deadlineTo}
          onChange={(event) => updateParam('deadlineTo', event.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
        />
        <span>{isLoading ? 'Loading...' : `${meta.total?.toLocaleString?.() || 0} opportunities found`}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {scholarships.map((scholarship: any) => {
            const deadline = formatDeadline(scholarship.deadline);
            return (
              <div key={scholarship.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/scholarships/${scholarship.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                      {scholarship.title}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500">{scholarship.providerName || scholarship.university?.name || 'Funding Opportunity'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(scholarship.id)}
                    disabled={savingId === scholarship.id}
                    className="rounded-lg p-2 hover:bg-blue-50"
                  >
                    {savingId === scholarship.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Bookmark className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {scholarship.matchScore?.score != null ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Match {scholarship.matchScore.score}/100
                    </span>
                  ) : null}
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {FUNDING_TYPE_LABELS[scholarship.fundingType] || scholarship.fundingType}
                  </span>
                  {scholarship.degreeLevel ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {DEGREE_LEVEL_LABELS[scholarship.degreeLevel] || scholarship.degreeLevel}
                    </span>
                  ) : null}
                  {scholarship.isFullyFunded ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Fully Funded</span>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>{scholarship.country?.flagEmoji} {scholarship.country?.name || 'Global'}</p>
                  <p>{scholarship.fundingAmount ? `${scholarship.currency || ''} ${Number(scholarship.fundingAmount).toLocaleString()}` : 'Funding amount varies'}</p>
                  <p className={deadline.color}>{deadline.text}</p>
                </div>

                <p className="mt-4 line-clamp-3 flex-1 text-sm text-gray-500">{scholarship.description || scholarship.eligibilityCriteria || 'Official funding details available on the scholarship page.'}</p>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                  <Link href={`/scholarships/${scholarship.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600">
                    View details
                  </Link>
                  <a
                    href={scholarship.applicationUrl || scholarship.officialSourceUrl || scholarship.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
                  >
                    Official link
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta.lastPage > 1 ? (
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-6 text-sm text-gray-600">
          <p>Page {meta.page} of {meta.lastPage}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => updateParam('page', String(Math.max(1, meta.page - 1)))} disabled={meta.page <= 1} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50">
              Previous
            </button>
            <button type="button" onClick={() => updateParam('page', String(meta.page + 1))} disabled={meta.page >= meta.lastPage} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ScholarshipsPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-[1680px] px-6 py-6 text-sm text-gray-500 xl:px-8">Loading scholarships...</div>}>
      <ScholarshipsPageContent />
    </Suspense>
  );
}
