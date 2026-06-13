'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

export default function AdminImportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-imports'],
    queryFn: () => api.get('/admin/imports').then(r => r.data).catch(() => ({})),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 capitalize mb-6">imports</h1>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <pre className="text-xs text-gray-600 overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
