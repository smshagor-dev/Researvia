'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export default function VerificationPage() {
  const qc = useQueryClient();
  const [processingId, setProcessingId] = useState<string|null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pending-verifications'],
    queryFn: () => api.get('/professor-emails/pending').then(r => (r.data as any)?.data || r.data),
  });

  const items = (data as any)?.data || data || [];
  const meta = (data as any)?.meta || {};

  const handleVerify = async (emailId: string, approve: boolean, reason?: string) => {
    setProcessingId(emailId);
    try {
      await api.post(`/professor-emails/${emailId}/verify`, { approve, rejectReason: reason });
      qc.invalidateQueries({ queryKey: ['pending-verifications'] });
    } finally { setProcessingId(null); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-500" /> Email Verification Queue
        </h1>
        <p className="text-gray-500 text-sm mt-1">{meta.total || items.length} pending verifications</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700">All caught up!</h3>
          <p className="text-sm text-gray-400">No pending email verifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-sm font-semibold text-gray-900">{item.email}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                      item.verificationStatus === 'manual_review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
                      {item.verificationStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{item.professor?.fullName} · {item.professor?.university?.name}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span className={item.domainMatch ? 'text-green-600 font-medium' : 'text-red-500'}>
                      {item.domainMatch ? '✓ Domain match' : '✗ Domain mismatch'}
                    </span>
                    {item.mxValid !== null && (
                      <span className={item.mxValid ? 'text-green-600 font-medium' : 'text-red-500'}>
                        {item.mxValid ? '✓ MX valid' : '✗ MX invalid'}
                      </span>
                    )}
                    <span>Added {formatDate(item.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleVerify(item.id, false, prompt('Rejection reason:') || 'Not verified')}
                    disabled={processingId === item.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition disabled:opacity-50">
                    {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerify(item.id, true)}
                    disabled={processingId === item.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 text-sm font-medium rounded-lg hover:bg-green-100 transition disabled:opacity-50">
                    {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
