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
  const discovery = [
    { href: "/dashboard/professors", eyebrow: "Researchers", title: "Find professors", description: "Search published professor records by research area, university and country." },
    { href: "/dashboard/universities", eyebrow: "Institutions", title: "Browse universities", description: "Explore university records and the professors linked to them." },
    { href: "/dashboard/scholarships", eyebrow: "Funding", title: "Find scholarships", description: "Review sourced funding opportunities with explicit deadline confidence." },
    { href: "/dashboard/opportunities", eyebrow: "Academic paths", title: "Find opportunities", description: "Explore PhD roles, research positions, internships, fellowships and programs." }
  ];
  return <div className="mx-auto max-w-6xl"><div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-slate-500">Student workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Welcome back, {firstName}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your academic profile connects to source-backed professor, university, scholarship and opportunity discovery.</p></div><Link href="/dashboard/profile" className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800">Edit academic profile</Link></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <section key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{metric.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{metric.note}</p></section>)}</div>
    <div className="mt-7 grid gap-4 md:grid-cols-2">{discovery.map((item)=><Link key={item.href} href={item.href} className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"><p className="text-sm font-medium text-slate-500">{item.eyebrow}</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p><span className="mt-5 inline-block text-sm font-semibold text-slate-950">Open directory →</span></Link>)}</div>
  </div>;
}
