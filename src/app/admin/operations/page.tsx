import Link from "next/link";
import { requireAdmin } from "@/server/admin/admin.service";
import { getOperationalHealth, type OperationalStatus } from "@/server/admin/operational-health.service";

export const dynamic = "force-dynamic";

function statusClass(status: OperationalStatus) {
  if (status === "CRITICAL") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "DEGRADED") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function StatusBadge({ status }: { status: OperationalStatus }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>{status.toLowerCase()}</span>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xl font-semibold text-slate-950">{value}</p></div>;
}

function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function AdminOperationsPage() {
  await requireAdmin();
  const health = await getOperationalHealth();
  const cards = [
    { key: "providers", title: "Connected providers", status: health.providers.status, description: "Google and Microsoft mailbox connection and synchronization health." },
    { key: "feeds", title: "Academic feeds", status: health.feeds.status, description: "Scholarship and opportunity feed freshness and provider errors." },
    { key: "mail", title: "System mail", status: health.mail.status, description: "ResearVia mailboxes, IMAP synchronization and automatic-reply delivery." },
    { key: "push", title: "Push delivery", status: health.push.status, description: "Browser/PWA push subscription delivery quality." },
    { key: "queue", title: "Background queue", status: health.queue.status, description: "Durable jobs, worker locks, retries, failures and runnable backlog." }
  ] as const;

  return <div className="mx-auto max-w-7xl space-y-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-sm font-medium text-slate-500">Operations</p><div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Platform health</h1><StatusBadge status={health.overall}/></div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Live operational view across external email providers, academic feeds, system mail, push delivery and the durable worker queue. No credentials or provider secrets are exposed here.</p></div>
      <div className="text-right text-xs text-slate-500"><p>Snapshot</p><p className="mt-1 font-medium text-slate-700">{new Date(health.generatedAt).toLocaleString()}</p></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map((card) => <a key={card.key} href={`#${card.key}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">{card.title}</h2><StatusBadge status={card.status}/></div><p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p></a>)}</div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Active incidents</h2><p className="mt-1 text-sm text-slate-500">Actionable conditions derived from current operational state.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{health.incidents.length}</span></div>
      {health.incidents.length ? <div className="mt-4 divide-y divide-slate-100">{health.incidents.map((incident, index) => <div key={`${incident.category}-${incident.title}-${index}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${incident.severity === "CRITICAL" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{incident.severity}</span><span className="text-xs font-semibold text-slate-400">{incident.category}</span></div><p className="mt-2 font-medium text-slate-950">{incident.title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{incident.detail}</p></div><Link href={incident.href} className="shrink-0 text-sm font-semibold text-slate-900 hover:underline">Inspect →</Link></div>)}</div> : <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">No active operational incidents were detected in this snapshot.</div>}
    </section>

    <section id="providers" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-950">Connected email providers</h2><p className="mt-1 text-sm text-slate-500">OAuth mailbox connection and metadata synchronization state.</p></div><StatusBadge status={health.providers.status}/></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Total" value={health.providers.total}/><Metric label="Connected" value={health.providers.connected}/><Metric label="Reauth required" value={health.providers.reauthRequired}/><Metric label="Disconnected" value={health.providers.disconnected}/><Metric label="Stale >48h" value={health.providers.staleSync}/></div>
    </section>

    <section id="feeds" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-950">Academic feed synchronization</h2><p className="mt-1 text-sm text-slate-500">Freshness and errors for automatic scholarship/opportunity ingestion.</p></div><StatusBadge status={health.feeds.status}/></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Sources" value={health.feeds.total}/><Metric label="Active" value={health.feeds.active}/><Metric label="Inactive" value={health.feeds.inactive}/><Metric label="Errors" value={health.feeds.errors}/><Metric label="Stale / never synced" value={health.feeds.staleOrNeverSynced}/></div>
      {health.recentFeedErrors.length ? <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Feed</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Last sync</th><th className="px-4 py-3">Error</th></tr></thead><tbody className="divide-y divide-slate-100">{health.recentFeedErrors.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium text-slate-900">{row.name}</td><td className="px-4 py-3 text-slate-600">{row.entityType}</td><td className="px-4 py-3 text-slate-600">{when(row.lastSyncedAt)}</td><td className="max-w-xl px-4 py-3 text-xs leading-5 text-rose-700">{row.error}</td></tr>)}</tbody></table></div> : null}
      <div className="mt-4"><Link href="/admin/data-sources" className="text-sm font-semibold text-slate-900 hover:underline">Manage feed sources →</Link></div>
    </section>

    <section id="mail" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-950">System mail</h2><p className="mt-1 text-sm text-slate-500">Mailbox availability, IMAP/configuration state and recent automatic-reply health.</p></div><StatusBadge status={health.mail.status}/></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><Metric label="Mailboxes" value={health.mail.mailboxes}/><Metric label="Active" value={health.mail.activeMailboxes}/><Metric label="IMAP enabled" value={health.mail.imapEnabled}/><Metric label="IMAP errors" value={health.mail.imapErrors}/><Metric label="Vacation reply failures 24h" value={health.mail.vacationFailed24h}/><Metric label="Config errors" value={health.mail.configErrors}/></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Inbound 24h" value={health.mail.inbound24h}/><Metric label="Outbound 24h" value={health.mail.outbound24h}/><Metric label="Vacation enabled" value={health.mail.vacationEnabled}/><Metric label="Storage" value={`${bytes(health.mail.usedBytes)} / ${bytes(health.mail.quotaBytes)}`}/></div>
    </section>

    <section id="push" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-950">Push delivery</h2><p className="mt-1 text-sm text-slate-500">Subscribed browser/PWA endpoints and repeated delivery failures.</p></div><StatusBadge status={health.push.status}/></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Subscriptions" value={health.push.subscriptions}/><Metric label="Enabled" value={health.push.enabled}/><Metric label="Disabled" value={health.push.disabled}/><Metric label="Unhealthy" value={health.push.unhealthy}/></div>
    </section>

    <section id="queue" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-950">Durable background queue</h2><p className="mt-1 text-sm text-slate-500">Worker health, retry backlog and failed jobs.</p></div><StatusBadge status={health.queue.status}/></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><Metric label="Pending" value={health.queue.pending}/><Metric label="Processing" value={health.queue.processing}/><Metric label="Retrying" value={health.queue.retrying}/><Metric label="Failed" value={health.queue.failed}/><Metric label="Stale locks" value={health.queue.staleProcessing}/><Metric label="Overdue runnable" value={health.queue.overdueReady}/></div>
      <p className="mt-4 text-xs text-slate-500">Oldest runnable job: <span className="font-medium text-slate-700">{when(health.queue.oldestReadyAt)}</span></p>
      {health.recentFailedJobs.length ? <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Job</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Last error</th></tr></thead><tbody className="divide-y divide-slate-100">{health.recentFailedJobs.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium text-slate-900">{row.type}</td><td className="px-4 py-3 text-slate-600">{row.attempts}/{row.maxAttempts}</td><td className="px-4 py-3 text-slate-600">{when(row.updatedAt)}</td><td className="max-w-xl px-4 py-3 text-xs leading-5 text-rose-700">{row.error || "—"}</td></tr>)}</tbody></table></div> : null}
      <div className="mt-4"><Link href="/admin/jobs" className="text-sm font-semibold text-slate-900 hover:underline">Inspect, retry or cancel jobs →</Link></div>
    </section>
  </div>;
}
