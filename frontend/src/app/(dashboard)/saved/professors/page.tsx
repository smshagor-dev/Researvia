'use client';
import { useState } from 'react';
import { useFavorites } from '@/lib/hooks';
import { favoritesApi } from '@/lib/api';
import Link from 'next/link';
import { Star, Trash2, ExternalLink, Loader2, Users } from 'lucide-react';
import { cn, ACCEPTING_LABELS } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

const STATUSES = ['saved','contacted','replied','rejected','accepted'];
const STATUS_COLORS: Record<string,string> = {
  saved:'bg-gray-100 text-gray-700',
  contacted:'bg-blue-100 text-blue-700',
  replied:'bg-green-100 text-green-700',
  rejected:'bg-red-100 text-red-700',
  accepted:'bg-purple-100 text-purple-700',
};

export default function SavedProfessorsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useFavorites();
  const favorites = (data as any)?.data || [];
  const [updatingId, setUpdatingId] = useState<string|null>(null);
  const [sortBy, setSortBy] = useState<'savedAt' | 'matchScore'>('savedAt');
  const sortedFavorites = [...favorites].sort((a: any, b: any) => {
    if (sortBy === 'matchScore') {
      return (b.professor?.matchScore?.score || 0) - (a.professor?.matchScore?.score || 0);
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const handleStatusChange = async (professorId: string, status: string) => {
    setUpdatingId(professorId);
    try {
      await favoritesApi.updateStatus(professorId, status);
      qc.invalidateQueries({ queryKey: ['favorites'] });
    } finally { setUpdatingId(null); }
  };

  const handleRemove = async (professorId: string) => {
    if (!confirm('Remove this professor from saved?')) return;
    await favoritesApi.remove(professorId);
    qc.invalidateQueries({ queryKey: ['favorites'] });
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500" /> Saved Professors
        </h1>
        <p className="text-gray-500 text-sm mt-1">Track your professor outreach pipeline</p>
      </div>

      {/* Kanban-style status summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {STATUSES.map(s => {
          const count = favorites.filter((f:any) => f.status === s).length;
          return (
            <div key={s} className={cn('rounded-xl p-3 text-center', STATUS_COLORS[s] || 'bg-gray-100')}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium capitalize mt-0.5">{s}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex justify-end">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="savedAt">Sort by Saved</option>
          <option value="matchScore">Sort by Match Score</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">No saved professors</h3>
          <p className="text-sm text-gray-400 mb-4">Save professors from the discovery page</p>
          <Link href="/professors" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            Discover Professors
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Professor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">University</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Research Areas</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedFavorites.map((fav: any) => {
                const p = fav.professor;
                return (
                  <tr key={fav.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {p.fullName[0]}
                        </div>
                        <div>
                          <Link href={`/professors/${p.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition">
                            {p.fullName}
                          </Link>
                          {p.matchScore?.score != null && <p className="text-xs font-semibold text-emerald-600 mt-0.5">Match {p.matchScore.score}/100</p>}
                          {fav.note && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{fav.note}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-sm text-gray-600 truncate max-w-[200px]">{p.university?.name}</p>
                      {p.university?.country?.flagEmoji && (
                        <p className="text-xs text-gray-400">{p.university.country.flagEmoji} {p.university.country.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={fav.status}
                        disabled={updatingId === p.id}
                        onChange={e => handleStatusChange(p.id, e.target.value)}
                        className={cn('text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer', STATUS_COLORS[fav.status] || 'bg-gray-100')}
                      >
                        {STATUSES.map(s => <option key={s} value={s} className="text-gray-900 bg-white capitalize">{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(p.researchAreas || []).slice(0,2).map((ra: any) => (
                          <span key={ra.researchArea?.id || ra.id} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                            {ra.researchArea?.name || ra.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/professors/${p.id}`} className="p-1.5 hover:bg-blue-50 rounded-lg transition" title="View profile">
                          <ExternalLink className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                        </Link>
                        <button onClick={() => handleRemove(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition" title="Remove">
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
