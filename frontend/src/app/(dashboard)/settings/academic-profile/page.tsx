'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAcademicProfile, useAcademicProfileUpdate, useParseCv, useRefreshMatches } from '@/lib/hooks';
import { Loader2, RefreshCcw, Sparkles } from 'lucide-react';

export default function AcademicProfilePage() {
  const { data, isLoading } = useAcademicProfile();
  const updateProfile = useAcademicProfileUpdate();
  const parseCv = useParseCv();
  const refreshMatches = useRefreshMatches();
  const profile = (data as any) || {};

  const [form, setForm] = useState<any>({
    currentDegreeLevel: profile.currentDegreeLevel || '',
    currentUniversity: profile.currentUniversity || '',
    currentDepartment: profile.currentDepartment || '',
    targetDegree: profile.targetDegree || '',
    targetIntake: profile.targetIntake || '',
    gpa: profile.gpa || '',
    gradingScale: profile.gradingScale || '',
    researchSummary: profile.researchSummary || '',
    publicationsCount: profile.publicationsCount || 0,
    researchExperienceYears: profile.researchExperienceYears || 0,
    preferredCountries: (profile.preferredCountries || []).join(', '),
    preferredUniversities: (profile.preferredUniversities || []).join(', '),
    preferredFundingTypes: (profile.preferredFundingTypes || []).join(', '),
    preferredResearchAreas: (profile.preferredResearchAreas || []).join(', '),
  });
  const [cvText, setCvText] = useState('');

  useEffect(() => {
    setForm({
      currentDegreeLevel: profile.currentDegreeLevel || '',
      currentUniversity: profile.currentUniversity || '',
      currentDepartment: profile.currentDepartment || '',
      targetDegree: profile.targetDegree || '',
      targetIntake: profile.targetIntake || '',
      gpa: profile.gpa || '',
      gradingScale: profile.gradingScale || '',
      researchSummary: profile.researchSummary || '',
      publicationsCount: profile.publicationsCount || 0,
      researchExperienceYears: profile.researchExperienceYears || 0,
      preferredCountries: (profile.preferredCountries || []).join(', '),
      preferredUniversities: (profile.preferredUniversities || []).join(', '),
      preferredFundingTypes: (profile.preferredFundingTypes || []).join(', '),
      preferredResearchAreas: (profile.preferredResearchAreas || []).join(', '),
    });
  }, [profile]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await updateProfile.mutateAsync({
      ...form,
      gpa: form.gpa ? Number(form.gpa) : undefined,
      publicationsCount: Number(form.publicationsCount || 0),
      researchExperienceYears: Number(form.researchExperienceYears || 0),
      preferredCountries: splitCsv(form.preferredCountries),
      preferredUniversities: splitCsv(form.preferredUniversities),
      preferredFundingTypes: splitCsv(form.preferredFundingTypes),
      preferredResearchAreas: splitCsv(form.preferredResearchAreas),
    });
  };

  const handleParseCv = async () => {
    await parseCv.mutateAsync({ rawText: cvText, sourceFileName: 'pasted-cv.txt' });
    setCvText('');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-6 py-6 xl:px-8">
      <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 p-6 text-white">
        <h1 className="text-2xl font-bold">Academic Match Profile</h1>
        <p className="mt-2 text-sm text-sky-50">Fine-tune the profile used for professor and scholarship compatibility scoring.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Current Degree">
              <input value={form.currentDegreeLevel} onChange={(e) => setForm({ ...form, currentDegreeLevel: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Target Degree">
              <input value={form.targetDegree} onChange={(e) => setForm({ ...form, targetDegree: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Current University">
              <input value={form.currentUniversity} onChange={(e) => setForm({ ...form, currentUniversity: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Current Department">
              <input value={form.currentDepartment} onChange={(e) => setForm({ ...form, currentDepartment: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="GPA">
              <input value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Grading Scale">
              <input value={form.gradingScale} onChange={(e) => setForm({ ...form, gradingScale: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Publications Count">
              <input value={form.publicationsCount} onChange={(e) => setForm({ ...form, publicationsCount: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Research Experience Years">
              <input value={form.researchExperienceYears} onChange={(e) => setForm({ ...form, researchExperienceYears: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Preferred Countries">
              <input value={form.preferredCountries} onChange={(e) => setForm({ ...form, preferredCountries: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" placeholder="Canada, Germany, Singapore" />
            </Field>
            <Field label="Preferred Universities">
              <input value={form.preferredUniversities} onChange={(e) => setForm({ ...form, preferredUniversities: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Preferred Funding Types">
              <input value={form.preferredFundingTypes} onChange={(e) => setForm({ ...form, preferredFundingTypes: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" placeholder="fully funded, assistantship" />
            </Field>
            <Field label="Preferred Research Areas">
              <input value={form.preferredResearchAreas} onChange={(e) => setForm({ ...form, preferredResearchAreas: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
            </Field>
            <Field label="Research Summary">
              <textarea value={form.researchSummary} onChange={(e) => setForm({ ...form, researchSummary: e.target.value })} rows={6} className="w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm" />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={updateProfile.isPending} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              {updateProfile.isPending ? 'Saving...' : 'Save Academic Profile'}
            </button>
            <button type="button" onClick={() => refreshMatches.mutate({ force: true, targetType: 'all' })} disabled={refreshMatches.isPending} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">
              <RefreshCcw className={`h-4 w-4 ${refreshMatches.isPending ? 'animate-spin' : ''}`} />
              Refresh Matches
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">CV Analysis</h2>
            <p className="mt-2 text-sm text-gray-500">Paste CV or profile text to extract degree, GPA, publications, countries, and research keywords.</p>
            <textarea value={cvText} onChange={(e) => setCvText(e.target.value)} rows={12} className="mt-4 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm" placeholder="Paste CV text here..." />
            <button type="button" onClick={handleParseCv} disabled={parseCv.isPending || !cvText.trim()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white">
              {parseCv.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Parse CV Text
            </button>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Current Signals</h2>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>Parse status: <span className="font-semibold text-gray-900">{profile.parseStatus || 'pending'}</span></p>
              <p>Last parsed: {profile.lastParsedAt ? new Date(profile.lastParsedAt).toLocaleString() : 'Never'}</p>
              <p>Last confirmed: {profile.lastConfirmedAt ? new Date(profile.lastConfirmedAt).toLocaleString() : 'Never'}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function splitCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}
