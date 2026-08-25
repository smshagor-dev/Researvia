"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { readClientApiError } from "@/lib/client-api";

export function EmailAccountActions({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: "sync" | "disconnect") {
    setBusy(kind); setError(null);
    const response = await fetch(`/api/v1/me/email-accounts/${accountId}`, { method: kind === "sync" ? "POST" : "DELETE" });
    if (!response.ok) setError((await readClientApiError(response)).message);
    else router.refresh();
    setBusy(null);
  }

  return <div className="space-y-2"><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void act("sync")}>{busy === "sync" ? "Syncing…" : "Sync messages"}</Button><Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void act("disconnect")}>{busy === "disconnect" ? "Disconnecting…" : "Disconnect"}</Button></div>{error ? <p className="text-xs text-red-600">{error}</p> : null}</div>;
}
