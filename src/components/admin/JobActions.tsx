"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readClientApiError } from "@/lib/client-api";

export function JobActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "RETRY" | "CANCEL") {
    setBusy(action); setError(null);
    try {
      const response = await fetch(`/api/v1/admin/jobs/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update job."); }
    finally { setBusy(null); }
  }

  const retryable = status === "FAILED" || status === "RETRYING";
  const cancellable = status === "PENDING" || status === "RETRYING";
  if (!retryable && !cancellable) return <span className="text-xs text-slate-400">No action</span>;
  return <div className="space-y-2"><div className="flex gap-2">{retryable ? <button type="button" disabled={busy !== null} onClick={() => act("RETRY")} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{busy === "RETRY" ? "Retrying…" : "Retry"}</button> : null}{cancellable ? <button type="button" disabled={busy !== null} onClick={() => act("CANCEL")} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50">{busy === "CANCEL" ? "Cancelling…" : "Cancel"}</button> : null}</div>{error ? <p className="max-w-xs text-xs text-red-600">{error}</p> : null}</div>;
}
