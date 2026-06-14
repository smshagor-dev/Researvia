'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bookmark, ExternalLink, Loader2 } from 'lucide-react';
import { scholarshipsApi } from '@/lib/api';
import { useScholarship } from '@/lib/hooks';
import { DEGREE_LEVEL_LABELS, FUNDING_TYPE_LABELS, formatDate, formatDeadline } from '@/lib/utils';

export default function ScholarshipDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useScholarship(params.id);
  const scholarship = data as any;
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await scholarshipsApi.save(params.id);
      qc.invalidateQueries({ queryKey: ['saved-scholarships'] });
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!scholarship) {
    return <div className="px-6 py-10 text-sm text-gray-500">Scholarship not found.</div>;
  }

  const deadline = formatDeadline(scholarship.deadline);
  const officialLink = scholarship.applicationUrl || scholarship.officialSourceUrl || scholarship.officialUrl;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-6 xl:px-8">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">{scholarship.providerName || scholarship.university?.name || 'Scholarship Provider'}</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">{scholarship.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {scholarship.matchScore?.score != null ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Match {scholarship.matchScore.score}/100
                </span>
              ) : null}
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {FUNDING_TYPE_LABELS[scholarship.fundingType] || scholarship.fundingType}
              </span>
              {scholarship.degreeLevel ? (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {DEGREE_LEVEL_LABELS[scholarship.degreeLevel] || scholarship.degreeLevel}
                </span>
              ) : null}
              {scholarship.isFullyFunded ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Fully Funded</span> : null}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
              Save Scholarship
            </button>
            <a href={officialLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              Official Link
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase text-gray-500">Deadline</p>
            <p className={`mt-2 text-lg font-semibold ${deadline.color}`}>{deadline.text}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase text-gray-500">Funding</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {scholarship.fundingAmount ? `${scholarship.currency || ''} ${Number(scholarship.fundingAmount).toLocaleString()}` : 'See official source'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase text-gray-500">Country</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{scholarship.country?.name || 'Global'}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr,0.7fr]">
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">{scholarship.description || 'Official scholarship details are available on the provider page.'}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">Eligibility</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">{scholarship.eligibilityCriteria || scholarship.eligibility || 'See official link for eligibility requirements.'}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">Required Documents</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {(scholarship.requiredDocuments || []).length ? (
                  (scholarship.requiredDocuments as string[]).map((document) => (
                    <span key={document} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{document}</span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">See the official source for document requirements.</p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900">Deadlines</h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>Open: {scholarship.applicationOpenDate ? formatDate(scholarship.applicationOpenDate) : 'Not specified'}</p>
                <p>Close: {scholarship.applicationCloseDate ? formatDate(scholarship.applicationCloseDate) : scholarship.deadline ? formatDate(scholarship.deadline) : 'Not specified'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900">Research Areas</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(scholarship.researchAreas || []).length ? (
                  (scholarship.researchAreas as string[]).map((area) => (
                    <span key={area} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{area}</span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No research area metadata available.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900">AI Fit Analysis</h3>
              {scholarship.matchScore ? (
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{scholarship.matchScore.aiSummary || scholarship.matchScore.explanation}</p>
                  {(scholarship.matchScore.strengths || []).slice(0, 3).map((item: string) => (
                    <p key={item}>• {item}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">Match analysis will appear after your background has been processed.</p>
              )}
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900">Traceability</h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>Source type: {scholarship.sourceType}</p>
                <p>Verification: {scholarship.verificationStatus}</p>
                <p>Last synced: {scholarship.lastSyncedAt ? formatDate(scholarship.lastSyncedAt) : 'Never'}</p>
              </div>
              <Link href="/saved/scholarships" className="mt-4 inline-block text-sm font-semibold text-blue-600">
                View saved scholarships
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
