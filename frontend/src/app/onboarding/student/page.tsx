'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCountries, useStudentOnboarding } from '@/lib/hooks';
import { Check, Loader2, Search, X } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getCountryOptions } from '@/lib/country-options';

const steps = ['Basic Info', 'Academic Info', 'Research Goal', 'Skills & Experience', 'Documents & Email'];
const fundingNeedOptions = [
  { value: 'FULLY_FUNDED', label: 'Fully Funded' },
  { value: 'PARTIAL_FUNDED', label: 'Partially Funded' },
  { value: 'SELF_FUNDED', label: 'Self Funded' },
  { value: 'ANY', label: 'Any Funding Type' },
];
const DEFAULT_CURRENT_YEAR = 2026;
const DEFAULT_EXPECTED_GRADUATION_YEAR = DEFAULT_CURRENT_YEAR + 1;

export default function StudentOnboardingPage() {
  const router = useRouter();
  const onboarding = useStudentOnboarding();
  const { data: countriesData } = useCountries();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({
    basic: { fullName: '', nationality: '', currentCountry: '' },
    academic: {
      currentDegreeLevel: 'BACHELOR',
      currentUniversity: '',
      department: '',
      majorSubject: '',
      expectedGraduationYear: DEFAULT_EXPECTED_GRADUATION_YEAR,
      additionalEducation: [],
    },
    research: { primaryResearchArea: '', interestedDegree: 'MASTER', preferredStudyCountries: [], fundingNeed: [] as string[] },
    skills: { skills: [], experiences: [], projects: [], publications: [] },
    preferences: {},
  });
  const countries = getCountryOptions(countriesData);

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950/10 p-4 backdrop-blur-[2px] dark:bg-slate-950/30">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/50 bg-white/72 p-6 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/72">
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
            <Field label="Nationality *">
              <SearchableSelect value={form.basic.nationality} onChange={(v) => setForm((p: any) => ({ ...p, basic: { ...p.basic, nationality: v } }))} options={countries} placeholder="Search nationality" />
            </Field>
            <Field label="Current Country *">
              <SearchableSelect value={form.basic.currentCountry} onChange={(v) => setForm((p: any) => ({ ...p, basic: { ...p.basic, currentCountry: v } }))} options={countries} placeholder="Search current country" />
            </Field>
          </StepCard>
        )}

        {step === 2 && (
          <StepCard title="Academic Info" description="Tell us what you are studying now.">
            <AcademicFields
              title="Current Education"
              value={form.academic}
              onChange={(nextAcademic) => setForm((p: any) => ({ ...p, academic: nextAcademic }))}
            />

            <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-950/20">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Additional Education</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add previous degrees, diplomas, or other academic history if needed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((p: any) => ({
                    ...p,
                    academic: {
                      ...p.academic,
                      additionalEducation: [
                        ...(p.academic.additionalEducation || []),
                        createAcademicEntry(),
                      ],
                    },
                  }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Add Education
                </button>
              </div>

              <div className="space-y-4">
                {(form.academic.additionalEducation || []).length === 0 ? (
                  <div className="rounded-xl bg-slate-100/70 px-3 py-3 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    No additional education added yet.
                  </div>
                ) : (
                  (form.academic.additionalEducation || []).map((entry: any, index: number) => (
                    <div key={`additional-education-${index}`} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Education #{index + 2}</h4>
                        <button
                          type="button"
                          onClick={() => setForm((p: any) => ({
                            ...p,
                            academic: {
                              ...p.academic,
                              additionalEducation: p.academic.additionalEducation.filter((_: unknown, itemIndex: number) => itemIndex !== index),
                            },
                          }))}
                          className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
                        >
                          Remove
                        </button>
                      </div>
                      <AcademicFields
                        value={entry}
                        onChange={(nextEntry) => setForm((p: any) => ({
                          ...p,
                          academic: {
                            ...p.academic,
                            additionalEducation: p.academic.additionalEducation.map((item: any, itemIndex: number) => (
                              itemIndex === index ? nextEntry : item
                            )),
                          },
                        }))}
                        hideTitle
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard title="Research Goal" description="We will use this for matching and personalization.">
            <Input label="Primary Research Area *" value={form.research.primaryResearchArea} onChange={(v) => setForm((p: any) => ({ ...p, research: { ...p.research, primaryResearchArea: v } }))} />
            <Select label="Interested Degree *" value={form.research.interestedDegree} onChange={(v) => setForm((p: any) => ({ ...p, research: { ...p.research, interestedDegree: v } }))} options={['MASTER', 'PHD', 'RESEARCH_INTERNSHIP', 'POSTDOC']} />
            <MultiSearchableSelect
              label="Preferred Study Countries *"
              values={form.research.preferredStudyCountries}
              onChange={(values) => setForm((p: any) => ({ ...p, research: { ...p.research, preferredStudyCountries: values } }))}
              options={countries}
              placeholder="Search and add study countries"
              emptyText="No countries found"
            />
            <MultiCheckboxSelect
              label="Funding Need *"
              values={form.research.fundingNeed}
              onChange={(values) => setForm((p: any) => ({ ...p, research: { ...p.research, fundingNeed: values } }))}
              options={fundingNeedOptions}
            />
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title="Skills & Experience" description="A small amount of detail goes a long way.">
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Skills</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add one or more skills if you want stronger matching.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((p: any) => ({
                    ...p,
                    skills: {
                      ...p.skills,
                      skills: [...(p.skills.skills || []), { category: 'RESEARCH', name: '' }],
                    },
                  }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Add Skill
                </button>
              </div>
              <div className="space-y-3">
                {(form.skills.skills || []).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No skills added yet. You can skip this step.</p>
                ) : (
                  (form.skills.skills || []).map((skill: any, index: number) => (
                    <div key={`skill-${index}`} className="grid gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:grid-cols-[180px_1fr_auto]">
                      <Select
                        label="Category"
                        value={skill.category || 'RESEARCH'}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            skills: p.skills.skills.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, category: value } : item),
                          },
                        }))}
                        options={['RESEARCH', 'PROGRAMMING_LANGUAGE', 'FRAMEWORK', 'TOOL', 'LABORATORY', 'LANGUAGE', 'OTHER']}
                      />
                      <Input
                        label="Skill Name"
                        value={skill.name || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            skills: p.skills.skills.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, name: value } : item),
                          },
                        }))}
                      />
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setForm((p: any) => ({
                            ...p,
                            skills: {
                              ...p.skills,
                              skills: p.skills.skills.filter((_: unknown, itemIndex: number) => itemIndex !== index),
                            },
                          }))}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Research Experience</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add internships, research roles, or relevant experience.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((p: any) => ({
                    ...p,
                    skills: {
                      ...p.skills,
                      experiences: [...(p.skills.experiences || []), { type: 'RESEARCH', title: '' }],
                    },
                  }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Add Experience
                </button>
              </div>
              <div className="space-y-3">
                {(form.skills.experiences || []).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No experience added yet.</p>
                ) : (
                  (form.skills.experiences || []).map((experience: any, index: number) => (
                    <div key={`experience-${index}`} className="grid gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:grid-cols-[180px_1fr_auto]">
                      <Select
                        label="Type"
                        value={experience.type || 'RESEARCH'}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            experiences: p.skills.experiences.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, type: value } : item),
                          },
                        }))}
                        options={['RESEARCH', 'WORK', 'PROJECT', 'INTERNSHIP', 'ACHIEVEMENT', 'CERTIFICATION', 'PUBLICATION']}
                      />
                      <Input
                        label="Title"
                        value={experience.title || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            experiences: p.skills.experiences.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, title: value } : item),
                          },
                        }))}
                      />
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setForm((p: any) => ({
                            ...p,
                            skills: {
                              ...p.skills,
                              experiences: p.skills.experiences.filter((_: unknown, itemIndex: number) => itemIndex !== index),
                            },
                          }))}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Projects</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">List projects that strengthen your application.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((p: any) => ({
                    ...p,
                    skills: {
                      ...p.skills,
                      projects: [...(p.skills.projects || []), { title: '' }],
                    },
                  }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Add Project
                </button>
              </div>
              <div className="space-y-3">
                {(form.skills.projects || []).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No project added yet.</p>
                ) : (
                  (form.skills.projects || []).map((project: any, index: number) => (
                    <div key={`project-${index}`} className="grid gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:grid-cols-[1fr_auto]">
                      <Input
                        label="Project Title"
                        value={project.title || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            projects: p.skills.projects.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, title: value } : item),
                          },
                        }))}
                      />
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setForm((p: any) => ({
                            ...p,
                            skills: {
                              ...p.skills,
                              projects: p.skills.projects.filter((_: unknown, itemIndex: number) => itemIndex !== index),
                            },
                          }))}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Publications</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add publications, papers, or preprints if you have them.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((p: any) => ({
                    ...p,
                    skills: {
                      ...p.skills,
                      publications: [...(p.skills.publications || []), { title: '', journalOrConference: '', year: '', doi: '', url: '', publishedAt: '', description: '' }],
                    },
                  }))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Add Publication
                </button>
              </div>
              <div className="space-y-3">
                {(form.skills.publications || []).length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No publication added yet.</p>
                ) : (
                  (form.skills.publications || []).map((publication: any, index: number) => (
                    <div key={`publication-${index}`} className="grid gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:grid-cols-2">
                      <Input
                        label="Title"
                        value={publication.title || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            publications: p.skills.publications.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, title: value } : item),
                          },
                        }))}
                      />
                      <Input
                        label="Publish Site / Journal"
                        value={publication.journalOrConference || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            publications: p.skills.publications.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, journalOrConference: value } : item),
                          },
                        }))}
                      />
                      <Input
                        label="Year"
                        type="number"
                        value={publication.year || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            publications: p.skills.publications.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, year: value } : item),
                          },
                        }))}
                      />
                      <Input
                        label="DOI"
                        value={publication.doi || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            publications: p.skills.publications.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, doi: value } : item),
                          },
                        }))}
                      />
                      <Input
                        label="Publication Date"
                        type="date"
                        value={publication.publishedAt || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            publications: p.skills.publications.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, publishedAt: value } : item),
                          },
                        }))}
                      />
                      <Input
                        label="Publication URL"
                        value={publication.url || ''}
                        onChange={(value) => setForm((p: any) => ({
                          ...p,
                          skills: {
                            ...p.skills,
                            publications: p.skills.publications.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, url: value } : item),
                          },
                        }))}
                      />
                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description / More Info</span>
                        <textarea
                          value={publication.description || ''}
                          onChange={(event) => setForm((p: any) => ({
                            ...p,
                            skills: {
                              ...p.skills,
                              publications: p.skills.publications.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, description: event.target.value } : item),
                            },
                          }))}
                          rows={3}
                          className="w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100"
                        />
                      </label>
                      <div className="md:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setForm((p: any) => ({
                            ...p,
                            skills: {
                              ...p.skills,
                              publications: p.skills.publications.filter((_: unknown, itemIndex: number) => itemIndex !== index),
                            },
                          }))}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
            <div className="flex items-center gap-3">
              {step === 4 && (
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Skip For Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep((value) => Math.min(5, value + 1))}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Save and Continue
              </button>
            </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function AcademicFields({
  value,
  onChange,
  title,
  hideTitle = false,
}: {
  value: any;
  onChange: (value: any) => void;
  title?: string;
  hideTitle?: boolean;
}) {
  const update = (key: string, nextValue: string | number) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="space-y-4">
      {!hideTitle && title ? <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Degree Level *" value={value.currentDegreeLevel} onChange={(v) => update('currentDegreeLevel', v)} options={['HIGH_SCHOOL', 'DIPLOMA', 'BACHELOR', 'MASTER', 'PHD', 'GRADUATED']} />
        <Input label="University *" value={value.currentUniversity} onChange={(v) => update('currentUniversity', v)} />
        <Input label="Department *" value={value.department} onChange={(v) => update('department', v)} />
        <Input label="Major Subject *" value={value.majorSubject} onChange={(v) => update('majorSubject', v)} />
        <Input label="Faculty" value={value.faculty || ''} onChange={(v) => update('faculty', v)} />
        <Input label="Current Year" value={value.currentYear || ''} onChange={(v) => update('currentYear', v)} />
        <Input label="Expected Graduation Year *" type="number" value={String(value.expectedGraduationYear || '')} onChange={(v) => update('expectedGraduationYear', Number(v))} />
        <Input label="CGPA" value={String(value.cgpa || '')} onChange={(v) => update('cgpa', v ? Number(v) : '')} />
        <Input label="Grading Scale" value={value.gradingScale || ''} onChange={(v) => update('gradingScale', v)} />
        <Input label="Thesis Title" value={value.thesisTitle || ''} onChange={(v) => update('thesisTitle', v)} />
        <Input label="Supervisor Name" value={value.supervisorName || ''} onChange={(v) => update('supervisorName', v)} />
      </div>
    </div>
  );
}

function createAcademicEntry() {
  return {
    currentDegreeLevel: 'BACHELOR',
    currentUniversity: '',
    department: '',
    majorSubject: '',
    expectedGraduationYear: DEFAULT_CURRENT_YEAR,
    faculty: '',
    currentYear: '',
    cgpa: '',
    gradingScale: '',
    thesisTitle: '',
    supervisorName: '',
  };
}

function Input({ label, value, onChange, type = 'text', helper }: { label: string; value: string; onChange: (value: string) => void; type?: string; helper?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100" />
      {helper && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{helper}</span>}
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder = 'Select an option' }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100">
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function MultiSearchableSelect({
  label,
  values,
  onChange,
  options,
  placeholder,
  emptyText,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const availableOptions = options.filter((option) => !values.includes(option));
    const matches = normalizedQuery
      ? availableOptions.filter((option) => option.toLowerCase().includes(normalizedQuery))
      : availableOptions;

    return matches.slice(0, 12);
  }, [options, query, values]);

  const addValue = (option: string) => {
    if (!values.includes(option)) {
      onChange([...values, option]);
    }
    setQuery('');
    setOpen(false);
  };

  const removeValue = (option: string) => {
    onChange(values.filter((value) => value !== option));
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <div className={`flex items-center rounded-xl border px-3 py-2.5 transition ${
          open
            ? 'border-blue-500 bg-white shadow-lg shadow-blue-500/10 ring-4 ring-blue-500/10 dark:border-blue-400 dark:bg-slate-950 dark:ring-blue-400/10'
            : 'border-slate-200/80 bg-white/85 dark:border-slate-700 dark:bg-slate-950/85'
        }`}>
          <Search className="mr-2 h-4 w-4 flex-shrink-0 text-slate-400" />
          <input
            type="text"
            value={query}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen((value) => !value)}
            className="ml-2 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {open ? 'Close' : 'Show all'}
          </button>
        </div>
      </label>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => removeValue(value)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25"
            >
              {value}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">No country selected yet.</p>
      )}

      {open && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => addValue(option)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span>{option}</span>
                  <Check className="h-4 w-4 text-slate-300" />
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{emptyText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiCheckboxSelect({
  label,
  values,
  onChange,
  options,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const toggleValue = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter((value) => value !== optionValue));
      return;
    }

    onChange([...values, optionValue]);
  };

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = values.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleValue(option.value)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                selected
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-200'
                  : 'border-slate-200/80 bg-white/85 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-200 dark:hover:bg-slate-900'
              }`}
            >
              <span>{option.label}</span>
              {selected ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {values.length > 0 ? `${values.length} funding option${values.length === 1 ? '' : 's'} selected.` : 'Select one or more funding options.'}
      </p>
    </div>
  );
}
