import { redirect } from "next/navigation";
import { Brand } from "@/components/brand/Brand";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { getCurrentUser } from "@/server/auth/session";
import { getStudentProfile } from "@/server/profile/profile.service";

export const metadata = { title: "Set up your academic profile | ResearVia" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/");

  const profile = await getStudentProfile(user.id);
  if (profile.onboardingCompletedAt) redirect("/dashboard");

  return (
    <main className="min-h-svh bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Brand />
          <span className="text-xs font-medium text-slate-500">Free student workspace</span>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-medium text-slate-500">Welcome, {user.displayName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Build your academic profile</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">A complete profile will let ResearVia match your background with professors, scholarships and research opportunities without charging students.</p>
        </div>
        <OnboardingForm initialProfile={profile} />
      </div>
    </main>
  );
}
