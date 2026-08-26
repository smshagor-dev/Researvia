"use client";

import { FormEvent, useState } from "react";
import { readClientApiError } from "@/lib/client-api";

type Automation = {
  autoReplyEnabled: boolean;
  autoReplySubject: string;
  autoReplyText: string;
  autoReplyStartsAt: string | null;
  autoReplyEndsAt: string | null;
};

type Props = { initialAutomation: Automation };

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function MailAutomationPanel({ initialAutomation }: Props) {
  const [enabled, setEnabled] = useState(initialAutomation.autoReplyEnabled);
  const [subject, setSubject] = useState(initialAutomation.autoReplySubject);
  const [text, setText] = useState(initialAutomation.autoReplyText);
  const [startsAt, setStartsAt] = useState(toLocalInput(initialAutomation.autoReplyStartsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(initialAutomation.autoReplyEndsAt));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/mailbox/automation", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          autoReplyEnabled: enabled,
          autoReplySubject: subject,
          autoReplyText: text,
          autoReplyStartsAt: toIso(startsAt),
          autoReplyEndsAt: toIso(endsAt)
        })
      });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const body = await response.json() as { data: { automation: Automation } };
      const next = body.data.automation;
      setEnabled(next.autoReplyEnabled);
      setSubject(next.autoReplySubject);
      setText(next.autoReplyText);
      setStartsAt(toLocalInput(next.autoReplyStartsAt));
      setEndsAt(toLocalInput(next.autoReplyEndsAt));
      setMessage("Vacation auto-reply settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Vacation auto-reply settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Mail automation</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Vacation auto-reply</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Automatically reply to eligible inbound senders while you are away. Mailing lists, bulk/automated messages, bounce addresses and no-reply senders are suppressed. Each sender is limited to one automatic reply per seven days.</p></div>
      {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
      <form onSubmit={save} className="mt-5 space-y-5">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="mt-1"/><span><span className="font-medium text-slate-900">Enable vacation auto-reply</span><span className="mt-1 block text-sm text-slate-500">Only active inside the optional start/end window below.</span></span></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Start (optional)<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label>
          <label className="text-sm font-medium text-slate-700">End (optional)<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label>
        </div>
        <label className="block text-sm font-medium text-slate-700">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={500} className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Automatic reply"/></label>
        <label className="block text-sm font-medium text-slate-700">Message<textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} maxLength={10000} className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6" placeholder="Thank you for your message. I am currently away…"/></label>
        <button disabled={busy} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save vacation reply"}</button>
      </form>
    </section>
  );
}
