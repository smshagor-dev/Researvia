"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

export function CampaignSchedulePanel({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function schedule(now: boolean) {
    setBusy(true); setError(null);
    const value = now || !scheduledAt ? null : new Date(scheduledAt).toISOString();
    const response = await fetch(`/api/v1/me/outreach/campaigns/${campaignId}/schedule`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scheduledAt: value }) });
    if (!response.ok) setError((await readClientApiError(response)).message);
    else router.refresh();
    setBusy(false);
  }

  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Send or schedule</h2><p className="mt-1 text-sm text-slate-500">Review every personalized recipient draft before scheduling.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1 space-y-2"><Label htmlFor="scheduledAt">Schedule time</Label><Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></div><Button type="button" variant="secondary" disabled={busy || !scheduledAt} onClick={() => void schedule(false)}>Schedule</Button><Button type="button" disabled={busy} onClick={() => void schedule(true)}>{busy ? "Queuing…" : "Send now"}</Button></div>{error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}</div>;
}
