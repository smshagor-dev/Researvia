import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/server/errors/AppError";
import { getUniversityBySlug, searchProfessors } from "@/server/discovery/discovery.service";

export default async function UniversityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const university = await getUniversityBySlug(slug);
    const professors = await searchProfessors({ q: "", country: "", researchArea: "", universityId: university.id, page: 1, limit: 12 });
    return (
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/universities" className="text-sm font-medium text-slate-500 hover:text-slate-950">← Back to universities</Link>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-slate-500">{[university.city, university.region, university.country].filter(Boolean).join(", ")}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{university.name}</h1></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Source: {university.source}</span></div>
          <p className="mt-6 text-sm leading-7 text-slate-600">{university.description || "No description is available from the current verified source."}</p>
          <div className="mt-6 flex flex-wrap gap-3">{university.website ? <a href={university.website} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">University website</a> : null}{university.sourceUrl ? <a href={university.sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">View source</a> : null}</div>
        </div>

        <section className="mt-7"><div className="flex items-end justify-between"><div><p className="text-sm font-medium text-slate-500">Published faculty records</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Professors at this university</h2></div><span className="text-sm text-slate-500">{professors.total} records</span></div>
          {professors.items.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">No published professor records are linked to this university yet.</div> : <div className="mt-4 grid gap-4 sm:grid-cols-2">{professors.items.map((professor) => <Link key={professor.id} href={`/dashboard/professors/${professor.slug}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300"><h3 className="font-semibold text-slate-950">{professor.fullName}</h3><p className="mt-1 text-sm text-slate-500">{professor.department || professor.title || "Department not provided"}</p><p className="mt-3 text-sm text-slate-600">{professor.researchAreas.slice(0, 3).join(" • ") || "Research areas not provided"}</p></Link>)}</div>}
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}
