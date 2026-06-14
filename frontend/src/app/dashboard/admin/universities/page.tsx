'use client';
import { useQuery } from '@tanstack/react-query';
import { universitiesApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function AdminUniversitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-universities'],
    queryFn: () => universitiesApi.list({ perPage: 25 }),
  });
  const result = data as any;
  const rows = result?.data || [];

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Universities</h1>
        <p className="mt-1 text-sm text-gray-500">Institution records currently powering search filters and scholarship data.</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">University</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">QS Rank</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600">{row.country?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-600">{row.city || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-600">{row.type}</td>
                  <td className="px-4 py-3 text-gray-600">{row.qsRanking || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
