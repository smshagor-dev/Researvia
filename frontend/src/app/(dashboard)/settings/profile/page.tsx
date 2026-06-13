'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useStudentProfile, useStudentProfileUpdate } from '@/lib/hooks';
import { Loader2, Save, UserRound } from 'lucide-react';

export default function ProfileSettingsPage() {
  const { data, isLoading } = useStudentProfile();
  const updateProfile = useStudentProfileUpdate();
  const profile = (data as any)?.profile;
  const { register, handleSubmit, reset } = useForm<any>();

  useEffect(() => {
    if (!profile) return;
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
      preferences: {
        shortBio: profile.shortBio || '',
        careerGoal: profile.careerGoal || '',
        whyInterestedInResearch: profile.whyInterestedInResearch || '',
        emailSignature: profile.preference?.emailSignature || '',
      },
    });
  }, [profile, reset]);

  const onSubmit = async (formData: any) => {
    await updateProfile.mutateAsync(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
          <UserRound className="h-6 w-6 text-blue-500" />
          Student Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Keep your profile current for professor matching, scholarship discovery, and AI email personalization.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Basic Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['basic.fullName', 'Full Name'],
              ['basic.preferredName', 'Preferred Name'],
              ['basic.nationality', 'Nationality'],
              ['basic.currentCountry', 'Current Country'],
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
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Email Personalization</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Short Bio</span>
              <textarea {...register('preferences.shortBio')} rows={4} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Career Goal</span>
              <textarea {...register('preferences.careerGoal')} rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Why Interested In Research</span>
              <textarea {...register('preferences.whyInterestedInResearch')} rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Email Signature</span>
              <textarea {...register('preferences.emailSignature')} rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
          </div>
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
