"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

export type MailSenderIdentity = {
  id: string;
  address: string;
  localPart: string;
  label: string;
  displayName: string;
  replyTo: string;
  status: string;
  isDefault: boolean;
  isPrimary: boolean;
  lastReceivedAt: string | null;
  lastSentAt: string | null;
};

type AliasDraft = {
  label: string;
  displayName: string;
  replyTo: string;
};

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function MailAliasesPanel({ initialIdentities }: { initialIdentities: MailSenderIdentity[] }) {
  const [identities, setIdentities] = useState(initialIdentities);
  const [localPart, setLocalPart] = useState("");
  const [label, setLabel] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, AliasDraft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const primary = useMemo(() => identities.find((identity) => identity.isPrimary) ?? null, [identities]);
  const aliases = useMemo(() => identities.filter((identity) => !identity.isPrimary), [identities]);
  const domain = primary?.address.split("@")[1] ?? "";

  function draftFor(identity: MailSenderIdentity): AliasDraft {
    return drafts[identity.id] ?? { label: identity.label, displayName: identity.displayName, replyTo: identity.replyTo };
  }

  function patchDraft(identity: MailSenderIdentity, key: keyof AliasDraft, value: string) {
    setDrafts((current) => ({ ...current, [identity.id]: { ...draftFor(identity), [key]: value } }));
  }

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error((await readClientApiError(response)).message);
    const body = await response.json() as { data: { identities: MailSenderIdentity[] } };
    setIdentities(body.data.identities);
    return body.data.identities;
  }

  async function createAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setError(null);
    setMessage(null);
    try {
      await request("/api/v1/me/mailbox/aliases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ localPart, label, displayName, replyTo, isDefault: makeDefault })
      });
      setLocalPart("");
      setLabel("");
      setDisplayName("");
      setReplyTo("");
      setMakeDefault(false);
      setMessage("Sender alias created and reserved for your mailbox.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Alias could not be created.");
    } finally {
      setBusy(null);
    }
  }

  async function updateAlias(identity: MailSenderIdentity, patch: Record<string, unknown>, success: string) {
    setBusy(identity.id);
    setError(null);
    setMessage(null);
    try {
      await request(`/api/v1/me/mailbox/aliases/${encodeURIComponent(identity.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch)
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[identity.id];
        return next;
      });
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Alias could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Aliases & sender identities</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Create additional ResearVia addresses for research outreach, applications, or separate academic identities. Incoming mail to an active alias reaches the same Inbox, and you can choose the sender when composing.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{aliases.length}/5 aliases</span>
      </div>

      {message ? <div className="mt-4"><Alert tone="success">{message}</Alert></div> : null}
      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}

      {primary ? <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{primary.address}</p><span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">Primary</span>{primary.isDefault ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Default sender</span> : null}</div>
        <p className="mt-2 text-sm text-slate-500">Primary identity uses the sender name and reply-to configured above. It cannot be renamed or recycled.</p>
      </div> : null}

      <form onSubmit={createAlias} className="mt-5 rounded-xl border border-dashed border-slate-300 p-4">
        <h3 className="font-semibold text-slate-900">Add sender alias</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="alias-local">Address</Label><div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-slate-400"><input id="alias-local" value={localPart} onChange={(event) => setLocalPart(event.target.value.toLowerCase())} required minLength={3} maxLength={40} placeholder="research" className="min-w-0 flex-1 rounded-l-lg px-3 py-2 text-sm outline-none"/><span className="border-l border-slate-200 px-3 text-sm text-slate-500">@{domain}</span></div></div>
          <div className="space-y-2"><Label htmlFor="alias-label">Label</Label><Input id="alias-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} placeholder="Research outreach"/></div>
          <div className="space-y-2"><Label htmlFor="alias-name">Sender name</Label><Input id="alias-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} placeholder={primary?.displayName || "Your name"}/></div>
          <div className="space-y-2"><Label htmlFor="alias-reply">Reply-to (optional)</Label><Input id="alias-reply" type="email" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder={primary?.replyTo || "Replies return to this alias"}/></div>
        </div>
        <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} className="mt-1"/><span><span className="font-medium text-slate-900">Use as default sender</span><span className="block text-slate-500">New messages and system outreach will use this identity unless another sender is selected.</span></span></label>
        <div className="mt-4"><Button type="submit" disabled={busy !== null || aliases.length >= 5}>{busy === "create" ? "Creating…" : aliases.length >= 5 ? "Alias limit reached" : "Create alias"}</Button></div>
      </form>

      <div className="mt-5 space-y-4">
        {aliases.map((identity) => {
          const draft = draftFor(identity);
          const active = identity.status === "ACTIVE";
          return <div key={identity.id} className={`rounded-xl border p-4 ${active ? "border-slate-200" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{identity.address}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{active ? "Active" : "Disabled"}</span>{identity.isDefault ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Default sender</span> : null}</div><p className="mt-1 text-xs text-slate-400">Last received: {when(identity.lastReceivedAt)} · Last sent: {when(identity.lastSentAt)}</p></div>
              <div className="flex flex-wrap gap-2">
                {active && !identity.isDefault ? <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void updateAlias(identity, { isDefault: true }, "Default sender updated.")}>Make default</Button> : null}
                <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void updateAlias(identity, { status: active ? "DISABLED" : "ACTIVE" }, active ? "Alias disabled. The address remains reserved to your account." : "Alias reactivated.")}>{active ? "Disable" : "Reactivate"}</Button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label htmlFor={`label-${identity.id}`}>Label</Label><Input id={`label-${identity.id}`} value={draft.label} onChange={(event) => patchDraft(identity, "label", event.target.value)} maxLength={80}/></div>
              <div className="space-y-2"><Label htmlFor={`name-${identity.id}`}>Sender name</Label><Input id={`name-${identity.id}`} value={draft.displayName} onChange={(event) => patchDraft(identity, "displayName", event.target.value)} maxLength={120}/></div>
              <div className="space-y-2"><Label htmlFor={`reply-${identity.id}`}>Reply-to</Label><Input id={`reply-${identity.id}`} type="email" value={draft.replyTo} onChange={(event) => patchDraft(identity, "replyTo", event.target.value)}/></div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs leading-5 text-slate-500">Alias addresses are immutable. Disabling stops inbound/outbound use but keeps the address permanently reserved to prevent takeover.</p><Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void updateAlias(identity, draft, "Alias identity saved.")}>{busy === identity.id ? "Saving…" : "Save identity"}</Button></div>
          </div>;
        })}
        {!aliases.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No aliases yet. Your primary ResearVia mailbox remains the default sender.</p> : null}
      </div>
    </section>
  );
}
