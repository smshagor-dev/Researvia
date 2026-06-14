'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ImagePlus,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  UserCircle2,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminUserDetail } from '@/lib/hooks';
import { formatCredits, formatDate } from '@/lib/utils';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function getStatusTone(status?: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/25';
    case 'suspended':
      return 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/25';
    case 'deleted':
      return 'bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/25';
    default:
      return 'bg-slate-400/15 text-slate-200 ring-1 ring-slate-300/20';
  }
}

function formatValue(value: unknown, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function InfoItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-100">{formatValue(value)}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.94))] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function RelationList({
  title,
  items,
  renderItem,
  emptyLabel = 'No records found',
}: {
  title: string;
  items?: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 ring-1 ring-white/10">
          {items?.length || 0}
        </span>
      </div>
      <div className="space-y-3">
        {items?.length ? (
          items.slice(0, 5).map((item, index) => (
            <div key={item.id || index} className="rounded-2xl bg-slate-950/65 p-3 ring-1 ring-white/10">
              {renderItem(item, index)}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminUserDetail(params.id);
  const user = data as any;
  const [saving, setSaving] = useState(false);
  const [togglingBan, setTogglingBan] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState<any>({
    email: '',
    fullName: '',
    avatarUrl: '',
    role: 'user',
    status: 'active',
    emailVerifiedAt: '',
    profile: {
      bio: '',
      currentDegree: '',
      gpa: '',
      ieltsScore: '',
      toeflScore: '',
      greVerbal: '',
      greQuant: '',
      greAwa: '',
      researchInterests: [],
      targetDegree: '',
      targetCountries: [],
      targetStartTerm: '',
      linkedinUrl: '',
      githubUrl: '',
      googleScholarUrl: '',
      orcidId: '',
    },
    studentProfile: {
      fullName: '',
      preferredName: '',
      profilePhotoUrl: '',
      gender: '',
      dateOfBirth: '',
      nationality: '',
      currentCountry: '',
      city: '',
      phone: '',
      whatsapp: '',
      linkedin: '',
      github: '',
      website: '',
      shortBio: '',
      careerGoal: '',
      whyInterestedInResearch: '',
      profileCompleteness: 0,
      onboardingCompleted: false,
      onboardingStep: 1,
    },
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      email: user.email || '',
      fullName: user.fullName || '',
      avatarUrl: user.avatarUrl || '',
      role: user.role || 'user',
      status: user.status || 'active',
      emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt).toISOString().slice(0, 16) : '',
      profile: {
        bio: user.profile?.bio || '',
        currentDegree: user.profile?.currentDegree || '',
        gpa: user.profile?.gpa ?? '',
        ieltsScore: user.profile?.ieltsScore ?? '',
        toeflScore: user.profile?.toeflScore ?? '',
        greVerbal: user.profile?.greVerbal ?? '',
        greQuant: user.profile?.greQuant ?? '',
        greAwa: user.profile?.greAwa ?? '',
        researchInterests: Array.isArray(user.profile?.researchInterests) ? user.profile.researchInterests : [],
        targetDegree: user.profile?.targetDegree || '',
        targetCountries: Array.isArray(user.profile?.targetCountries) ? user.profile.targetCountries : [],
        targetStartTerm: user.profile?.targetStartTerm || '',
        linkedinUrl: user.profile?.linkedinUrl || '',
        githubUrl: user.profile?.githubUrl || '',
        googleScholarUrl: user.profile?.googleScholarUrl || '',
        orcidId: user.profile?.orcidId || '',
      },
      studentProfile: {
        fullName: user.studentProfile?.fullName || user.fullName || '',
        preferredName: user.studentProfile?.preferredName || '',
        profilePhotoUrl: user.studentProfile?.profilePhotoUrl || user.avatarUrl || '',
        gender: user.studentProfile?.gender || '',
        dateOfBirth: user.studentProfile?.dateOfBirth ? new Date(user.studentProfile.dateOfBirth).toISOString().slice(0, 10) : '',
        nationality: user.studentProfile?.nationality || '',
        currentCountry: user.studentProfile?.currentCountry || '',
        city: user.studentProfile?.city || '',
        phone: user.studentProfile?.phone || '',
        whatsapp: user.studentProfile?.whatsapp || '',
        linkedin: user.studentProfile?.linkedin || '',
        github: user.studentProfile?.github || '',
        website: user.studentProfile?.website || '',
        shortBio: user.studentProfile?.shortBio || '',
        careerGoal: user.studentProfile?.careerGoal || '',
        whyInterestedInResearch: user.studentProfile?.whyInterestedInResearch || '',
        profileCompleteness: user.studentProfile?.profileCompleteness || 0,
        onboardingCompleted: !!user.studentProfile?.onboardingCompleted,
        onboardingStep: user.studentProfile?.onboardingStep || 1,
      },
    });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateUserDetail(params.id, {
        email: form.email,
        fullName: form.fullName,
        avatarUrl: form.avatarUrl || null,
        role: form.role,
        status: form.status,
        emailVerifiedAt: form.emailVerifiedAt || null,
        profile: {
          bio: emptyToNull(form.profile.bio),
          currentDegree: emptyToNull(form.profile.currentDegree),
          gpa: numberOrNull(form.profile.gpa),
          ieltsScore: numberOrNull(form.profile.ieltsScore),
          toeflScore: integerOrNull(form.profile.toeflScore),
          greVerbal: integerOrNull(form.profile.greVerbal),
          greQuant: integerOrNull(form.profile.greQuant),
          greAwa: numberOrNull(form.profile.greAwa),
          researchInterests: cleanList(form.profile.researchInterests),
          targetDegree: emptyToNull(form.profile.targetDegree),
          targetCountries: cleanList(form.profile.targetCountries),
          targetStartTerm: emptyToNull(form.profile.targetStartTerm),
          linkedinUrl: emptyToNull(form.profile.linkedinUrl),
          githubUrl: emptyToNull(form.profile.githubUrl),
          googleScholarUrl: emptyToNull(form.profile.googleScholarUrl),
          orcidId: emptyToNull(form.profile.orcidId),
        },
        studentProfile: {
          preferredName: emptyToNull(form.studentProfile.preferredName),
          profilePhotoUrl: emptyToNull(form.studentProfile.profilePhotoUrl),
          gender: emptyToNull(form.studentProfile.gender),
          dateOfBirth: form.studentProfile.dateOfBirth || null,
          nationality: emptyToNull(form.studentProfile.nationality),
          currentCountry: emptyToNull(form.studentProfile.currentCountry),
          city: emptyToNull(form.studentProfile.city),
          phone: emptyToNull(form.studentProfile.phone),
          whatsapp: emptyToNull(form.studentProfile.whatsapp),
          linkedin: emptyToNull(form.studentProfile.linkedin),
          github: emptyToNull(form.studentProfile.github),
          website: emptyToNull(form.studentProfile.website),
          shortBio: emptyToNull(form.studentProfile.shortBio),
          careerGoal: emptyToNull(form.studentProfile.careerGoal),
          whyInterestedInResearch: emptyToNull(form.studentProfile.whyInterestedInResearch),
          profileCompleteness: integerOrZero(form.studentProfile.profileCompleteness),
          onboardingCompleted: !!form.studentProfile.onboardingCompleted,
          onboardingStep: Math.max(1, integerOrZero(form.studentProfile.onboardingStep) || 1),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', params.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const result = await adminApi.uploadUserAvatar(params.id, file);
      setForm((current: any) => ({
        ...current,
        avatarUrl: result.avatarUrl || current.avatarUrl,
        studentProfile: {
          ...current.studentProfile,
          profilePhotoUrl: result.profilePhotoUrl || result.avatarUrl || current.studentProfile.profilePhotoUrl,
        },
      }));
      await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', params.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } finally {
      event.target.value = '';
      setUploadingAvatar(false);
    }
  };

  const toggleBan = async () => {
    if (!user) return;
    setTogglingBan(true);
    try {
      const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
      await adminApi.updateStatus(params.id, nextStatus);
      await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', params.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } finally {
      setTogglingBan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <div className="p-6 text-sm text-slate-500">User not found.</div>;
  }

  const summaryStats = [
    { label: 'Credits', value: formatCredits(user.credits?.balance || 0) },
    { label: 'Saved professors', value: user._count?.favorites || 0 },
    { label: 'Saved scholarships', value: user._count?.savedScholarships || 0 },
    { label: 'Notifications', value: user._count?.notifications || 0 },
  ];

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-[1680px] px-8 py-8">
        <div className="mb-8">
          <Link href="/dashboard/admin/users" className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </div>

        <div className="grid gap-7 2xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.95fr)]">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] text-white shadow-[0_30px_90px_rgba(2,6,23,0.5)]">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,rgba(30,41,59,0.88),rgba(15,23,42,1))] p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-white/10 ring-1 ring-white/15 shadow-[0_14px_40px_rgba(15,23,42,0.35)]">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 className="h-12 w-12 text-white/70" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-4xl font-semibold tracking-tight text-white">{user.fullName || 'Unnamed user'}</h1>
                      <span className={cx('rounded-full px-3 py-1 text-xs font-semibold capitalize', getStatusTone(user.status))}>
                        {user.status || 'unknown'}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 ring-1 ring-white/15">
                        {user.role || 'user'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-300">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Joined {user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {user.emailVerifiedAt ? 'Email verified' : 'Email not verified'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={toggleBan}
                    disabled={togglingBan}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                  >
                    {togglingBan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    {user.status === 'suspended' ? 'Unban user' : 'Ban user'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#fb7185,#f43f5e)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:brightness-110 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save changes
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-8 md:grid-cols-2 xl:grid-cols-4">
              {summaryStats.map((item) => (
                <div key={item.label} className="rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <SectionCard title="Account timeline" description="Key account dates and access signals">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem label="Created" value={user.createdAt ? formatDate(user.createdAt) : null} />
              <InfoItem label="Updated" value={user.updatedAt ? formatDate(user.updatedAt) : null} />
              <InfoItem label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'} />
              <InfoItem label="Email verified at" value={user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : 'Not verified'} />
            </div>
          </SectionCard>
        </div>

        <div className="mt-7 grid gap-7 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
          <div className="space-y-6">
            <SectionCard title="Basic account info" description="Editable login and access fields">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 rounded-3xl border border-dashed border-white/12 bg-white/[0.04] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-slate-800 ring-1 ring-white/10">
                        {form.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={form.avatarUrl} alt={form.fullName || 'User avatar'} className="h-full w-full object-cover" />
                        ) : (
                          <UserCircle2 className="h-11 w-11 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Profile photo</p>
                        <p className="mt-1 text-sm text-slate-400">Upload a new photo for this user. It updates both avatar and student profile photo.</p>
                      </div>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                      {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      {uploadingAvatar ? 'Uploading...' : 'Add New Photo'}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                    </label>
                  </div>
                </div>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-300">Full name</span>
                  <input value={form.fullName} onChange={(e) => setForm((v: any) => ({ ...v, fullName: e.target.value, studentProfile: { ...v.studentProfile, fullName: e.target.value } }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-300">Email</span>
                  <input value={form.email} onChange={(e) => setForm((v: any) => ({ ...v, email: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-300">Avatar URL</span>
                  <input value={form.avatarUrl} onChange={(e) => setForm((v: any) => ({ ...v, avatarUrl: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-300">Email verified at</span>
                  <input type="datetime-local" value={form.emailVerifiedAt} onChange={(e) => setForm((v: any) => ({ ...v, emailVerifiedAt: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-300">Role</span>
                  <select value={form.role} onChange={(e) => setForm((v: any) => ({ ...v, role: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400">
                    {['user', 'admin', 'super_admin'].map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-300">Status</span>
                  <select value={form.status} onChange={(e) => setForm((v: any) => ({ ...v, status: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400">
                    {['active', 'suspended', 'deleted'].map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Public profile" description="Academic and professional identity shown across the platform">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Current degree</span>
                  <select
                    value={form.profile.currentDegree || ''}
                    onChange={(e) => setForm((v: any) => ({ ...v, profile: { ...v.profile, currentDegree: e.target.value } }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  >
                    <option value="">Select degree</option>
                    {['bachelors', 'masters', 'phd', 'postdoc', 'other'].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Target degree</span>
                  <select
                    value={form.profile.targetDegree || ''}
                    onChange={(e) => setForm((v: any) => ({ ...v, profile: { ...v.profile, targetDegree: e.target.value } }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  >
                    <option value="">Select target degree</option>
                    {['masters', 'phd', 'postdoc'].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                {[
                  ['targetStartTerm', 'Target start term'],
                  ['linkedinUrl', 'LinkedIn'],
                  ['githubUrl', 'GitHub'],
                  ['googleScholarUrl', 'Google Scholar'],
                  ['orcidId', 'ORCID'],
                ].map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
                    <input
                      value={form.profile[key] || ''}
                      onChange={(e) => setForm((v: any) => ({ ...v, profile: { ...v.profile, [key]: e.target.value } }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                    />
                  </label>
                ))}
                {[
                  ['gpa', 'GPA', 'number'],
                  ['ieltsScore', 'IELTS score', 'number'],
                  ['toeflScore', 'TOEFL score', 'number'],
                  ['greVerbal', 'GRE verbal', 'number'],
                  ['greQuant', 'GRE quant', 'number'],
                  ['greAwa', 'GRE AWA', 'number'],
                ].map(([key, label, type]) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
                    <input
                      type={type}
                      value={form.profile[key] ?? ''}
                      onChange={(e) => setForm((v: any) => ({ ...v, profile: { ...v.profile, [key]: e.target.value } }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                    />
                  </label>
                ))}
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Bio</span>
                  <textarea
                    value={form.profile.bio || ''}
                    onChange={(e) => setForm((v: any) => ({ ...v, profile: { ...v.profile, bio: e.target.value } }))}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Research interests</span>
                  <textarea
                    value={joinList(form.profile.researchInterests)}
                    onChange={(e) => setForm((v: any) => ({ ...v, profile: { ...v.profile, researchInterests: splitList(e.target.value) } }))}
                    rows={3}
                    placeholder="Comma separated values"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Target countries</span>
                  <textarea
                    value={joinList(form.profile.targetCountries)}
                    onChange={(e) => setForm((v: any) => ({ ...v, profile: { ...v.profile, targetCountries: splitList(e.target.value) } }))}
                    rows={3}
                    placeholder="Comma separated values"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Student profile" description="Location, contact, and onboarding progress">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ['fullName', 'Student full name'],
                  ['preferredName', 'Preferred name'],
                  ['profilePhotoUrl', 'Profile photo URL'],
                  ['gender', 'Gender'],
                  ['nationality', 'Nationality'],
                  ['currentCountry', 'Current country'],
                  ['city', 'City'],
                  ['phone', 'Phone'],
                  ['whatsapp', 'WhatsApp'],
                  ['linkedin', 'Student LinkedIn'],
                  ['github', 'Student GitHub'],
                  ['website', 'Personal website'],
                ].map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
                    <input
                      value={form.studentProfile[key] || ''}
                      onChange={(e) => setForm((v: any) => ({ ...v, studentProfile: { ...v.studentProfile, [key]: e.target.value }, ...(key === 'fullName' ? { fullName: e.target.value } : {}) }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                    />
                  </label>
                ))}
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Date of birth</span>
                  <input
                    type="date"
                    value={form.studentProfile.dateOfBirth || ''}
                    onChange={(e) => setForm((v: any) => ({ ...v, studentProfile: { ...v.studentProfile, dateOfBirth: e.target.value } }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Profile completeness</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.studentProfile.profileCompleteness ?? 0}
                    onChange={(e) => setForm((v: any) => ({ ...v, studentProfile: { ...v.studentProfile, profileCompleteness: Number(e.target.value) } }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Onboarding step</span>
                  <input
                    type="number"
                    min={1}
                    value={form.studentProfile.onboardingStep ?? 1}
                    onChange={(e) => setForm((v: any) => ({ ...v, studentProfile: { ...v.studentProfile, onboardingStep: Number(e.target.value) } }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!form.studentProfile.onboardingCompleted}
                    onChange={(e) => setForm((v: any) => ({ ...v, studentProfile: { ...v.studentProfile, onboardingCompleted: e.target.checked } }))}
                  />
                  Onboarding completed
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Short bio</span>
                  <textarea
                    value={form.studentProfile.shortBio || ''}
                    onChange={(e) => setForm((v: any) => ({ ...v, studentProfile: { ...v.studentProfile, shortBio: e.target.value } }))}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Career goal</span>
                  <textarea
                    value={form.studentProfile.careerGoal || ''}
                    onChange={(e) => setForm((v: any) => ({ ...v, studentProfile: { ...v.studentProfile, careerGoal: e.target.value } }))}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Why interested in research</span>
                  <textarea
                    value={form.studentProfile.whyInterestedInResearch || ''}
                    onChange={(e) => setForm((v: any) => ({ ...v, studentProfile: { ...v.studentProfile, whyInterestedInResearch: e.target.value } }))}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </label>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Profile snapshot" description="Quick read-only overview for support and moderation">
              <div className="grid gap-4">
                <InfoItem label="Preferred name" value={user.studentProfile?.preferredName} />
                <InfoItem label="Degree" value={user.profile?.currentDegree} />
                <InfoItem label="Location" value={[user.studentProfile?.city, user.studentProfile?.currentCountry].filter(Boolean).join(', ')} />
                <InfoItem label="Nationality" value={user.studentProfile?.nationality} />
                <InfoItem label="Phone" value={user.studentProfile?.phone} />
                <InfoItem label="WhatsApp" value={user.studentProfile?.whatsapp} />
                <InfoItem label="Career goal" value={user.studentProfile?.careerGoal} />
              </div>

              <div className="mt-5 grid gap-3">
                {user.profile?.linkedinUrl ? (
                  <a href={user.profile.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 transition hover:text-white">
                    <Globe className="h-4 w-4" />
                    LinkedIn profile
                  </a>
                ) : null}
                {user.profile?.googleScholarUrl ? (
                  <a href={user.profile.googleScholarUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 transition hover:text-white">
                    <Globe className="h-4 w-4" />
                    Google Scholar
                  </a>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="System counters" description="Connected records from the database">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Email accounts', user._count?.emailAccounts || 0],
                  ['OAuth accounts', user._count?.oauthAccounts || 0],
                  ['Email threads', user._count?.emailThreads || 0],
                  ['Email messages', user._count?.emailMessages || 0],
                  ['Imports', user._count?.imports || 0],
                  ['Subscriptions', user._count?.subscriptions || 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Recent activity and relations" description="Compact relational summary instead of raw JSON">
              <div className="space-y-4">
                <RelationList
                  title="Email accounts"
                  items={user.emailAccounts}
                  renderItem={(item) => (
                    <div className="space-y-1 text-sm text-slate-300">
                      <p className="font-semibold text-white">{item.email || item.provider || 'Account'}</p>
                      <p>Status: {formatValue(item.status)}</p>
                    </div>
                  )}
                />

                <RelationList
                  title="Subscriptions"
                  items={user.subscriptions}
                  renderItem={(item) => (
                    <div className="space-y-1 text-sm text-slate-300">
                      <p className="font-semibold text-white">{item.planSlug || item.plan?.name || 'Subscription'}</p>
                      <p>Interval: {formatValue(item.interval)}</p>
                      <p>Status: {formatValue(item.status)}</p>
                    </div>
                  )}
                />

                <RelationList
                  title="Saved professors"
                  items={user.favorites}
                  renderItem={(item) => (
                    <div className="space-y-1 text-sm text-slate-300">
                      <p className="font-semibold text-white">{item.professor?.name || item.professorId || 'Professor'}</p>
                      <p>Status: {formatValue(item.status)}</p>
                      <p>Note: {formatValue(item.note)}</p>
                    </div>
                  )}
                />

                <RelationList
                  title="Notifications"
                  items={user.notifications}
                  renderItem={(item) => (
                    <div className="space-y-1 text-sm text-slate-300">
                      <p className="font-semibold text-white">{item.title || item.type || 'Notification'}</p>
                      <p>{formatValue(item.message)}</p>
                    </div>
                  )}
                />
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="mt-7 grid gap-4 xl:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_60px_rgba(2,6,23,0.35)]">
            <div className="mb-3 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-sky-300" />
              <h3 className="font-semibold text-white">Location</h3>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              {[user.studentProfile?.city, user.studentProfile?.currentCountry, user.studentProfile?.nationality].filter(Boolean).join(', ') || 'No location data available'}
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_60px_rgba(2,6,23,0.35)]">
            <div className="mb-3 flex items-center gap-3">
              <Phone className="h-5 w-5 text-sky-300" />
              <h3 className="font-semibold text-white">Contact</h3>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              Phone: {formatValue(user.studentProfile?.phone)}
              <br />
              WhatsApp: {formatValue(user.studentProfile?.whatsapp)}
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_60px_rgba(2,6,23,0.35)]">
            <div className="mb-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-sky-300" />
              <h3 className="font-semibold text-white">Onboarding</h3>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              Completed: {formatValue(user.studentProfile?.onboardingCompleted)}
              <br />
              Completeness: {user.studentProfile?.profileCompleteness ?? 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function emptyToNull(value: unknown) {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: unknown) {
  const parsed = numberOrNull(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function integerOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: unknown) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function cleanList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}
