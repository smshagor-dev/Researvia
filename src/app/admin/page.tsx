import Link from "next/link";
import { adminOverview } from "@/server/admin/admin.service";

export default async function AdminOverviewPage() {
  const overview = await adminOverview();
  const cards = [
    ["Users", overview.users, "/admin/users"],
    ["Universities", overview.universities, "/admin/content"],
    ["Professors", overview.professors, "/admin/content"],
    ["Scholarships", overview.scholarships, "/admin/content"],
    ["Opportunities", overview.opportunities, "/admin/content"],
    ["Applications", overview.applications, "/dashboard/applications"],
    ["Pending jobs", overview.pendingJobs, "/admin/jobs"],
    ["Failed jobs", overview.failedJobs, "/admin/jobs"]
  ] as const;
  return <div className="space-y-7"><div><p className="text-sm font-medium text-slate-500">Operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Admin overview</h1><p className="mt-2 text-sm text-slate-600">Content quality, users, imports, background work, and auditability in one place.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, href]) => <Link key={label} href={href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p></Link>)}</div></div>;
}
