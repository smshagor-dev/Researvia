import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplicationWorkspace } from "@/components/applications/ApplicationWorkspace";
import { getApplicationReadiness } from "@/server/applications/application-packet.service";
import { getApplication } from "@/server/applications/application.service";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";

async function loadApplication(userId: string, id: string) {
  try { const [data,readiness]=await Promise.all([getApplication(userId,id),getApplicationReadiness(userId,id)]); return {...data,readiness}; }
  catch (error) { if (error instanceof AppError && error.status === 404) notFound(); throw error; }
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { id } = await params; const data = await loadApplication(user.id, id); const item = data.application;
  return <div className="mx-auto max-w-6xl"><Link href="/dashboard/applications" className="text-sm font-medium text-slate-500 hover:text-slate-950">← Back to applications</Link><div className="mb-6 mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.sourceType.replaceAll("_", " ")}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{item.title}</h1><p className="mt-2 text-sm text-slate-600">{[item.organization, item.university, item.country].filter(Boolean).join(" • ") || "Private application tracker"}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${data.readiness.ready?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800"}`}>{data.readiness.score}% ready</span><span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">{item.status}</span></div></div><ApplicationWorkspace data={data} /></div>;
}
