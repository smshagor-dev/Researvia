import Link from "next/link";
import { professorSearchSchema } from "@/schemas/discovery";
import { getCurrentUser } from "@/server/auth/session";
import { searchProfessors } from "@/server/discovery/discovery.service";
import { findProfessorMatches } from "@/server/profile/professor-matching.service";

export const metadata = { title: "Professors | ResearVia" };

function pageHref(page: number, q: string, country: string, researchArea: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (country) params.set("country", country);
  if (researchArea) params.set("researchArea", researchArea);
  params.set("page", String(page));
  return `/dashboard/professors?${params.toString()}`;
}

export default async function ProfessorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = professorSearchSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : "",
    country: typeof raw.country === "string" ? raw.country : "",
    researchArea: typeof raw.researchArea === "string" ? raw.researchArea : "",
    page: typeof raw.page === "string" ? raw.page : 1,
    limit: 20
  });
  const query = parsed.success ? parsed.data : { q: "", country: "", researchArea: "", universityId: undefined, page: 1, limit: 20 };
  const user = await getCurrentUser();
  const [result, recommendations] = await Promise.all([
    searchProfessors(query),
    user?.role === "STUDENT" ? findProfessorMatches(user.id, 6) : Promise.resolve({ profileStrength: 0, items: [] })
  ]);

  return <div className="mx-auto max-w-6xl">
    <div className="border-b border-slate-200 pb-6"><p className="text-sm font-medium text-slate-500">Academic discovery</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Professor Finder</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Discover published professor records and get personalized matches from your research interests, keywords, publications, methods, skills, academic background and target countries.</p></div>

    {user?.role === "STUDENT" ? <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-base font-semibold text-slate-950">Recommended for your research profile</h2><p className="mt-1 text-sm text-slate-500">Profile signal strength: {recommendations.profileStrength}%. Complete your structured profile to improve ranking quality.</p></div><Link href="/dashboard/profile" className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">Improve profile</Link></div>
      {recommendations.items.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{recommendations.items.map((professor) => <Link key={professor.id} href={`/dashboard/professors/${professor.slug}`} className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">{professor.fullName}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{professor.title || professor.department || "Academic"}</p></div><span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">{professor.matchScore}%</span></div><p className="mt-3 text-sm font-medium text-slate-700">{professor.universityName || professor.country}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{professor.researchAreas.join(" • ") || "Research areas not provided."}</p>{professor.matchReasons.length ? <div className="mt-3 flex flex-wrap gap-1.5">{professor.matchReasons.slice(0, 3).map((reason) => <span key={reason} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{reason}</span>)}</div> : null}</Link>)}</div> : <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">Add your research profile, skills and education to unlock personalized professor matches.</div>}
    </section> : null}

    <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_180px_220px_auto]"><input name="q" defaultValue={query.q} placeholder="Professor, department or keyword" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"/><input name="country" defaultValue={query.country} placeholder="Country" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"/><input name="researchArea" defaultValue={query.researchArea} placeholder="Research area" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"/><button className="h-10 rounded-lg bg-slate-950 px-5 text-sm font-medium text-white hover:bg-slate-800">Search</button></form>
    <div className="mt-6 flex items-center justify-between text-sm text-slate-500"><span>{result.total} published professors</span><span>Page {result.page} of {result.pages}</span></div>
    {result.items.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><h2 className="text-base font-semibold text-slate-950">No matching professor records yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Only real, published records are shown. Broaden the filters or return after additional open academic sources have been imported.</p></div> : <div className="mt-6 grid gap-4 md:grid-cols-2">{result.items.map((professor) => <Link key={professor.id} href={`/dashboard/professors/${professor.slug}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-950">{professor.fullName}</h2><p className="mt-1 text-sm text-slate-500">{professor.title || professor.department || "Academic title not provided"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{professor.country}</span></div><p className="mt-3 text-sm font-medium text-slate-700">{professor.universityName || "University not provided"}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{professor.researchAreas.join(" • ") || "Research areas not provided by the current source."}</p></Link>)}</div>}
    {result.total > 0 ? <div className="mt-8 flex items-center justify-between"><Link aria-disabled={result.page <= 1} className={`rounded-lg border px-4 py-2 text-sm font-medium ${result.page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} href={pageHref(Math.max(1,result.page-1),query.q,query.country,query.researchArea)}>Previous</Link><Link aria-disabled={result.page >= result.pages} className={`rounded-lg border px-4 py-2 text-sm font-medium ${result.page >= result.pages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} href={pageHref(Math.min(result.pages,result.page+1),query.q,query.country,query.researchArea)}>Next</Link></div> : null}
  </div>;
}
