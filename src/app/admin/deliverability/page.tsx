import { SuppressionAction } from "@/components/admin/SuppressionAction";
import { requireAdmin } from "@/server/admin/admin.service";
import { listDeliverabilityAdmin } from "@/server/email/deliverability.service";

export const dynamic = "force-dynamic";

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function tone(value: string) {
  if (["CRITICAL", "BOUNCE", "COMPLAINT", "UNSUBSCRIBE"].includes(value)) return "bg-rose-50 text-rose-700";
  if (["WARNING", "FAILED"].includes(value)) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminDeliverabilityPage() {
  const admin = await requireAdmin();
  const data = await listDeliverabilityAdmin(200);
  const canOverride = admin.role === "SUPER_ADMIN";
  return <div className="mx-auto max-w-7xl space-y-7">
    <div><p className="text-sm font-medium text-slate-500">Operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Mail deliverability</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Track signed provider delivery feedback and prevent repeated sending to addresses that permanently bounced, complained, or unsubscribed. Suppression overrides are restricted to super administrators and audited.</p></div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active suppressions</p><p className="mt-2 text-3xl font-semibold text-slate-950">{data.summary.activeSuppressions}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Critical events 24h</p><p className="mt-2 text-3xl font-semibold text-slate-950">{data.summary.critical24h}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Failed events 24h</p><p className="mt-2 text-3xl font-semibold text-slate-950">{data.summary.failed24h}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Delivered events 24h</p><p className="mt-2 text-3xl font-semibold text-slate-950">{data.summary.delivered24h}</p></div>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-semibold text-slate-950">Suppression registry</h2><p className="mt-1 text-sm text-slate-500">Active entries are blocked before user-generated system or connected-account mail is sent.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Recipient</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">State</th><th className="px-5 py-3">Last event</th><th className="px-5 py-3">Detail</th>{canOverride ? <th className="px-5 py-3">Control</th> : null}</tr></thead><tbody className="divide-y divide-slate-100">{data.suppressions.map((row) => <tr key={row.id} className="align-top"><td className="px-5 py-4 font-medium text-slate-950">{row.email}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(row.reason)}`}>{row.reason}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.active ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{row.active ? "Suppressed" : "Restored"}</span></td><td className="px-5 py-4 text-slate-600">{when(row.lastEventAt)}</td><td className="max-w-lg px-5 py-4 text-xs leading-5 text-slate-500">{row.detail || "—"}</td>{canOverride ? <td className="px-5 py-4"><SuppressionAction id={row.id} active={row.active}/></td> : null}</tr>)}</tbody></table></div>
      {!data.suppressions.length ? <p className="p-8 text-center text-sm text-slate-500">No suppressed recipients.</p> : null}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-semibold text-slate-950">Recent provider events</h2><p className="mt-1 text-sm text-slate-500">Mailgun event IDs are stored idempotently so webhook retries cannot duplicate delivery state.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Event</th><th className="px-5 py-3">Recipient</th><th className="px-5 py-3">Occurred</th><th className="px-5 py-3">Message ID</th><th className="px-5 py-3">Detail</th></tr></thead><tbody className="divide-y divide-slate-100">{data.events.map((row) => <tr key={row.id} className="align-top"><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(row.severity)}`}>{row.eventType}</span><p className="mt-2 text-[11px] text-slate-400">{row.provider}</p></td><td className="px-5 py-4 font-medium text-slate-900">{row.recipient}</td><td className="px-5 py-4 text-slate-600">{when(row.occurredAt)}</td><td className="max-w-xs px-5 py-4 text-xs text-slate-500"><span className="block truncate">{row.messageId || "—"}</span></td><td className="max-w-lg px-5 py-4 text-xs leading-5 text-slate-500">{row.detail || "—"}</td></tr>)}</tbody></table></div>
      {!data.events.length ? <p className="p-8 text-center text-sm text-slate-500">No provider delivery events have been received yet.</p> : null}
    </section>
  </div>;
}
