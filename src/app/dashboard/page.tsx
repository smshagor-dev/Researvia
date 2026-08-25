import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getStudentProfile } from "@/server/profile/profile.service";

export const metadata = { title: "Dashboard | ResearVia" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getStudentProfile(user.id);
  if (!profile.onboardingCompletedAt) redirect("/onboarding");

  const firstName = user.displayName.trim().split(/\s+/)[0] || "Student";
  const metrics = [
    { label: "Profile completion", value: `${profile.completion}%`, note: "Academic profile strength" },
    { label: "Research interests", value: String(profile.researchInterests.length), note: "Areas used for matching" },
    { label: "Target countries", value: String(profile.targetCountries.length), note: "Preferred study destinations" },
    { label: "Target paths", value: String(profile.targetDegrees.length), note: "Degree and research goals" }
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Student workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Welcome back, {firstName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your academic profile is ready to power ResearVia discovery and application tools as they are added.</p>
        </div>
        <Link href="/dashboard/profile" className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
          Edit academic profile
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <section key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{metric.note}</p>
          </section>
        ))}
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Academic direction</h2>
              <p className="mt-1 text-sm text-slate-500">The profile information that will drive matching.</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Current study</dt><dd className="mt-1 text-sm font-medium text-slate-900">{profile.currentUniversity}</dd><dd className="text-sm text-slate-500">{profile.fieldOfStudy}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Country</dt><dd className="mt-1 text-sm font-medium text-slate-900">{profile.country}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Research interests</dt><dd className="mt-1 text-sm text-slate-700">{profile.researchInterests.join(", ")}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Target countries</dt><dd className="mt-1 text-sm text-slate-700">{profile.targetCountries.join(", ")}</dd></div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-slate-300">Free for students</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">No subscription. No premium profile.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Your profile and future discovery tools remain part of the free student workspace.</p>
        </section>
      </div>
    </div>
  );
}
