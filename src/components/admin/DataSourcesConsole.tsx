"use client";

import { useState } from "react";

type FeedSource = { id: string; name: string; entityType: string; format: string; url: string; defaultCountry: string; defaultProvider: string; active: boolean; lastSyncedAt: string | null; lastError: string | null };

export function DataSourcesConsole({ initialSources }: { initialSources: FeedSource[] }) {
  const [sources, setSources] = useState(initialSources);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch("/api/v1/admin/feeds", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setSources((body.data.sources as Array<Record<string, unknown>>).map((item) => ({ id: String(item._id), name: String(item.name), entityType: String(item.entityType), format: String(item.format), url: String(item.url), defaultCountry: String(item.defaultCountry), defaultProvider: String(item.defaultProvider), active: Boolean(item.active), lastSyncedAt: item.lastSyncedAt ? String(item.lastSyncedAt) : null, lastError: item.lastError ? String(item.lastError) : null })));
  }

  async function createFeed(form: FormData) {
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/v1/admin/feeds", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), entityType: form.get("entityType"), format: form.get("format"), url: form.get("url"), defaultCountry: form.get("defaultCountry"), defaultProvider: form.get("defaultProvider"), defaultOpportunityType: form.get("defaultOpportunityType"), active: true }) });
      const body = await response.json(); if (!response.ok) throw new Error(body?.error?.message ?? "Could not create feed source."); await refresh(); setStatus("Feed source created. Imported records will remain drafts until reviewed.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not create feed source."); } finally { setBusy(false); }
  }

  async function syncFeed(id: string) {
    setBusy(true); setStatus("");
    try { const response = await fetch(`/api/v1/admin/feeds/${encodeURIComponent(id)}/sync`, { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body?.error?.message ?? "Feed sync failed."); await refresh(); setStatus(`Feed sync complete: ${body.data.imported} draft records imported or refreshed.`); } catch (error) { setStatus(error instanceof Error ? error.message : "Feed sync failed."); } finally { setBusy(false); }
  }

  async function removeFeed(id: string) {
    if (!confirm("Delete this feed configuration? Imported academic records are not deleted.")) return;
    setBusy(true); try { const response = await fetch(`/api/v1/admin/feeds/${encodeURIComponent(id)}`, { method: "DELETE" }); const body = await response.json(); if (!response.ok) throw new Error(body?.error?.message ?? "Delete failed."); await refresh(); setStatus("Feed configuration deleted."); } catch (error) { setStatus(error instanceof Error ? error.message : "Delete failed."); } finally { setBusy(false); }
  }

  async function providerSync(form: FormData) {
    setBusy(true); setStatus("");
    try { const response = await fetch("/api/v1/admin/research-sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: form.get("provider"), query: form.get("query"), limit: Number(form.get("limit") ?? 25) }) }); const body = await response.json(); if (!response.ok) throw new Error(body?.error?.message ?? "Provider sync failed."); setStatus(`${body.data.provider}: ${body.data.imported} paper records imported or refreshed.`); } catch (error) { setStatus(error instanceof Error ? error.message : "Provider sync failed."); } finally { setBusy(false); }
  }

  return <div className="space-y-8">
    <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Official academic feeds</h2><p className="mt-1 text-sm text-slate-600">HTTPS JSON/RSS/Atom only. Private network targets are blocked. New opportunity and scholarship records stay in Draft until admin review.</p><form className="mt-5 grid gap-3 md:grid-cols-2" action={createFeed}><input required name="name" placeholder="Source name" className="rounded-md border px-3 py-2 text-sm"/><input required name="url" type="url" placeholder="https://university.example/feed.xml" className="rounded-md border px-3 py-2 text-sm"/><input required name="defaultProvider" placeholder="University / organization" className="rounded-md border px-3 py-2 text-sm"/><input required name="defaultCountry" placeholder="Country" className="rounded-md border px-3 py-2 text-sm"/><select name="entityType" className="rounded-md border px-3 py-2 text-sm"><option value="SCHOLARSHIP">Scholarships</option><option value="OPPORTUNITY">Opportunities</option></select><select name="format" className="rounded-md border px-3 py-2 text-sm"><option value="AUTO">Auto detect</option><option value="JSON">JSON</option><option value="RSS">RSS</option><option value="ATOM">Atom</option></select><select name="defaultOpportunityType" className="rounded-md border px-3 py-2 text-sm"><option value="OTHER">Other opportunity</option><option value="PHD">PhD</option><option value="MASTERS">Masters</option><option value="RESEARCH_ASSISTANT">Research assistant</option><option value="RESEARCH_INTERNSHIP">Research internship</option><option value="FELLOWSHIP">Fellowship</option><option value="CONFERENCE">Conference</option></select><button disabled={busy} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Add source</button></form></section>
    <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Open academic metadata</h2><p className="mt-1 text-sm text-slate-600">Import paper metadata from OpenAlex or Crossref. Provider metadata is stored with source provenance and verification timestamps.</p><form className="mt-4 flex flex-col gap-3 md:flex-row" action={providerSync}><select name="provider" className="rounded-md border px-3 py-2 text-sm"><option value="OPENALEX">OpenAlex</option><option value="CROSSREF">Crossref</option></select><input required name="query" placeholder="Research topic, DOI, title, author…" className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"/><input name="limit" type="number" min="1" max="50" defaultValue="25" className="w-24 rounded-md border px-3 py-2 text-sm"/><button disabled={busy} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Import metadata</button></form></section>
    {status ? <p role="status" className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p> : null}
    <section className="space-y-3"><h2 className="text-lg font-semibold">Configured feeds</h2>{sources.length === 0 ? <p className="text-sm text-slate-600">No feed sources configured.</p> : sources.map((source) => <article key={source.id} className="rounded-xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{source.name}</h3><p className="mt-1 break-all text-xs text-slate-500">{source.url}</p><p className="mt-2 text-sm text-slate-600">{source.entityType} · {source.format} · {source.defaultProvider} · {source.defaultCountry}</p>{source.lastSyncedAt ? <p className="mt-1 text-xs text-slate-500">Last sync: {new Date(source.lastSyncedAt).toLocaleString()}</p> : null}{source.lastError ? <p className="mt-2 text-sm text-red-700">{source.lastError}</p> : null}</div><div className="flex gap-2"><button disabled={busy} onClick={() => syncFeed(source.id)} className="rounded-md border px-3 py-2 text-sm">Sync</button><button disabled={busy} onClick={() => removeFeed(source.id)} className="rounded-md border px-3 py-2 text-sm text-red-700">Delete</button></div></div></article>)}</section>
  </div>;
}
