'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { useScholarships, useCountries } from '@/lib/hooks';
import { scholarshipsApi } from '@/lib/api';
import Link from 'next/link';
import {
  Search, BookOpen, ChevronLeft, ChevronRight, Bookmark,
  ExternalLink, Loader2, SlidersHorizontal, X,
} from 'lucide-react';
import { cn, FUNDING_TYPE_LABELS, DEGREE_LEVEL_LABELS, formatDeadline } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

function ScholarshipsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const params = {
    q: searchParams.get('q') || '',
    countryId: searchParams.get('countryId') || '',
    fundingType: searchParams.get('fundingType') || '',
    degreeLevel: searchParams.get('degreeLevel') || '',
    page: parseInt(searchParams.get('page') || '1'),
    perPage: 20,
  };

  const { data, isLoading } = useScholarships(params);
  const { data: countries } = useCountries();

  const result = data as any;
  const scholarships = result?.data || [];
  const meta = result?.meta || { total: 0, lastPage: 1, page: 1 };

  const updateParam = useCallback((key: string, value: string) => {
    const current = new URLSearchParams(searchParams.toString());
    if (value) current.set(key, value); else current.delete(key);
    if (key !== 'page') current.delete('page');
    router.push(`/scholarships?${current.toString()}`);
  }, [searchParams, router]);

  const handleSave = async (scholarshipId: string) => {
    setSavingId(scholarshipId);
    try {
      await scholarshipsApi.save(scholarshipId);
      qc.invalidateQueries({ queryKey: ['saved-scholarships'] });
    } catch (e: any) {
      if (e.response?.status === 401) router.push('/login');
    } finally {
      setSavingId(null);
    }
  };

  const FUNDING_COLORS: Record<string, string> = {
    fully_funded: 'bg-green-50 text-green-700 border-green-200',
    partially_funded: 'bg-blue-50 text-blue-700 border-blue-200',
    stipend_only: 'bg-purple-50 text-purple-700 border-purple-200',
    tuition_only: 'bg-orange-50 text-orange-700 border-orange-200',
    other: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Scholarship Database</h1>
        <p className="text-gray-500 text-sm">Find funded opportunities matching your profile</p>
      </div>

      {/* Search + filters bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search scholarships..."
            defaultValue={params.q}
            onKeyDown={e => { if (e.key === 'Enter') updateParam('q', (e.target as HTMLInputElement).value); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <select value={params.fundingType} onChange={e => updateParam('fundingType', e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Funding</option>
          {Object.entries(FUNDING_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={params.degreeLevel} onChange={e => updateParam('degreeLevel', e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Degrees</option>
          {Object.entries(DEGREE_LEVEL_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={params.countryId} onChange={e => updateParam('countryId', e.target.value)}
          className="hidden sm:block px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Countries</option>
          {(countries as any[])?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.flagEmoji} {c.name}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        {isLoading ? 'Loading...' : `${meta.total.toLocaleString()} scholarships found`}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : scholarships.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">No scholarships found</h3>
          <p className="text-sm text-gray-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scholarships.map((s: any) => {
            const deadline = formatDeadline(s.deadline);
            const degreeLevels: string[] = s.degreeLevels || [];
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition group relative flex flex-col">
                <button
                  onClick={() => handleSave(s.id)}
                  disabled={savingId === s.id}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-blue-50 transition"
                >
                  {savingId === s.id
                    ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    : <Bookmark className="w-4 h-4 text-gray-300 hover:text-blue-500 transition" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-3 pr-8">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <Link href={`/scholarships/${s.id}`}>
                        <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition line-clamp-2 leading-tight">
                          {s.title}
                        </h3>
                      </Link>
                      {s.university && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.university.name}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', FUNDING_COLORS[s.fundingType] || FUNDING_COLORS.other)}>
                      {FUNDING_TYPE_LABELS[s.fundingType] || s.fundingType}
                    </span>
                    {degreeLevels.slice(0, 2).map((d: string) => (
                      <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">
                        {DEGREE_LEVEL_LABELS[d] || d}
                      </span>
                    ))}
                    {s.country && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200 font-medium">
                        {s.country.flagEmoji} {s.country.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className={cn('text-xs font-semibold', deadline.color)}>
                    📅 {deadline.text}
                  </span>
                  <a href={s.officialUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Apply <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.lastPage > 1 && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">Page {meta.page} of {meta.lastPage}</p>
          <div className="flex gap-2">
            <button onClick={() => updateParam('page', String(meta.page - 1))} disabled={meta.page <= 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => updateParam('page', String(meta.page + 1))} disabled={meta.page >= meta.lastPage}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScholarshipsPage() {
  return (
    <Suspense fallback={<div className="p-6 max-w-7xl mx-auto text-sm text-gray-500">Loading...</div>}>
      <ScholarshipsPageContent />
    </Suspense>
  );
}
