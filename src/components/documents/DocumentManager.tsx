"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

type DocumentItem = { id: string; kind: string; name: string; mimeType: string; size: number; createdAt: string };

export function DocumentManager({ documents }: { documents: DocumentItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/me/documents", { method: "POST", body: form });
    if (!response.ok) setError((await readClientApiError(response)).message);
    else { event.currentTarget.reset(); router.refresh(); }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this private document? This cannot be undone.")) return;
    const response = await fetch(`/api/v1/me/documents/${id}`, { method: "DELETE" });
    if (!response.ok) setError((await readClientApiError(response)).message);
    else router.refresh();
  }

  return <div className="space-y-6">{error ? <Alert>{error}</Alert> : null}<form onSubmit={upload} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Upload document</h2><p className="mt-1 text-sm text-slate-500">PDF, DOC, DOCX, or text · maximum 10 MB · private to your account.</p><div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end"><div className="space-y-2"><Label htmlFor="kind">Document type</Label><select id="kind" name="kind" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="CV">CV</option><option value="TRANSCRIPT">Transcript</option><option value="SOP">SOP</option><option value="PROPOSAL">Proposal</option><option value="OTHER">Other</option></select></div><div className="space-y-2"><Label htmlFor="file">File</Label><input id="file" name="file" type="file" required accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></div><Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button></div></form><section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">Your documents</h2></div><div className="divide-y divide-slate-100">{documents.length ? documents.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{document.kind}</span><p className="font-medium text-slate-900">{document.name}</p></div><p className="mt-1 text-xs text-slate-500">{(document.size / 1024).toFixed(1)} KB · {new Date(document.createdAt).toLocaleString()}</p></div><div className="flex gap-2"><a href={`/api/v1/me/documents/${document.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Open</a><Button type="button" variant="secondary" onClick={() => void remove(document.id)}>Delete</Button></div></div>) : <div className="px-5 py-8 text-sm text-slate-500">No documents uploaded yet.</div>}</div></section></div>;
}
