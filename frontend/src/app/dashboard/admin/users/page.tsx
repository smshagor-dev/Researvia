'use client';
import { useState } from 'react';
import { useAdminUsers } from '@/lib/hooks';
import { adminApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Loader2, ChevronLeft, ChevronRight, Ban, Coins, SquareArrowOutUpRight } from 'lucide-react';
import { cn, formatDate, formatCredits } from '@/lib/utils';

const ROLE_COLORS: Record<string,string> = {
  user: 'bg-gray-100 text-gray-700',
  admin: 'bg-blue-100 text-blue-700',
  super_admin: 'bg-red-100 text-red-700',
};
const STATUS_COLORS: Record<string,string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  deleted: 'bg-red-100 text-red-600',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useAdminUsers({ search, page, perPage: 25 });
  const result = data as any;
  const users = result?.data || [];
  const meta = result?.meta || { total: 0, lastPage: 1 };

  const handleRoleChange = async (id: string, role: string) => {
    await adminApi.updateRole(id, role);
    qc.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await adminApi.updateStatus(id, newStatus);
    qc.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const handleAdjustCredits = async (id: string) => {
    const amount = parseInt(prompt('Credit adjustment (positive or negative):') || '0');
    const description = prompt('Reason:') || 'Admin adjustment';
    if (!amount) return;
    await adminApi.adjustCredits(id, amount, description);
    qc.invalidateQueries({ queryKey: ['admin-users'] });
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isError ? 'Could not load users' : `${meta.total.toLocaleString()} total users`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && <span className="text-xs text-gray-400">Refreshing...</span>}
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Refresh
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search users..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : isError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-red-600">Failed to load users.</p>
            <p className="mt-2 text-xs text-gray-500">{(error as any)?.response?.data?.error?.message || (error as any)?.message || 'Unknown error'}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-700">No users found.</p>
            <p className="mt-2 text-xs text-gray-500">Try clearing the search filter or refresh the table.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['User','Role','Status','Plan','Credits','Last Login','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.fullName?.[0] || u.email?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.fullName}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                      className={cn('text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none cursor-pointer', ROLE_COLORS[u.role] || 'bg-gray-100')}>
                      {['user','admin','super_admin'].map(r => <option key={r} value={r} className="text-gray-900 bg-white">{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', STATUS_COLORS[u.status] || 'bg-gray-100')}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600 capitalize">{u.subscriptions?.[0]?.plan?.name || 'Free'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-700">{formatCredits(u.credits?.balance || 0)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/admin/users/${u.id}`}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition"
                        title="Open full user detail"
                      >
                        <SquareArrowOutUpRight className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                      </Link>
                      <button onClick={() => handleStatusToggle(u.id, u.status)}
                        className="p-1.5 hover:bg-yellow-50 rounded-lg transition" title="Toggle status">
                        <Ban className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                      </button>
                      <button onClick={() => handleAdjustCredits(u.id)}
                        className="p-1.5 hover:bg-green-50 rounded-lg transition" title="Adjust credits">
                        <Coins className="w-4 h-4 text-gray-400 hover:text-green-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta.lastPage > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {meta.lastPage}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p-1)} disabled={page <= 1} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => p+1)} disabled={page >= meta.lastPage} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
