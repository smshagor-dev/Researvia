'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Loader2, Search } from 'lucide-react';

export default function AdminStudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-students', search],
    queryFn: () => adminApi.getStudents({ search, perPage: 50 }),
  });

  const rows = (data as any)?.data || [];

  const updateStatus = async (id: string, status: string) => {
    await adminApi.updateStudentStatus(id, status);
    await qc.invalidateQueries({ queryKey: ['admin-students'] });
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Students</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Review onboarding progress and student profile quality.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." className="w-64 rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Degree</th>
                <th className="px-4 py-3">Completeness</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id} className="border-b border-gray-50 dark:border-slate-800">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{row.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{row.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.currentCountry}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.education?.degreeLevel || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{row.profileCompleteness}%</td>
                  <td className="px-4 py-3">
                    <select value={row.user?.status} onChange={(e) => updateStatus(row.user.id, e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      {['active', 'suspended', 'deleted'].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
