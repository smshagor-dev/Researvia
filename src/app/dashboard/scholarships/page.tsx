import Link from "next/link";
import { DeadlineBadge } from "@/components/discovery/DeadlineBadge";
import { scholarshipSearchSchema } from "@/schemas/opportunities";
import { searchScholarships, type DeadlineState } from "@/server/opportunities/opportunity.service";

export const metadata = { title: "Scholarships | ResearVia" };

function pageHref(page: number, query: { q: string; country: string; degree: string; fundingType: string; openOnly: boolean }) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.country) params.set("country", query.country);
  if (query.degree) params.set("degree", query.degree);
  if (query.fundingType) params.set("fundingType", query.fundingType);
  if (query.openOnly) params.set("openOnly", "true");
  params.set("page", String(page));
  return `/dashboard/scholarships?${params.toString()}`;
}

export default async function ScholarshipsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = scholarshipSearchSchema.safeParse({ q: typeof raw.q === "string" ? raw.q : "", country: typeof raw.country === "string" ? raw.country : "", degree: typeof raw.degree === "string" ? raw.degree : "", fundingType: typeof raw.fundingType === "string" ? raw.fundingType : "", openOnly: raw.openOnly === "true" ? "true" : "false", page: typeof raw.page === "string" ? raw.page : 1, limit: 20 });
  const query = parsed.success ? parsed.data : { q: "", country: "", degree: "", fundingType: "" as const, openOnly: false, page: 1, limit: 20 };
  const result = await searchScholarships(query);
  return <div className="mx-auto max-w-6xl"><div className="border-b border-slate-200 pb-6"><p className="text-sm font-medium text-slate-500">Funding discovery</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Scholarships</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Browse published funding records with source links and explicit deadline confidence. ResearVia never invents missing dates or eligibility.</p></div>
    <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_170px_160px_170px_auto]"><input name="q" defaultValue={query.q} placeholder="Scholarship or provider" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"/><input name="country" defaultValue={query.country} placeholder="Country" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"/><input name="degree" defaultValue={query.degree} placeholder="Degree level" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"/><select name="fundingType" defaultValue={query.fundingType} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Any funding</option><option value="FULL">Full</option><option value="PARTIAL">Partial</option><option value="OTHER">Other</option><option value="UNKNOWN">Unknown</option></select><button className="h-10 rounded-lg bg-slate-950 px-5 text-sm font-medium text-white">Search</button><label className="flex items-center gap-2 text-sm text-slate-600 lg:col-span-5"><input type="checkbox" name="openOnly" value="true" defaultChecked={query.openOnly}/> Show only records not known to be closed</label></form>
    <div className="mt-6 flex items-center justify-between text-sm text-slate-500"><span>{result.total} published scholarships</span><span>Page {result.page} of {result.pages}</span></div>
    {result.items.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="font-semibold text-slate-950">No matching scholarship records yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Only sourced and published records are shown. Try broader filters or return after additional data is imported.</p></div> : <div className="mt-6 space-y-4">{result.items.map((item) => <Link key={item.id} href={`/dashboard/scholarships/${item.slug}`} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{item.provider} • {item.country}</p></div><DeadlineBadge state={item.deadlineState as DeadlineState}/></div><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600"><span className="rounded-full bg-slate-100 px-2.5 py-1">{item.fundingType} funding</span>{item.degreeLevels.slice(0,3).map((degree) => <span key={degree} className="rounded-full bg-slate-100 px-2.5 py-1">{degree}</span>)}</div>{item.deadline ? <p className="mt-4 text-sm text-slate-600">Deadline: {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.deadline))}</p> : <p className="mt-4 text-sm text-slate-500">Deadline not provided by source</p>}</Link>)}</div>}
    {result.total > 0 ? <div className="mt-8 flex items-center justify-between"><Link aria-disabled={result.page <= 1} className={`rounded-lg border px-4 py-2 text-sm font-medium ${result.page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} href={pageHref(Math.max(1, result.page - 1), query)}>Previous</Link><Link aria-disabled={result.page >= result.pages} className={`rounded-lg border px-4 py-2 text-sm font-medium ${result.page >= result.pages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} href={pageHref(Math.min(result.pages, result.page + 1), query)}>Next</Link></div> : null}
  </div>;
}
