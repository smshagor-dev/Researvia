import { ImportConsole } from "@/components/admin/ImportConsole";
import { ProfessorEnrichmentPanel } from "@/components/admin/ProfessorEnrichmentPanel";
import { requireAdmin } from "@/server/admin/admin.service";
import { getProfessorContactEnrichmentStats } from "@/server/enrichment/professor-contact-enrichment.service";
import { listImportJobs } from "@/server/imports/import.service";

export default async function AdminImportsPage() {
  const admin = await requireAdmin();
  const [jobs, enrichmentStats] = await Promise.all([listImportJobs(admin.id), getProfessorContactEnrichmentStats()]);

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-medium text-slate-500">Data operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Imports & sync</h1><p className="mt-2 text-sm text-slate-600">Validate external academic data before processing. Imported records remain drafts until explicitly published.</p></div>
    <ProfessorEnrichmentPanel stats={enrichmentStats}/>
    <ImportConsole />
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">Recent import jobs</h2></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Entity</th><th className="px-5 py-3">Format</th><th className="px-5 py-3">State</th><th className="px-5 py-3">Rows</th><th className="px-5 py-3">Processed</th><th className="px-5 py-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{jobs.map((job) => <tr key={job._id.toString()}><td className="px-5 py-4 font-medium text-slate-950">{job.entityType}</td><td className="px-5 py-4 text-slate-600">{job.format}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{job.status}</span></td><td className="px-5 py-4 text-slate-600">{job.validRows}/{job.totalRows} valid</td><td className="px-5 py-4 text-slate-600">{job.processedRows} ok · {job.failedRows} failed</td><td className="px-5 py-4 text-slate-600">{new Date(job.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>{jobs.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No import jobs yet.</p> : null}</div>
  </div>;
}
