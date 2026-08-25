import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getStudentProfile } from "@/server/profile/profile.service";

export const metadata = { title: "Dashboard | ResearVia" };

export default async function DashboardPage() {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const profile = await getStudentProfile(user.id); if (!profile.onboardingCompletedAt) redirect("/onboarding");
  const firstName = user.displayName.trim().split(/\s+/)[0] || "Student";
  const metrics = [
    { label: "Profile completion", value: `${profile.completion}%`, note: "Academic profile strength" },
    { label: "Research interests", value: String(profile.researchInterests.length), note: "Areas used for matching" },
    { label: "Target countries", value: String(profile.targetCountries.length), note: "Preferred study destinations" },
    { label: "Target paths", value: String(profile.targetDegrees.length), note: "Degree and research goals" }
  ];
  return <div className="mx-auto max-w-6xl"><div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-slate-500">Student workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Welcome back, {firstName}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your academic profile now connects to real university and professor discovery records stored in ResearVia.</p></div><Link href="/dashboard/profile" className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800">Edit academic profile</Link></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <section key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{metric.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{metric.note}</p></section>)}</div>
    <div className="mt-7 grid gap-4 md:grid-cols-2"><Link href="/dashboard/professors" className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"><p className="text-sm font-medium text-slate-500">Discover researchers</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Find professors</h2><p className="mt-2 text-sm leading-6 text-slate-600">Search published records by research area, university and country.</p><span className="mt-5 inline-block text-sm font-semibold text-slate-950">Open professor directory →</span></Link><Link href="/dashboard/universities" className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"><p className="text-sm font-medium text-slate-500">Explore institutions</p><h2 className="mt-2 text-xl font-semibold text-slate-950">Browse universities</h2><p className="mt-2 text-sm leading-6 text-slate-600">Review institutions and the professor records linked to them.</p><span className="mt-5 inline-block text-sm font-semibold text-slate-950">Open university directory →</span></Link></div>
  </div>;
}
