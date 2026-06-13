'use client';
import { useSavedScholarships } from '@/lib/hooks';
import { scholarshipsApi } from '@/lib/api';
import Link from 'next/link';
import { Bookmark, Trash2, ExternalLink, Loader2, BookOpen } from 'lucide-react';
import { cn, formatDeadline, FUNDING_TYPE_LABELS, DEGREE_LEVEL_LABELS } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const APP_STATUSES = ['saved','applied','accepted','rejected'];
const STATUS_COLORS: Record<string,string> = { saved:'bg-gray-100 text-gray-600', applied:'bg-blue-100 text-blue-700', accepted:'bg-green-100 text-green-700', rejected:'bg-red-100 text-red-600' };

export default function SavedScholarshipsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useSavedScholarships();
  const items = (data as any)?.data || [];
  const [updatingId, setUpdatingId] = useState<string|null>(null);

  const handleStatusChange = async (schId: string, status: string) => {
    setUpdatingId(schId);
    try {
      await scholarshipsApi.updateSavedStatus(schId, { applicationStatus: status });
      qc.invalidateQueries({ queryKey: ['saved-scholarships'] });
    } finally { setUpdatingId(null); }
  };

  const handleRemove = async (schId: string) => {
    if (!confirm('Remove this scholarship?')) return;
    await scholarshipsApi.unsave(schId);
    qc.invalidateQueries({ queryKey: ['saved-scholarships'] });
  };

  const stats = APP_STATUSES.reduce((acc, s) => ({ ...acc, [s]: items.filter((i:any) => i.applicationStatus === s).length }), {} as Record<string,number>);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-blue-500" /> Saved Scholarships
        </h1>
        <p className="text-gray-500 text-sm mt-1">Track your scholarship applications</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {APP_STATUSES.map(s => (
          <div key={s} className={cn('rounded-xl p-3 text-center', STATUS_COLORS[s])}>
            <p className="text-2xl font-bold">{stats[s] || 0}</p>
            <p className="text-xs font-medium capitalize mt-0.5">{s}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">No saved scholarships</h3>
          <Link href="/scholarships" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition inline-block mt-2">
            Browse Scholarships
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => {
            const s = item.scholarship;
            const deadline = formatDeadline(s.deadline);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/scholarships/${s.id}`} className="font-semibold text-sm text-gray-900 hover:text-blue-600 transition truncate block">{s.title}</Link>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {s.country && <span className="text-xs text-gray-400">{s.country.flagEmoji} {s.country.name}</span>}
                    <span className="text-xs text-gray-400">{FUNDING_TYPE_LABELS[s.fundingType] || s.fundingType}</span>
                    <span className={cn('text-xs font-medium', deadline.color)}>{deadline.text}</span>
                  </div>
                </div>
                <select value={item.applicationStatus} onChange={e => handleStatusChange(s.id, e.target.value)}
                  disabled={updatingId === s.id}
                  className={cn('text-xs font-medium px-2 py-1.5 rounded-lg border-0 focus:outline-none cursor-pointer', STATUS_COLORS[item.applicationStatus] || 'bg-gray-100 text-gray-600')}>
                  {APP_STATUSES.map(st => <option key={st} value={st} className="text-gray-900 bg-white capitalize">{st}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <a href={s.officialUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-blue-50 rounded-lg transition">
                    <ExternalLink className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                  </a>
                  <button onClick={() => handleRemove(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
