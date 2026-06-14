'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useCountries, useMe, useStudentProfile, useStudentProfileUpdate } from '@/lib/hooks';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { Check, FileText, ImagePlus, Loader2, Mail, Save, Search, UserRound, X } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getCountryOptions } from '@/lib/country-options';

const DEFAULT_CURRENT_YEAR = 2026;
const fundingNeedOptions = [
  { value: 'FULLY_FUNDED', label: 'Fully Funded' },
  { value: 'PARTIAL_FUNDED', label: 'Partially Funded' },
  { value: 'SELF_FUNDED', label: 'Self Funded' },
  { value: 'ANY', label: 'Any Funding Type' },
];
const tabs = ['Basic Info', 'Academic Info', 'Research Areas', 'Research Goal', 'Skills & Experience', 'Documents & Email'] as const;

export default function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  const { data: meData } = useMe();
  const { data, isLoading } = useStudentProfile();
  const { data: countriesData } = useCountries();
  const updateProfile = useStudentProfileUpdate();
  const me = meData as any;
  const profile = (data as any)?.profile;
  const countries = getCountryOptions(countriesData);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Basic Info');
  const [accountFullName, setAccountFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedAvatarPreviewUrl, setSelectedAvatarPreviewUrl] = useState('');

  const { register, control, handleSubmit, reset, watch } = useForm<any>({
    defaultValues: {
      basic: {
        fullName: '',
        preferredName: '',
        nationality: '',
        currentCountry: '',
        city: '',
        phone: '',
        whatsapp: '',
        linkedin: '',
        github: '',
        personalWebsite: '',
      },
      academic: {
        currentDegreeLevel: 'BACHELOR',
        currentUniversity: '',
        department: '',
        majorSubject: '',
        faculty: '',
        currentYear: '',
        expectedGraduationYear: DEFAULT_CURRENT_YEAR,
        cgpa: '',
        gradingScale: '',
        thesisTitle: '',
        supervisorName: '',
        additionalEducation: [],
      },
      research: {
        primaryResearchArea: '',
        secondaryResearchAreas: [],
        keywords: [],
        preferredResearchTopics: [],
        interestedDegree: 'MASTER',
        preferredStudyCountries: [],
        preferredUniversities: [],
        preferredIntake: '',
        fundingNeed: [],
      },
      skills: {
        skills: [],
        experiences: [],
        projects: [],
        publications: [],
      },
      preferences: {
        shortBio: '',
        careerGoal: '',
        whyInterestedInResearch: '',
        emailSignature: '',
      },
    },
  });

  const additionalEducationFields = useFieldArray({ control, name: 'academic.additionalEducation' });
  const skillsFields = useFieldArray({ control, name: 'skills.skills' });
  const experienceFields = useFieldArray({ control, name: 'skills.experiences' });
  const projectFields = useFieldArray({ control, name: 'skills.projects' });
  const publicationFields = useFieldArray({ control, name: 'skills.publications' });

  useEffect(() => {
    if (!me) return;
    setAccountFullName(me.fullName || '');
    setAvatarUrl(me.avatarUrl || '');
  }, [me]);

  useEffect(() => () => {
    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
    }
  }, [selectedAvatarPreviewUrl]);

  useEffect(() => {
    if (!profile) return;

    const currentEducation = profile.education || {};
    const additionalEducation = (profile.educationHistory || []).filter((item: any) => !item.isCurrent);

    reset({
      basic: {
        fullName: profile.fullName || '',
        preferredName: profile.preferredName || '',
        nationality: profile.nationality || '',
        currentCountry: profile.currentCountry || '',
        city: profile.city || '',
        phone: profile.phone || '',
        whatsapp: profile.whatsapp || '',
        linkedin: profile.linkedin || '',
        github: profile.github || '',
        personalWebsite: profile.website || '',
      },
      academic: {
        currentDegreeLevel: currentEducation.degreeLevel || 'BACHELOR',
        currentUniversity: currentEducation.university || '',
        department: currentEducation.department || '',
        majorSubject: currentEducation.majorSubject || '',
        faculty: currentEducation.faculty || '',
        currentYear: currentEducation.currentYear || '',
        expectedGraduationYear: currentEducation.expectedGraduationYear || DEFAULT_CURRENT_YEAR,
        cgpa: currentEducation.cgpa ?? '',
        gradingScale: currentEducation.gradingScale || '',
        thesisTitle: currentEducation.thesisTitle || '',
        supervisorName: currentEducation.supervisorName || '',
        additionalEducation: additionalEducation.map((item: any) => ({
          currentDegreeLevel: item.degreeLevel || 'BACHELOR',
          currentUniversity: item.university || '',
          department: item.department || '',
          majorSubject: item.majorSubject || '',
          faculty: item.faculty || '',
          currentYear: item.currentYear || '',
          expectedGraduationYear: item.expectedGraduationYear || DEFAULT_CURRENT_YEAR,
          cgpa: item.cgpa ?? '',
          gradingScale: item.gradingScale || '',
          thesisTitle: item.thesisTitle || '',
          supervisorName: item.supervisorName || '',
        })),
      },
      research: {
        primaryResearchArea: profile.researchInterest?.primaryArea || '',
        secondaryResearchAreas: Array.isArray(profile.researchInterest?.secondaryAreas) ? profile.researchInterest.secondaryAreas : [],
        keywords: Array.isArray(profile.researchInterest?.keywords) ? profile.researchInterest.keywords : [],
        preferredResearchTopics: Array.isArray(profile.researchInterest?.preferredTopics) ? profile.researchInterest.preferredTopics : [],
        interestedDegree: profile.researchInterest?.interestedDegree || 'MASTER',
        preferredStudyCountries: Array.isArray(profile.researchInterest?.preferredCountries) ? profile.researchInterest.preferredCountries : [],
        preferredUniversities: Array.isArray(profile.researchInterest?.preferredUniversities) ? profile.researchInterest.preferredUniversities : [],
        preferredIntake: profile.researchInterest?.preferredIntake || '',
        fundingNeed: Array.isArray(profile.researchInterest?.fundingNeed) ? profile.researchInterest.fundingNeed : [],
      },
      skills: {
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        experiences: Array.isArray(profile.experiences) ? profile.experiences : [],
        projects: Array.isArray(profile.projects) ? profile.projects : [],
        publications: Array.isArray(profile.publications) ? profile.publications : [],
      },
      preferences: {
        shortBio: profile.shortBio || '',
        careerGoal: profile.careerGoal || '',
        whyInterestedInResearch: profile.whyInterestedInResearch || '',
        emailSignature: profile.preference?.emailSignature || '',
      },
    });
  }, [profile, reset]);

  const handleAccountSave = async () => {
    setSavingAccount(true);
    try {
      const nextFullName = accountFullName.trim() || me?.fullName || '';
      const [, avatarResult] = await Promise.all([
        usersApi.updateMe({ fullName: nextFullName }),
        selectedAvatarFile ? usersApi.uploadAvatar(selectedAvatarFile) : Promise.resolve(null),
      ]);

      if (avatarResult?.avatarUrl) {
        setAvatarUrl(avatarResult.avatarUrl);
      }

      if (selectedAvatarPreviewUrl) {
        URL.revokeObjectURL(selectedAvatarPreviewUrl);
      }
      setSelectedAvatarFile(null);
      setSelectedAvatarPreviewUrl('');

      queryClient.setQueryData(['me'], (current: any) => current ? {
        ...current,
        fullName: nextFullName,
        avatarUrl: avatarResult?.avatarUrl || current.avatarUrl,
      } : current);

      setUser(me ? {
        ...me,
        fullName: nextFullName,
        avatarUrl: avatarResult?.avatarUrl || me.avatarUrl,
      } : me);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['student-profile'] }),
      ]);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedAvatarFile(file);
    setSelectedAvatarPreviewUrl(previewUrl);
    event.target.value = '';
  };

  const onSubmit = async (formData: any) => {
    const payload = {
      basic: {
        ...formData.basic,
        preferredName: trimToUndefined(formData.basic.preferredName),
        nationality: trimToUndefined(formData.basic.nationality),
        city: trimToUndefined(formData.basic.city),
        phone: trimToUndefined(formData.basic.phone),
        whatsapp: trimToUndefined(formData.basic.whatsapp),
        linkedin: trimToUndefined(formData.basic.linkedin),
        github: trimToUndefined(formData.basic.github),
        personalWebsite: trimToUndefined(formData.basic.personalWebsite),
      },
      academic: {
        ...formData.academic,
        faculty: trimToUndefined(formData.academic.faculty),
        currentYear: trimToUndefined(formData.academic.currentYear),
        cgpa: numberOrUndefined(formData.academic.cgpa),
        gradingScale: trimToUndefined(formData.academic.gradingScale),
        thesisTitle: trimToUndefined(formData.academic.thesisTitle),
        supervisorName: trimToUndefined(formData.academic.supervisorName),
        additionalEducation: (formData.academic.additionalEducation || []).map((item: any) => ({
          ...item,
          faculty: trimToUndefined(item.faculty),
          currentYear: trimToUndefined(item.currentYear),
          cgpa: numberOrUndefined(item.cgpa),
          gradingScale: trimToUndefined(item.gradingScale),
          thesisTitle: trimToUndefined(item.thesisTitle),
          supervisorName: trimToUndefined(item.supervisorName),
        })),
      },
      research: {
        ...formData.research,
        secondaryResearchAreas: toList(formData.research.secondaryResearchAreas),
        keywords: toList(formData.research.keywords),
        preferredResearchTopics: toList(formData.research.preferredResearchTopics),
        preferredUniversities: toList(formData.research.preferredUniversities),
        preferredIntake: trimToUndefined(formData.research.preferredIntake),
      },
      skills: {
        skills: (formData.skills.skills || [])
          .filter((item: any) => item.name?.trim())
          .map((item: any) => ({ ...item, level: trimToUndefined(item.level) })),
        experiences: (formData.skills.experiences || [])
          .filter((item: any) => item.title?.trim())
          .map((item: any) => ({
            ...item,
            organization: trimToUndefined(item.organization),
            startDate: trimToUndefined(item.startDate),
            endDate: trimToUndefined(item.endDate),
            description: trimToUndefined(item.description),
          })),
        projects: (formData.skills.projects || [])
          .filter((item: any) => item.title?.trim())
          .map((item: any) => ({
            ...item,
            description: trimToUndefined(item.description),
            link: trimToUndefined(item.link),
          })),
        publications: (formData.skills.publications || [])
          .filter((item: any) => item.title?.trim())
          .map((item: any) => ({
            ...item,
            journalOrConference: trimToUndefined(item.journalOrConference),
            year: numberOrUndefined(item.year),
            doi: trimToUndefined(item.doi),
            url: trimToUndefined(item.url),
            publishedAt: trimToUndefined(item.publishedAt),
            description: trimToUndefined(item.description),
          })),
      },
      preferences: {
        ...formData.preferences,
        shortBio: trimToUndefined(formData.preferences.shortBio),
        careerGoal: trimToUndefined(formData.preferences.careerGoal),
        whyInterestedInResearch: trimToUndefined(formData.preferences.whyInterestedInResearch),
        emailSignature: trimToUndefined(formData.preferences.emailSignature),
      },
    };

    await updateProfile.mutateAsync(payload);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
          <UserRound className="h-6 w-6 text-blue-500" />
          Student Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Edit your profile using the same structure as onboarding.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your user panel name and profile photo.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-slate-200 ring-1 ring-slate-300 dark:bg-slate-800 dark:ring-slate-700">
              {selectedAvatarPreviewUrl || avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={toImageSrc(selectedAvatarPreviewUrl || avatarUrl)} alt={accountFullName || 'User avatar'} className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-10 w-10 text-slate-500 dark:text-slate-300" />
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              <ImagePlus className="h-4 w-4" />
              Add New Photo
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={savingAccount} />
            </label>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              {selectedAvatarFile ? 'New photo selected. It will upload after you save.' : 'Choose a photo, then click Save Account to upload it.'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-gray-700 dark:text-slate-300">Account Full Name</span>
              <input
                value={accountFullName}
                onChange={(event) => setAccountFullName(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-gray-700 dark:text-slate-300">Email</span>
              <input
                value={me?.email || ''}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAccountSave}
                disabled={savingAccount}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {savingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Account
              </button>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {activeTab === 'Basic Info' && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['basic.fullName', 'Full Name'],
                ['basic.preferredName', 'Preferred Name'],
                ['basic.city', 'City'],
                ['basic.phone', 'Phone'],
                ['basic.whatsapp', 'WhatsApp'],
                ['basic.linkedin', 'LinkedIn'],
                ['basic.github', 'GitHub'],
                ['basic.personalWebsite', 'Website'],
              ].map(([name, label]) => (
                <label key={name} className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</span>
                  <input {...register(name)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                </label>
              ))}
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Nationality</span>
                <Controller
                  control={control}
                  name="basic.nationality"
                  render={({ field }) => (
                    <SearchableSelect value={field.value || ''} onChange={field.onChange} options={countries} placeholder="Search nationality" />
                  )}
                />
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Current Country</span>
                <Controller
                  control={control}
                  name="basic.currentCountry"
                  render={({ field }) => (
                    <SearchableSelect value={field.value || ''} onChange={field.onChange} options={countries} placeholder="Search current country" />
                  )}
                />
              </div>
            </div>
          )}

          {activeTab === 'Academic Info' && (
            <div className="space-y-5">
              <AcademicFields control={control} prefix="academic" title="Current Education" />

              <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-950/20">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Additional Education</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Add previous education records when needed.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => additionalEducationFields.append(createAcademicEntry())}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Add Education
                  </button>
                </div>

                <div className="space-y-4">
                  {additionalEducationFields.fields.length === 0 ? (
                    <div className="rounded-xl bg-slate-100/70 px-3 py-3 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      No additional education added yet.
                    </div>
                  ) : (
                    additionalEducationFields.fields.map((field, index) => (
                      <div key={field.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Education #{index + 2}</h4>
                          <button
                            type="button"
                            onClick={() => additionalEducationFields.remove(index)}
                            className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
                          >
                            Remove
                          </button>
                        </div>
                        <AcademicFields control={control} prefix={`academic.additionalEducation.${index}`} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Research Areas' && (
            <div className="space-y-4">
              <InputField label="Primary Research Area *" field={register('research.primaryResearchArea')} />
              <TagsInput label="Secondary Research Areas" value={watch('research.secondaryResearchAreas') || []} onChange={(values) => resetKeep(control, watch, reset, 'research.secondaryResearchAreas', values)} />
              <TagsInput label="Keywords" value={watch('research.keywords') || []} onChange={(values) => resetKeep(control, watch, reset, 'research.keywords', values)} />
              <TagsInput label="Preferred Research Topics" value={watch('research.preferredResearchTopics') || []} onChange={(values) => resetKeep(control, watch, reset, 'research.preferredResearchTopics', values)} />
            </div>
          )}

          {activeTab === 'Research Goal' && (
            <div className="space-y-4">
              <Controller
                control={control}
                name="research.interestedDegree"
                render={({ field }) => (
                  <SelectField label="Interested Degree *" value={field.value || ''} onChange={field.onChange} options={['MASTER', 'PHD', 'RESEARCH_INTERNSHIP', 'POSTDOC']} />
                )}
              />
              <Controller
                control={control}
                name="research.preferredStudyCountries"
                render={({ field }) => (
                  <MultiSearchableSelect
                    label="Preferred Study Countries *"
                    values={field.value || []}
                    onChange={field.onChange}
                    options={countries}
                    placeholder="Search and add study countries"
                    emptyText="No countries found"
                  />
                )}
              />
              <Controller
                control={control}
                name="research.fundingNeed"
                render={({ field }) => (
                  <MultiCheckboxSelect label="Funding Need *" values={field.value || []} onChange={field.onChange} options={fundingNeedOptions} />
                )}
              />
              <TagsInput label="Preferred Universities" value={watch('research.preferredUniversities') || []} onChange={(values) => resetKeep(control, watch, reset, 'research.preferredUniversities', values)} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Preferred Intake</span>
                <input {...register('research.preferredIntake')} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
            </div>
          )}

          {activeTab === 'Skills & Experience' && (
            <div className="space-y-4">
              <RepeatableBlock
                title="Skills"
                description="Add one or more skills."
                addLabel="Add Skill"
                isEmpty={skillsFields.fields.length === 0}
                emptyText="No skills added yet."
                onAdd={() => skillsFields.append({ category: 'RESEARCH', name: '', level: '' })}
              >
                {skillsFields.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:grid-cols-[180px_1fr_auto]">
                    <Controller
                      control={control}
                      name={`skills.skills.${index}.category`}
                      render={({ field: itemField }) => (
                        <SelectField label="Category" value={itemField.value || 'RESEARCH'} onChange={itemField.onChange} options={['RESEARCH', 'PROGRAMMING_LANGUAGE', 'FRAMEWORK', 'TOOL', 'LABORATORY', 'LANGUAGE', 'OTHER']} />
                      )}
                    />
                    <Controller control={control} name={`skills.skills.${index}.name`} render={({ field: itemField }) => <InputField label="Skill Name" field={itemField} />} />
                    <div className="flex items-end">
                      <button type="button" onClick={() => skillsFields.remove(index)} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10">Remove</button>
                    </div>
                  </div>
                ))}
              </RepeatableBlock>

              <RepeatableBlock
                title="Research Experience"
                description="Add internships, research roles, or relevant experience."
                addLabel="Add Experience"
                isEmpty={experienceFields.fields.length === 0}
                emptyText="No experience added yet."
                onAdd={() => experienceFields.append({ type: 'RESEARCH', title: '', organization: '', description: '' })}
              >
                {experienceFields.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:grid-cols-2">
                    <Controller
                      control={control}
                      name={`skills.experiences.${index}.type`}
                      render={({ field: itemField }) => (
                        <SelectField label="Type" value={itemField.value || 'RESEARCH'} onChange={itemField.onChange} options={['RESEARCH', 'WORK', 'PROJECT', 'INTERNSHIP', 'ACHIEVEMENT', 'CERTIFICATION', 'PUBLICATION']} />
                      )}
                    />
                    <Controller control={control} name={`skills.experiences.${index}.title`} render={({ field: itemField }) => <InputField label="Title" field={itemField} />} />
                    <Controller control={control} name={`skills.experiences.${index}.organization`} render={({ field: itemField }) => <InputField label="Organization" field={itemField} />} />
                    <Controller control={control} name={`skills.experiences.${index}.description`} render={({ field: itemField }) => <InputField label="Description" field={itemField} />} />
                    <div className="md:col-span-2 flex justify-end">
                      <button type="button" onClick={() => experienceFields.remove(index)} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10">Remove</button>
                    </div>
                  </div>
                ))}
              </RepeatableBlock>

              <RepeatableBlock
                title="Projects"
                description="List projects that strengthen your application."
                addLabel="Add Project"
                isEmpty={projectFields.fields.length === 0}
                emptyText="No project added yet."
                onAdd={() => projectFields.append({ title: '', description: '', link: '' })}
              >
                {projectFields.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:grid-cols-2">
                    <Controller control={control} name={`skills.projects.${index}.title`} render={({ field: itemField }) => <InputField label="Project Title" field={itemField} />} />
                    <Controller control={control} name={`skills.projects.${index}.link`} render={({ field: itemField }) => <InputField label="Project Link" field={itemField} />} />
                    <div className="md:col-span-2">
                      <Controller control={control} name={`skills.projects.${index}.description`} render={({ field: itemField }) => <TextareaField label="Description" field={itemField} rows={3} />} />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button type="button" onClick={() => projectFields.remove(index)} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10">Remove</button>
                    </div>
                  </div>
                ))}
              </RepeatableBlock>

              <RepeatableBlock
                title="Publications"
                description="Add any publications if you have them."
                addLabel="Add Publication"
                isEmpty={publicationFields.fields.length === 0}
                emptyText="No publication added yet."
                onAdd={() => publicationFields.append({ title: '', journalOrConference: '', year: '', doi: '', url: '', publishedAt: '', description: '' })}
              >
                {publicationFields.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:grid-cols-2">
                    <Controller control={control} name={`skills.publications.${index}.title`} render={({ field: itemField }) => <InputField label="Title" field={itemField} />} />
                    <Controller control={control} name={`skills.publications.${index}.journalOrConference`} render={({ field: itemField }) => <InputField label="Publish Site / Journal" field={itemField} />} />
                    <Controller control={control} name={`skills.publications.${index}.year`} render={({ field: itemField }) => <InputField label="Year" field={itemField} type="number" />} />
                    <Controller control={control} name={`skills.publications.${index}.doi`} render={({ field: itemField }) => <InputField label="DOI" field={itemField} />} />
                    <Controller control={control} name={`skills.publications.${index}.publishedAt`} render={({ field: itemField }) => <InputField label="Publication Date" field={itemField} type="date" />} />
                    <div className="md:col-span-2">
                      <Controller control={control} name={`skills.publications.${index}.url`} render={({ field: itemField }) => <InputField label="Publication URL" field={itemField} />} />
                    </div>
                    <div className="md:col-span-2">
                      <Controller control={control} name={`skills.publications.${index}.description`} render={({ field: itemField }) => <TextareaField label="Description / More Info" field={itemField} rows={3} />} />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button type="button" onClick={() => publicationFields.remove(index)} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10">Remove</button>
                    </div>
                  </div>
                ))}
              </RepeatableBlock>
            </div>
          )}

          {activeTab === 'Documents & Email' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                CV upload and mailbox selection stay in their own settings pages, same as onboarding guidance.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Link href="/settings/documents" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Manage Documents</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Upload CV, transcript, and other files.</p>
                    </div>
                  </div>
                </Link>
                <Link href="/settings/email-accounts" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Email Accounts</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Choose the mailbox used for outreach.</p>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="space-y-4">
                <TextareaRegistered label="Short Bio" register={register('preferences.shortBio')} rows={4} />
                <TextareaRegistered label="Career Goal" register={register('preferences.careerGoal')} rows={3} />
                <TextareaRegistered label="Why Interested In Research" register={register('preferences.whyInterestedInResearch')} rows={3} />
                <TextareaRegistered label="Email Signature" register={register('preferences.emailSignature')} rows={3} />
              </div>
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Profile
        </button>
      </form>
    </div>
  );
}

function RepeatableBlock({
  title,
  description,
  addLabel,
  isEmpty,
  emptyText,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  addLabel: string;
  isEmpty: boolean;
  emptyText: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {addLabel}
        </button>
      </div>
      <div className="space-y-3">
        {isEmpty ? <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p> : children}
      </div>
    </div>
  );
}

function AcademicFields({ control, prefix, title }: { control: any; prefix: string; title?: string }) {
  return (
    <div className="space-y-4">
      {title ? <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name={`${prefix}.currentDegreeLevel`}
          render={({ field }) => (
            <SelectField label="Degree Level *" value={field.value || ''} onChange={field.onChange} options={['HIGH_SCHOOL', 'DIPLOMA', 'BACHELOR', 'MASTER', 'PHD', 'GRADUATED']} />
          )}
        />
        <Controller control={control} name={`${prefix}.currentUniversity`} render={({ field }) => <InputField label="University *" field={field} />} />
        <Controller control={control} name={`${prefix}.department`} render={({ field }) => <InputField label="Department *" field={field} />} />
        <Controller control={control} name={`${prefix}.majorSubject`} render={({ field }) => <InputField label="Major Subject *" field={field} />} />
        <Controller control={control} name={`${prefix}.faculty`} render={({ field }) => <InputField label="Faculty" field={field} />} />
        <Controller control={control} name={`${prefix}.currentYear`} render={({ field }) => <InputField label="Current Year" field={field} />} />
        <Controller control={control} name={`${prefix}.expectedGraduationYear`} render={({ field }) => <InputField label="Expected Graduation Year *" field={field} type="number" />} />
        <Controller control={control} name={`${prefix}.cgpa`} render={({ field }) => <InputField label="CGPA" field={field} type="number" step="0.01" />} />
        <Controller control={control} name={`${prefix}.gradingScale`} render={({ field }) => <InputField label="Grading Scale" field={field} />} />
        <Controller control={control} name={`${prefix}.thesisTitle`} render={({ field }) => <InputField label="Thesis Title" field={field} />} />
        <Controller control={control} name={`${prefix}.supervisorName`} render={({ field }) => <InputField label="Supervisor Name" field={field} />} />
      </div>
    </div>
  );
}

function InputField({ label, field, type = 'text', step }: { label: string; field: any; type?: string; step?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</span>
      <input {...field} value={field.value ?? ''} type={type} step={step} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
    </label>
  );
}

function TextareaField({ label, field, rows = 3 }: { label: string; field: any; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</span>
      <textarea {...field} value={field.value ?? ''} rows={rows} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
    </label>
  );
}

function TextareaRegistered({ label, register, rows = 3 }: { label: string; register: any; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</span>
      <textarea {...register} rows={rows} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
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
    const matches = normalizedQuery ? availableOptions.filter((option) => option.toLowerCase().includes(normalizedQuery)) : availableOptions;
    return matches.slice(0, 12);
  }, [options, query, values]);

  const addValue = (option: string) => {
    if (!values.includes(option)) onChange([...values, option]);
    setQuery('');
    setOpen(false);
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
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((value) => !value)} className="ml-2 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            {open ? 'Close' : 'Show all'}
          </button>
        </div>
      </label>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <button key={value} type="button" onClick={() => onChange(values.filter((item) => item !== value))} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25">
              {value}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      ) : null}

      {open && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <button key={option} type="button" onClick={() => addValue(option)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                <span>{option}</span>
                <Check className="h-4 w-4 text-slate-300" />
              </button>
            )) : <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{emptyText}</div>}
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
    if (values.includes(optionValue)) return onChange(values.filter((value) => value !== optionValue));
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
    </div>
  );
}

function TagsInput({ label, value, onChange }: { label: string; value: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const nextValue = draft.trim();
    if (!nextValue || value.includes(nextValue)) return;
    onChange([...value, nextValue]);
    setDraft('');
  };

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex gap-2">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
        <button type="button" onClick={addItem} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Add</button>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <button key={item} type="button" onClick={() => onChange(value.filter((entry) => entry !== item))} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {item}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function createAcademicEntry() {
  return {
    currentDegreeLevel: 'BACHELOR',
    currentUniversity: '',
    department: '',
    majorSubject: '',
    faculty: '',
    currentYear: '',
    expectedGraduationYear: DEFAULT_CURRENT_YEAR,
    cgpa: '',
    gradingScale: '',
    thesisTitle: '',
    supervisorName: '',
  };
}

function toList(values: unknown) {
  return Array.isArray(values) ? values.filter((value) => typeof value === 'string' && value.trim()) : [];
}

function trimToUndefined(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function numberOrUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toImageSrc(value: string) {
  if (!value) return value;
  if (value.startsWith('blob:') || value.startsWith('data:')) return value;
  const [rawBase, rawQuery] = value.split('?');
  const normalizedBase = rawBase
    .split('/')
    .map((part, index) => (index < 3 ? part : encodeURIComponent(decodeURIComponent(part))))
    .join('/');
  const cacheBuster = `cb=${Date.now()}`;
  return rawQuery ? `${normalizedBase}?${rawQuery}&${cacheBuster}` : `${normalizedBase}?${cacheBuster}`;
}

function resetKeep(control: any, watch: any, reset: any, path: string, value: string[]) {
  const currentValues = watch();
  const segments = path.split('.');
  let cursor = currentValues;
  for (let index = 0; index < segments.length - 1; index += 1) {
    cursor = cursor[segments[index]];
  }
  cursor[segments[segments.length - 1]] = value;
  reset(currentValues);
}
