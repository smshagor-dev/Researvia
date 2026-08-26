"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readClientApiError } from "@/lib/client-api";

type Stats = {
  total: number;
  withEmail: number;
  withWebsite: number;
  universitiesWithDomains: number;
  orcidConfigured: boolean;
  byStatus: Record<string, number>;
};

export function ProfessorEnrichmentPanel({ stats }: { stats: Stats }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function queueBackfill() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/admin/professor-enrichment", { method: "POST" });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const payload = await response.json() as { data: { professors: { queued: number }; universities: { queued: number } } };
      setMessage(`Queued ${payload.data.professors.queued} professor contact jobs and ${payload.data.universities.queued} university metadata jobs.`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to queue enrichment."); }
    finally { setBusy(false); }
  }

  const cards = [
    ["Professors", stats.total],
    ["Public email", stats.withEmail],
    ["Profile website", stats.withWebsite],
    ["Universities with official domains", stats.universitiesWithDomains]
  ] as const;

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Contact intelligence</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Professor contact enrichment</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">OpenAlex identifies researchers and research topics; ROR verifies official university domains; ORCID public records can add public email, researcher URLs, title and department. ResearVia never guesses an email address.</p></div>
      <button onClick={() => void queueBackfill()} disabled={busy} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Queueing…" : "Queue contact backfill"}</button>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></div>)}</div>
    <div className="mt-4 flex flex-wrap gap-2">{Object.entries(stats.byStatus).map(([status,count]) => <span key={status} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">{status}: {count}</span>)}</div>
    <div className={`mt-4 rounded-xl p-3 text-sm ${stats.orcidConfigured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{stats.orcidConfigured ? "ORCID Public API credentials are configured. Public ORCID contact/employment enrichment is active." : "ORCID Public API credentials are not configured yet. OpenAlex + ROR enrichment still works, but public ORCID email/profile/employment fields cannot be read until ORCID_CLIENT_ID and ORCID_CLIENT_SECRET are configured."}</div>
    {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
  </section>;
}
