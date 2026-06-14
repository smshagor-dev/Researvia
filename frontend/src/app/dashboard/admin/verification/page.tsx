'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminProfessorsApi } from '@/lib/api';
import { CheckCircle, ExternalLink, Eye, Loader2, Shield, XCircle } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export default function VerificationPage() {
  const qc = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pending-verifications'],
    queryFn: () => adminProfessorsApi.getPendingEmails({ page: 1, perPage: 50 }),
    refetchInterval: 15000,
  });

  const items = (data as any)?.data || [];
  const meta = (data as any)?.meta || {};

  const runAction = async (emailId: string, action: 'approve' | 'reject' | 'review') => {
    setProcessingId(emailId);
    try {
      if (action === 'approve') {
        await adminProfessorsApi.approveEmail(emailId);
      } else if (action === 'reject') {
        const reason = prompt('Rejection reason:') || 'Rejected by admin';
        await adminProfessorsApi.rejectEmail(emailId, reason);
      } else {
        await adminProfessorsApi.requestEmailReview(emailId);
      }
      qc.invalidateQueries({ queryKey: ['pending-verifications'] });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-blue-500" /> Email Verification Queue
          </h1>
          <p className="mt-1 text-sm text-gray-500">{meta.total || items.length} pending or reviewable academic emails</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-20 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-400" />
          <h3 className="font-semibold text-gray-700">All caught up</h3>
          <p className="text-sm text-gray-400">No pending email verifications</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Professor</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Domain Match</th>
                <th className="px-4 py-3">MX</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-50 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.professor?.fullName || 'Professor'}</p>
                    <p className="text-xs text-gray-500">{item.professor?.university?.name || 'University unavailable'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm text-gray-900">{item.email}</p>
                    <p className="text-xs text-gray-500">Added {formatDate(item.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="capitalize text-gray-700">{String(item.sourceType || 'manual').replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{item.sourceDomain || 'Unknown domain'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={item.domainMatched ? 'font-medium text-green-600' : 'font-medium text-red-500'}>
                      {item.domainMatched ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={item.mxValid ? 'font-medium text-green-600' : 'font-medium text-red-500'}>
                      {item.mxValid ? 'Valid' : 'Invalid'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.confidenceScore}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium capitalize',
                        item.verificationStatus === 'manual_review'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-700',
                      )}
                    >
                      {item.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open Source Page
                        </a>
                      ) : null}
                      <button
                        onClick={() => runAction(item.id, 'review')}
                        disabled={processingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-50"
                      >
                        {processingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                        Review
                      </button>
                      <button
                        onClick={() => runAction(item.id, 'reject')}
                        disabled={processingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50"
                      >
                        {processingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        Reject
                      </button>
                      <button
                        onClick={() => runAction(item.id, 'approve')}
                        disabled={processingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 disabled:opacity-50"
                      >
                        {processingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
