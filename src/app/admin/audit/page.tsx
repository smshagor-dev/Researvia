import { requireAdmin, listAuditLogs } from "@/server/admin/admin.service";

function summarizeMetadata(value: unknown): string {
  if (!value || typeof value !== "object") return "—";
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 6).map(([key, item]) => `${key}: ${typeof item === "string" || typeof item === "number" || typeof item === "boolean" ? String(item) : "[data]"}`);
  return entries.length ? entries.join(" · ") : "—";
}

export default async function AdminAuditPage() {
  await requireAdmin();
  const logs = await listAuditLogs(200);
  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm font-medium text-slate-500">Security history</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Audit log</h1><p className="mt-2 text-sm text-slate-600">Recent sensitive and administrative actions. Secrets and raw provider tokens are never rendered here.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Action</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Target</th><th className="px-5 py-3">Context</th><th className="px-5 py-3">Time</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((log) => <tr key={log._id.toString()} className="align-top"><td className="px-5 py-4 font-medium text-slate-950">{log.action}</td><td className="px-5 py-4 text-xs text-slate-500">{log.actorUserId ? log.actorUserId.toString() : "system"}</td><td className="px-5 py-4"><p className="text-slate-700">{log.targetType}</p><p className="mt-1 max-w-[220px] truncate text-xs text-slate-400">{log.targetId || "—"}</p></td><td className="max-w-lg px-5 py-4 text-xs leading-5 text-slate-500">{summarizeMetadata(log.metadata)}</td><td className="px-5 py-4 whitespace-nowrap text-slate-600">{new Date(log.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>{logs.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No audit records yet.</p> : null}</div></div>;
}
