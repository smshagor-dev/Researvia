import Link from "next/link";
import { universitySearchSchema } from "@/schemas/discovery";
import { searchUniversities } from "@/server/discovery/discovery.service";

export const metadata = { title: "Universities | ResearVia" };

function pageHref(page: number, q: string, country: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (country) params.set("country", country);
  params.set("page", String(page));
  return `/dashboard/universities?${params.toString()}`;
}

export default async function UniversitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = universitySearchSchema.safeParse({ q: typeof raw.q === "string" ? raw.q : "", country: typeof raw.country === "string" ? raw.country : "", page: typeof raw.page === "string" ? raw.page : 1, limit: 20 });
  const query = parsed.success ? parsed.data : { q: "", country: "", page: 1, limit: 20 };
  const result = await searchUniversities(query);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-medium text-slate-500">Academic discovery</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Universities</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Search verified university records already ingested into ResearVia. Unknown data is never filled with generated facts.</p>
      </div>

      <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto]">
        <input name="q" defaultValue={query.q} placeholder="Search university name or city" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
        <input name="country" defaultValue={query.country} placeholder="Country" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
        <button className="h-10 rounded-lg bg-slate-950 px-5 text-sm font-medium text-white hover:bg-slate-800">Search</button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500"><span>{result.total} published universities</span><span>Page {result.page} of {result.pages}</span></div>

      {result.items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-950">No matching universities yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">ResearVia only shows records that have actually been imported and published. Try a broader search or return after more open academic data has been synced.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {result.items.map((university) => (
            <Link key={university.id} href={`/dashboard/universities/${university.slug}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-950">{university.name}</h2><p className="mt-1 text-sm text-slate-500">{[university.city, university.country].filter(Boolean).join(", ")}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{university.source}</span></div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{university.description || "No description has been provided by the current data source."}</p>
            </Link>
          ))}
        </div>
      )}

      {result.total > 0 ? <div className="mt-8 flex items-center justify-between"><Link aria-disabled={result.page <= 1} className={`rounded-lg border px-4 py-2 text-sm font-medium ${result.page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} href={pageHref(Math.max(1, result.page - 1), query.q, query.country)}>Previous</Link><Link aria-disabled={result.page >= result.pages} className={`rounded-lg border px-4 py-2 text-sm font-medium ${result.page >= result.pages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} href={pageHref(Math.min(result.pages, result.page + 1), query.q, query.country)}>Next</Link></div> : null}
    </div>
  );
}
