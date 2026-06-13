'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentOnboarding } from '@/lib/hooks';
import { Loader2 } from 'lucide-react';

const steps = ['Basic Info', 'Academic Info', 'Research Goal', 'Skills & Experience', 'Documents & Email'];

export default function StudentOnboardingPage() {
  const router = useRouter();
  const onboarding = useStudentOnboarding();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({
    basic: { fullName: '', nationality: '', currentCountry: '' },
    academic: { currentDegreeLevel: 'BACHELOR', currentUniversity: '', department: '', majorSubject: '', expectedGraduationYear: new Date().getFullYear() + 1 },
    research: { primaryResearchArea: '', interestedDegree: 'MASTER', preferredStudyCountries: [], fundingNeed: 'FULLY_FUNDED' },
    skills: { skills: [{ category: 'RESEARCH', name: '' }], experiences: [], projects: [], publications: [] },
    preferences: {},
  });

  const progress = useMemo(() => Math.round((step / steps.length) * 100), [step]);

  const submit = async () => {
    await onboarding.mutateAsync({
      ...form,
      onboardingStep: 5,
      onboardingCompleted: true,
    });
    router.push('/dashboard/student');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Student Onboarding</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set up your research profile in five simple steps.</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {steps.map((label, index) => (
            <div key={label} className={`rounded-full px-3 py-1 text-xs font-semibold ${step === index + 1 ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              {index + 1}. {label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <StepCard title="Basic Info" description="Start with the essentials.">
            <Input label="Full Name *" value={form.basic.fullName} onChange={(v) => setForm((p: any) => ({ ...p, basic: { ...p.basic, fullName: v } }))} />
            <Input label="Nationality *" value={form.basic.nationality} onChange={(v) => setForm((p: any) => ({ ...p, basic: { ...p.basic, nationality: v } }))} />
            <Input label="Current Country *" value={form.basic.currentCountry} onChange={(v) => setForm((p: any) => ({ ...p, basic: { ...p.basic, currentCountry: v } }))} />
          </StepCard>
        )}

        {step === 2 && (
          <StepCard title="Academic Info" description="Tell us what you are studying now.">
            <Select label="Degree Level *" value={form.academic.currentDegreeLevel} onChange={(v) => setForm((p: any) => ({ ...p, academic: { ...p.academic, currentDegreeLevel: v } }))} options={['HIGH_SCHOOL', 'DIPLOMA', 'BACHELOR', 'MASTER', 'PHD', 'GRADUATED']} />
            <Input label="University *" value={form.academic.currentUniversity} onChange={(v) => setForm((p: any) => ({ ...p, academic: { ...p.academic, currentUniversity: v } }))} />
            <Input label="Department *" value={form.academic.department} onChange={(v) => setForm((p: any) => ({ ...p, academic: { ...p.academic, department: v } }))} />
            <Input label="Major Subject *" value={form.academic.majorSubject} onChange={(v) => setForm((p: any) => ({ ...p, academic: { ...p.academic, majorSubject: v } }))} />
            <Input label="Expected Graduation Year *" type="number" value={String(form.academic.expectedGraduationYear)} onChange={(v) => setForm((p: any) => ({ ...p, academic: { ...p.academic, expectedGraduationYear: Number(v) } }))} />
          </StepCard>
        )}

        {step === 3 && (
          <StepCard title="Research Goal" description="We will use this for matching and personalization.">
            <Input label="Primary Research Area *" value={form.research.primaryResearchArea} onChange={(v) => setForm((p: any) => ({ ...p, research: { ...p.research, primaryResearchArea: v } }))} />
            <Select label="Interested Degree *" value={form.research.interestedDegree} onChange={(v) => setForm((p: any) => ({ ...p, research: { ...p.research, interestedDegree: v } }))} options={['MASTER', 'PHD', 'RESEARCH_INTERNSHIP', 'POSTDOC']} />
            <Input label="Preferred Study Countries *" value={form.research.preferredStudyCountries.join(', ')} onChange={(v) => setForm((p: any) => ({ ...p, research: { ...p.research, preferredStudyCountries: v.split(',').map((x) => x.trim()).filter(Boolean) } }))} helper="Comma separated" />
            <Select label="Funding Need *" value={form.research.fundingNeed} onChange={(v) => setForm((p: any) => ({ ...p, research: { ...p.research, fundingNeed: v } }))} options={['FULLY_FUNDED', 'PARTIAL_FUNDED', 'SELF_FUNDED', 'ANY']} />
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title="Skills & Experience" description="A small amount of detail goes a long way.">
            <Input label="Primary Skill *" value={form.skills.skills[0].name} onChange={(v) => setForm((p: any) => ({ ...p, skills: { ...p.skills, skills: [{ ...p.skills.skills[0], name: v }] } }))} />
            <Input label="Project Title" value={form.skills.projects[0]?.title || ''} onChange={(v) => setForm((p: any) => ({ ...p, skills: { ...p.skills, projects: v ? [{ title: v }] : [] } }))} />
            <Input label="Research Experience" value={form.skills.experiences[0]?.title || ''} onChange={(v) => setForm((p: any) => ({ ...p, skills: { ...p.skills, experiences: v ? [{ type: 'RESEARCH', title: v }] : [] } }))} />
          </StepCard>
        )}

        {step === 5 && (
          <StepCard title="Documents & Email" description="You can skip CV for now, but we recommend uploading it later.">
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              CV upload is recommended but not blocking. You can upload files later from Settings → Documents, and choose a sending mailbox from Settings → Email Accounts.
            </p>
          </StepCard>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((value) => Math.max(1, value - 1))}
            disabled={step === 1}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
          >
            Back
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((value) => Math.min(5, value + 1))}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Save and Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={onboarding.isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {onboarding.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Finish Onboarding
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', helper }: { label: string; value: string; onChange: (value: string) => void; type?: string; helper?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
      {helper && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{helper}</span>}
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
