'use client';

import { Suspense, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProfessors, useCountries, useResearchAreas, useUniversities } from '@/lib/hooks';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Users, Star, ChevronLeft, ChevronRight,
  MapPin, GraduationCap, BookOpen, Award, Loader2, X,
} from 'lucide-react';
import { cn, POSITION_LABELS, ACCEPTING_LABELS, formatCredits } from '@/lib/utils';
import { favoritesApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

function ProfessorsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const [showFilters, setShowFilters] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const params = {
    q: searchParams.get('q') || '',
    countryId: searchParams.get('countryId') || '',
    universityId: searchParams.get('universityId') || '',
    researchAreaId: searchParams.get('researchAreaId') || '',
    acceptingStudents: searchParams.get('acceptingStudents') || '',
    fundingStatus: searchParams.get('fundingStatus') || '',
    position: searchParams.get('position') || '',
    page: parseInt(searchParams.get('page') || '1'),
    perPage: 20,
    sortBy: searchParams.get('sortBy') || 'hIndex',
  };

  const { data, isLoading } = useProfessors(params);
  const { data: countries } = useCountries();
  const { data: researchAreas } = useResearchAreas();
  const { data: universities } = useUniversities({
    countryId: params.countryId || undefined,
    perPage: 100,
  });

  const result = data as any;
  const professors = result?.data || [];
  const meta = result?.meta || { total: 0, lastPage: 1, page: 1 };

  const updateParam = useCallback((key: string, value: string) => {
    const current = new URLSearchParams(searchParams.toString());
    if (value) current.set(key, value); else current.delete(key);
    if (key !== 'page') current.delete('page');
    router.push(`/professors?${current.toString()}`);
  }, [searchParams, router]);

  const handleSave = async (professorId: string) => {
    setSavingId(professorId);
    try {
      await favoritesApi.save(professorId);
      qc.invalidateQueries({ queryKey: ['favorites'] });
    } catch (e: any) {
      if (e.response?.status === 401) router.push('/login');
    } finally {
      setSavingId(null);
    }
  };

  const FilterPanel = () => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4" /> Filters
      </h3>

      {/* Country */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Country</label>
        <select value={params.countryId} onChange={e => updateParam('countryId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Countries</option>
          {(countries as any[])?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.flagEmoji} {c.name}</option>
          ))}
        </select>
      </div>

      {/* Research Area */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Research Area</label>
        <select value={params.researchAreaId} onChange={e => updateParam('researchAreaId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Areas</option>
          {(researchAreas as any[])?.map((r: any) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">University</label>
        <select value={params.universityId} onChange={e => updateParam('universityId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Universities</option>
          {((universities as any)?.data || []).map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Accepting students */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Accepting Students</label>
        <div className="space-y-2">
          {[{ v: '', l: 'All' }, { v: 'yes', l: '✅ Yes' }, { v: 'no', l: '❌ No' }, { v: 'unknown', l: '❓ Unknown' }].map(({ v, l }) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="accepting" value={v} checked={params.acceptingStudents === v} onChange={() => updateParam('acceptingStudents', v)}
                className="text-blue-600" />
              <span className="text-sm text-gray-700">{l}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Funding */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Funding Status</label>
        <select value={params.fundingStatus} onChange={e => updateParam('fundingStatus', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Any</option>
          <option value="funded">Funded</option>
          <option value="unfunded">Unfunded</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sort By</label>
        <select value={params.sortBy} onChange={e => updateParam('sortBy', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="hIndex">H-Index</option>
          <option value="citations">Citations</option>
          <option value="name">Name</option>
        </select>
      </div>

      <button onClick={() => router.push('/professors')}
        className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
        Reset Filters
      </button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Discover Professors</h1>
        <p className="text-gray-500 text-sm">Find the right professor for your research interests</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search professors by name, research area..."
            defaultValue={params.q}
            onKeyDown={e => { if (e.key === 'Enter') updateParam('q', (e.target as HTMLInputElement).value); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {params.q && (
            <button onClick={() => updateParam('q', '')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={cn('lg:hidden px-4 py-2.5 border rounded-xl flex items-center gap-2 text-sm font-medium transition',
            showFilters ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters — desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterPanel />
        </aside>

        {/* Mobile filters */}
        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40 flex items-end">
            <div className="bg-white w-full max-h-[80vh] overflow-y-auto rounded-t-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Filters</h3>
                <button onClick={() => setShowFilters(false)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <FilterPanel />
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading...' : `${meta.total.toLocaleString()} professors found`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : professors.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700 mb-1">No professors found</h3>
              <p className="text-sm text-gray-400 mb-4">Try adjusting your search filters</p>
              <button onClick={() => router.push('/professors')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {professors.map((prof: any) => {
                const accepting = ACCEPTING_LABELS[prof.acceptingStudents] || ACCEPTING_LABELS.unknown;
                return (
                  <div key={prof.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition group relative">
                    <button
                      onClick={() => handleSave(prof.id)}
                      disabled={savingId === prof.id}
                      className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-yellow-50 transition"
                    >
                      {savingId === prof.id
                        ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        : <Star className="w-4 h-4 text-gray-300 hover:text-yellow-500 transition" />}
                    </button>

                    <Link href={`/professors/${prof.id}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {prof.fullName[0]}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition line-clamp-1">
                            {prof.fullName}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {POSITION_LABELS[prof.position] || prof.position || 'Professor'}
                          </p>
                          {prof.matchScore?.score != null && (
                            <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Match {prof.matchScore.score}/100
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mb-3">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-600 truncate">{prof.university?.name}</p>
                        {prof.university?.country?.flagEmoji && (
                          <span className="text-sm ml-auto flex-shrink-0">{prof.university.country.flagEmoji}</span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex gap-3 mb-3">
                        {prof.hIndex != null && (
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-900">{prof.hIndex}</p>
                            <p className="text-xs text-gray-400">h-index</p>
                          </div>
                        )}
                        {prof.publicationsCount != null && (
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-900">{prof.publicationsCount}</p>
                            <p className="text-xs text-gray-400">papers</p>
                          </div>
                        )}
                        {prof.citationsCount != null && (
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-900">{prof.citationsCount >= 1000 ? `${Math.round(prof.citationsCount/1000)}k` : prof.citationsCount}</p>
                            <p className="text-xs text-gray-400">citations</p>
                          </div>
                        )}
                      </div>

                      {/* Research areas */}
                      {prof.researchAreas?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {prof.researchAreas.slice(0, 3).map((ra: any) => (
                            <span key={ra.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                              {ra.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', accepting.color)}>
                          {accepting.label}
                        </span>
                        {prof.hasVerifiedEmail && (
                          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
                            ✓ Email verified
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {meta.lastPage > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {meta.page} of {meta.lastPage} ({meta.total.toLocaleString()} results)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => updateParam('page', String(meta.page - 1))}
                  disabled={meta.page <= 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateParam('page', String(meta.page + 1))}
                  disabled={meta.page >= meta.lastPage}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfessorsPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-[1680px] px-6 py-6 text-sm text-gray-500 xl:px-8">Loading...</div>}>
      <ProfessorsPageContent />
    </Suspense>
  );
}
