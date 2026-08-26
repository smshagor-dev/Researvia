import Link from "next/link";
import { notFound } from "next/navigation";
import { SaveButton } from "@/components/saved/SaveButton";
import { getProfessorBySlug } from "@/server/discovery/discovery.service";
import { AppError } from "@/server/errors/AppError";

async function loadProfessor(slug: string) {
  try { return await getProfessorBySlug(slug); }
  catch (error) { if (error instanceof AppError && error.status === 404) notFound(); throw error; }
}

export default async function ProfessorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const professor = await loadProfessor(slug);
  return <div className="mx-auto max-w-5xl">
    <Link href="/dashboard/professors" className="text-sm font-medium text-slate-500 hover:text-slate-950">← Back to professors</Link>
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-slate-500">{professor.title || professor.department || "Academic profile"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{professor.fullName}</h1><p className="mt-2 text-sm text-slate-600">{professor.universityName}{professor.country ? ` • ${professor.country}` : ""}</p></div><div className="flex flex-wrap items-center gap-2"><span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Source: {professor.source}</span><span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Contact: {professor.contactEnrichmentStatus}</span>{professor.contactConfidence !== "NONE" ? <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">Confidence: {professor.contactConfidence}</span> : null}<SaveButton itemType="PROFESSOR" targetId={professor.id} /></div></div>
      {professor.researchAreas.length ? <div className="mt-6 flex flex-wrap gap-2">{professor.researchAreas.map((area) => <span key={area} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{area}</span>)}</div> : null}
      <p className="mt-6 text-sm leading-7 text-slate-600">{professor.bio || "No biography is available from the current verified source."}</p>
      <dl className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-3"><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Publications</dt><dd className="mt-1 text-lg font-semibold text-slate-950">{professor.publicationCount}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Citations</dt><dd className="mt-1 text-lg font-semibold text-slate-950">{professor.citedByCount}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Department</dt><dd className="mt-1 text-sm font-medium text-slate-900">{professor.department || "Not provided"}</dd></div></dl>
      {(professor.email || professor.website) ? <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Public contact provenance</p><p className="mt-1">Email source: {professor.contactEmailSource} · Website source: {professor.contactWebsiteSource}{professor.contactEnrichedAt ? ` · Enriched ${new Date(professor.contactEnrichedAt).toLocaleDateString()}` : ""}</p></div> : null}
      <div className="mt-7 flex flex-wrap gap-3">
        {professor.email ? <Link href={`/dashboard/outreach?professorId=${encodeURIComponent(professor.id)}`} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">Start outreach</Link> : null}
        {professor.universitySlug ? <Link href={`/dashboard/universities/${professor.universitySlug}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">View university</Link> : null}
        {professor.website ? <a href={professor.website} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Academic website</a> : null}
        {professor.email ? <a href={`mailto:${professor.email}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Email directly</a> : null}
        {professor.sourceUrl ? <a href={professor.sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">View source</a> : null}
      </div>
    </div>
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Contact data is collected only from public scholarly/official sources. ResearVia does not manufacture guessed email addresses. Always verify current affiliation, supervision availability and funding information before outreach.</div>
  </div>;
}
