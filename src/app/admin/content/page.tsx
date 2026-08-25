import { ContentStatusActions } from "@/components/admin/ContentStatusActions";
import { requireAdmin } from "@/server/admin/admin.service";
import { connectDatabase } from "@/server/db/mongoose";
import { Opportunity } from "@/server/models/Opportunity";
import { Professor } from "@/server/models/Professor";
import { Scholarship } from "@/server/models/Scholarship";
import { University } from "@/server/models/University";

type ContentType = "university" | "professor" | "scholarship" | "opportunity";
type ContentRow = { id: string; title: string; subtitle: string; status: string; source: string; createdAt: Date };

async function loadRows(type: ContentType): Promise<ContentRow[]> {
  await connectDatabase();
  if (type === "university") return (await University.find().sort({ createdAt: -1 }).limit(100).lean()).map((row) => ({ id: row._id.toString(), title: row.name, subtitle: `${row.country}${row.city ? ` • ${row.city}` : ""}`, status: row.status, source: row.source, createdAt: new Date(row.createdAt) }));
  if (type === "professor") return (await Professor.find().sort({ createdAt: -1 }).limit(100).lean()).map((row) => ({ id: row._id.toString(), title: row.fullName, subtitle: `${row.department || "No department"} • ${row.country}`, status: row.status, source: row.source, createdAt: new Date(row.createdAt) }));
  if (type === "scholarship") return (await Scholarship.find().sort({ createdAt: -1 }).limit(100).lean()).map((row) => ({ id: row._id.toString(), title: row.name, subtitle: `${row.provider} • ${row.country}`, status: row.status, source: row.source, createdAt: new Date(row.createdAt) }));
  return (await Opportunity.find().sort({ createdAt: -1 }).limit(100).lean()).map((row) => ({ id: row._id.toString(), title: row.title, subtitle: `${row.organization} • ${row.country}`, status: row.status, source: row.source, createdAt: new Date(row.createdAt) }));
}

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const allowed: ContentType[] = ["university", "professor", "scholarship", "opportunity"];
  const type: ContentType = allowed.includes(params.type as ContentType) ? params.type as ContentType : "university";
  const rows = await loadRows(type);

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-medium text-slate-500">Publishing control</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Academic content</h1><p className="mt-2 text-sm text-slate-600">Review imported and manually curated records before they become student-visible. Imports arrive as drafts by default.</p></div>
    <div className="flex flex-wrap gap-2">{allowed.map((item) => <a key={item} href={`/admin/content?type=${item}`} className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${item === type ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{item}s</a>)}</div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Record</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Publishing state</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="align-top"><td className="px-5 py-4"><p className="font-medium text-slate-950">{row.title}</p><p className="mt-1 text-xs text-slate-500">{row.subtitle}</p></td><td className="px-5 py-4 text-slate-600">{row.source}</td><td className="px-5 py-4 text-slate-600">{row.createdAt.toLocaleDateString()}</td><td className="px-5 py-4"><ContentStatusActions type={type} id={row.id} status={row.status}/></td></tr>)}</tbody></table></div>{rows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No {type} records yet.</p> : null}</div>
  </div>;
}
