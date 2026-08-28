"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { readClientApiError } from "@/lib/client-api";

export function SuppressionAction({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/deliverability/suppressions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !active })
      });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Suppression could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-1.5"><Button type="button" variant="secondary" disabled={busy} onClick={update}>{busy ? "Saving…" : active ? "Restore sending" : "Reactivate"}</Button>{error ? <p className="max-w-48 text-xs text-rose-600">{error}</p> : null}</div>;
}
