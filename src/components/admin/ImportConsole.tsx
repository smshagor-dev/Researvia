"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readClientApiError } from "@/lib/client-api";

type Preview = { job: { _id: string; entityType: string; format: string; status: string; totalRows: number; validRows: number; invalidRows: number }; records: Array<{ rowNumber: number; status: string; errors: string[] }> };

export function ImportConsole() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setPreview(null); setBusy(true);
    try {
      const response = await fetch("/api/v1/admin/imports/preview", { method: "POST", body: new FormData(event.currentTarget) });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const payload = await response.json() as { data: Preview };
      setPreview(payload.data);
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to create import preview."); }
    finally { setBusy(false); }
  }

  async function openAlex(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setPreview(null); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/admin/imports/openalex", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entityType: form.get("entityType"), query: form.get("query"), limit: 25 }) });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const payload = await response.json() as { data: Preview };
      setPreview(payload.data);
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to query OpenAlex."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!preview) return; setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/v1/admin/imports/${preview.job._id}/confirm`, { method: "POST" });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      setMessage("Import queued. The worker will process validated rows as draft records."); setPreview(null); router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to confirm import."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={upload} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">CSV / JSON import</h2><p className="mt-1 text-sm text-slate-500">Maximum 2 MB and 1,000 rows. JSON must be an array of records.</p><div className="mt-4 grid gap-3"><select name="entityType" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" defaultValue="UNIVERSITY"><option value="UNIVERSITY">Universities</option><option value="PROFESSOR">Professors</option><option value="SCHOLARSHIP">Scholarships</option><option value="OPPORTUNITY">Opportunities</option></select><input name="file" type="file" accept=".csv,.json,text/csv,application/json" required className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"/><button disabled={busy} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Preview file</button></div></form>
      <form onSubmit={openAlex} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">OpenAlex discovery</h2><p className="mt-1 text-sm text-slate-500">Create a reviewable preview from public OpenAlex institution or author records.</p><div className="mt-4 grid gap-3"><select name="entityType" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" defaultValue="UNIVERSITY"><option value="UNIVERSITY">Universities</option><option value="PROFESSOR">Professors</option></select><input name="query" required minLength={2} maxLength={180} placeholder="Search university or researcher" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><button disabled={busy} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Search & preview</button></div></form>
    </div>
    {message ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</div> : null}
    {preview ? <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-950">Preview ready</h2><p className="mt-1 text-sm text-slate-500">{preview.job.entityType} • {preview.job.format} • {preview.job.totalRows} rows</p></div><button onClick={confirm} disabled={busy || preview.job.validRows < 1} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Confirm {preview.job.validRows} valid rows</button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Total</p><p className="mt-1 text-2xl font-semibold">{preview.job.totalRows}</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Valid</p><p className="mt-1 text-2xl font-semibold text-emerald-950">{preview.job.validRows}</p></div><div className="rounded-xl bg-red-50 p-4"><p className="text-xs text-red-700">Invalid</p><p className="mt-1 text-2xl font-semibold text-red-950">{preview.job.invalidRows}</p></div></div>{preview.job.invalidRows ? <div className="mt-4 max-h-44 overflow-auto rounded-xl border border-red-100 bg-red-50 p-3">{preview.records.filter((row) => row.status === "INVALID").slice(0, 25).map((row) => <p key={row.rowNumber} className="text-xs leading-6 text-red-800">Row {row.rowNumber}: {row.errors.join("; ")}</p>)}</div> : null}</div> : null}
  </div>;
}
