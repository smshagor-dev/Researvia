"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

type Sender = { id: string; email: string; provider: string; type: "SYSTEM" | "CONNECTED" };
type ProfessorTarget = { id: string; name: string; email: string } | null;

export function OutreachCreateForm({ senders, professor }: { senders: Sender[]; professor: ProfessorTarget }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setBusy(true);
    const form = new FormData(event.currentTarget);
    const senderId = String(form.get("senderId") ?? "");
    const sender = senders.find((item) => item.id === senderId);
    if (!sender) { setError("Choose a valid sender."); setBusy(false); return; }
    const manualEmail = String(form.get("recipientEmail") ?? "").trim();
    const payload = {
      senderType: sender.type,
      accountId: sender.type === "CONNECTED" ? sender.id : null,
      name: form.get("name"),
      purpose: form.get("purpose"),
      subject: form.get("subject"),
      body: form.get("body"),
      professorIds: professor ? [professor.id] : [],
      recipients: manualEmail ? [{ email: manualEmail, name: String(form.get("recipientName") ?? "") }] : [],
      followUpAfterDays: form.get("followUpAfterDays") ? Number(form.get("followUpAfterDays")) : null
    };
    const response = await fetch("/api/v1/me/outreach/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { setError((await readClientApiError(response)).message); setBusy(false); return; }
    const data = (await response.json()) as { data: { campaign: { _id: string } } };
    router.push(`/dashboard/outreach/${data.data.campaign._id}`);
    router.refresh();
  }

  if (!senders.length) return <Alert tone="info">System mail is not configured yet. Connect Gmail or Microsoft to create an outreach campaign.</Alert>;

  return <form onSubmit={submit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    {error ? <Alert>{error}</Alert> : null}
    {professor ? <Alert tone="info">Preparing outreach for <strong>{professor.name}</strong>{professor.email ? ` (${professor.email})` : ""}. The server will re-check the professor&apos;s published contact record.</Alert> : null}
    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="senderId">Send from</Label><select id="senderId" name="senderId" required defaultValue={senders[0]?.id} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{senders.map((sender) => <option key={sender.id} value={sender.id}>{sender.email} · {sender.provider}</option>)}</select><p className="text-xs text-slate-500">Use your ResearVia mailbox by default, or choose a connected personal account.</p></div><div className="space-y-2"><Label htmlFor="name">Campaign name</Label><Input id="name" name="name" required maxLength={180} placeholder="PhD outreach · Fall intake" /></div></div>
    <div className="space-y-2"><Label htmlFor="purpose">Purpose</Label><Input id="purpose" name="purpose" required maxLength={120} placeholder="PhD supervision inquiry" /></div>
    {!professor ? <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="recipientEmail">Recipient email</Label><Input id="recipientEmail" name="recipientEmail" type="email" placeholder="professor@university.edu" /></div><div className="space-y-2"><Label htmlFor="recipientName">Recipient name</Label><Input id="recipientName" name="recipientName" placeholder="Professor name" /></div></div> : null}
    <div className="space-y-2"><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" required maxLength={300} defaultValue="Research opportunity inquiry — {{student}}" /></div>
    <div className="space-y-2"><Label htmlFor="body">Message</Label><textarea id="body" name="body" required maxLength={12000} rows={10} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-400" defaultValue={`Dear {{professor}},\n\nMy name is {{student}}. I am writing to ask whether there may be a suitable research or supervision opportunity in your group. I will review your current work and personalize this draft before sending.\n\nBest regards,\n{{student}}`} /><p className="text-xs text-slate-500">Supported placeholders: {"{{professor}}"}, {"{{name}}"}, {"{{student}}"}.</p></div>
    <div className="max-w-xs space-y-2"><Label htmlFor="followUpAfterDays">Automatic follow-up after days (optional)</Label><Input id="followUpAfterDays" name="followUpAfterDays" type="number" min={1} max={60} placeholder="7" /></div>
    <Button type="submit" disabled={busy}>{busy ? "Creating draft…" : "Create outreach draft"}</Button>
  </form>;
}
