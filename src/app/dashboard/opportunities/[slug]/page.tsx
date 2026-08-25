import Link from "next/link";
import { notFound } from "next/navigation";
import { DeadlineBadge } from "@/components/discovery/DeadlineBadge";
import { SaveButton } from "@/components/saved/SaveButton";
import { AppError } from "@/server/errors/AppError";
import { getOpportunityBySlug, type DeadlineState } from "@/server/opportunities/opportunity.service";

async function loadOpportunity(slug: string) {
  try {
    return await getOpportunityBySlug(slug);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await loadOpportunity(slug);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/opportunities" className="text-sm font-medium text-slate-500">← Back to opportunities</Link>
      <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.type.replaceAll("_", " ")}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{item.title}</h1><p className="mt-2 text-sm text-slate-600">{item.organization} • {[item.city, item.country].filter(Boolean).join(", ")}</p></div>
          <div className="flex items-center gap-2"><DeadlineBadge state={item.deadlineState as DeadlineState} /><SaveButton itemType="OPPORTUNITY" targetId={item.id} /></div>
        </div>
        <p className="mt-7 whitespace-pre-line text-sm leading-7 text-slate-600">{item.description || "Description not provided by the current source."}</p>
        <div className="mt-6 flex flex-wrap gap-2">{item.researchAreas.map((area) => <span key={area} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{area}</span>)}</div>
        <dl className="mt-7 grid gap-5 border-y border-slate-100 py-6 sm:grid-cols-3"><div><dt className="text-xs uppercase text-slate-400">Deadline</dt><dd className="mt-1 text-sm font-semibold">{item.deadline ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(item.deadline)) : "Unknown"}</dd></div><div><dt className="text-xs uppercase text-slate-400">Funding</dt><dd className="mt-1 text-sm text-slate-700">{item.funding || "Not provided"}</dd></div><div><dt className="text-xs uppercase text-slate-400">Required documents</dt><dd className="mt-1 text-sm text-slate-700">{item.requiredDocuments.join(", ") || "Not provided"}</dd></div></dl>
        <section className="mt-6"><h2 className="font-semibold">Eligibility</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{item.eligibility || "Not provided by current source."}</p></section>
        <div className="mt-7 flex flex-wrap gap-3"><a href={item.applicationUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">Official application</a><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Verify source</a>{item.universitySlug ? <Link href={`/dashboard/universities/${item.universitySlug}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">University</Link> : null}{item.professorSlug ? <Link href={`/dashboard/professors/${item.professorSlug}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Professor</Link> : null}</div>
      </article>
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Verify current availability, deadline, funding and eligibility on the official source before applying.</div>
    </div>
  );
}
