'use client';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => adminApi.getAuditLogs({ perPage: 50 }),
  });
  const result = data as any;
  const rows = result?.data || [];

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">Track admin and system-level changes across the platform.</p>
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
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.action}</td>
                  <td className="px-4 py-3 text-gray-600">{row.actorType}{row.actorId ? `:${row.actorId}` : ''}</td>
                  <td className="px-4 py-3 text-gray-600">{row.entityType || 'N/A'}{row.entityId ? `:${row.entityId}` : ''}</td>
                  <td className="px-4 py-3 text-gray-600">{row.ipAddress || 'N/A'}</td>
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
