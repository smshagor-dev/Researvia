"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readClientApiError } from "@/lib/client-api";

export function ContentStatusActions({ type, id, status }: { type: string; id: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(nextStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    setSaving(nextStatus);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/content/${type}/${id}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update content.");
    } finally {
      setSaving(null);
    }
  }

  return <div className="space-y-2"><div className="flex flex-wrap gap-2">{(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((value) => <button key={value} type="button" disabled={saving !== null || status === value} onClick={() => setStatus(value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${status === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"} disabled:opacity-50`}>{saving === value ? "Saving…" : value}</button>)}</div>{error ? <p className="text-xs text-red-600">{error}</p> : null}</div>;
}
