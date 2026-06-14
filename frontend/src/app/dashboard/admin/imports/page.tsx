'use client';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Loader2, Upload } from 'lucide-react';

export default function AdminImportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-imports'],
    queryFn: () => adminApi.getImports({ perPage: 50 }),
  });
  const result = data as any;
  const rows = result?.data || [];

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Upload className="h-6 w-6 text-red-500" />
          Imports
        </h1>
        <p className="mt-1 text-sm text-gray-500">Track professor, university, scholarship, and research area imports.</p>
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
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rows</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.type}</td>
                  <td className="px-4 py-3 text-gray-600">{row.source}</td>
                  <td className="px-4 py-3 text-gray-600">{row.status}</td>
                  <td className="px-4 py-3 text-gray-600">{row.processedRows} / {row.totalRows}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
