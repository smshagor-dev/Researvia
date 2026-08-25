import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { compareSavedItems, type ComparisonResult } from "@/server/compare/compare.service";
import { AppError } from "@/server/errors/AppError";

export const metadata = { title: "Compare | ResearVia" };

type LoadResult = { comparison: ComparisonResult | null; error: string | null };

async function loadComparison(userId: string, ids: string[]): Promise<LoadResult> {
  if (ids.length === 0) return { comparison: null, error: null };
  try {
    return { comparison: await compareSavedItems(userId, ids), error: null };
  } catch (error) {
    if (error instanceof AppError) return { comparison: null, error: error.message };
    throw error;
  }
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const raw = await searchParams;
  const selected = Array.isArray(raw.saved) ? raw.saved : typeof raw.saved === "string" ? [raw.saved] : [];
  const result = await loadComparison(user.id, selected);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div><p className="text-sm font-medium text-slate-500">Decision workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Compare saved options</h1><p className="mt-2 text-sm text-slate-600">Compare two to four currently published scholarships or opportunities side by side.</p></div>
        <Link href="/dashboard/saved" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">Choose from saved items</Link>
      </div>
      {result.error ? <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{result.error}</div> : null}
      {!result.comparison && !result.error ? <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="font-semibold text-slate-950">Select items to compare</h2><p className="mt-2 text-sm text-slate-500">Open Saved items and choose 2–4 scholarships or 2–4 opportunities.</p></div> : null}
      {result.comparison ? <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="min-w-[900px] w-full border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50"><th className="w-48 px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Attribute</th>{result.comparison.items.map((item) => <th key={item.savedId} className="min-w-56 px-4 py-4"><Link href={item.href} className="font-semibold text-slate-950 hover:underline">{item.title}</Link></th>)}</tr></thead><tbody>{result.comparison.labels.map((label) => <tr key={label} className="border-b border-slate-100 align-top last:border-0"><th className="px-4 py-4 font-medium text-slate-500">{label}</th>{result.comparison?.items.map((item) => <td key={item.savedId} className="px-4 py-4 leading-6 text-slate-700">{item.fields[label] || "Not provided"}</td>)}</tr>)}</tbody></table></div> : null}
    </div>
  );
}
