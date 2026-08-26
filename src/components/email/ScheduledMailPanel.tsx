"use client";

import { FormEvent, useState } from "react";
import { readClientApiError } from "@/lib/client-api";

type ScheduledMessage = {
  id: string;
  to: string[];
  cc: string[];
  subject: string;
  textBody: string;
  scheduledAt: string | null;
  scheduleStatus: string | null;
  createdAt: string | null;
};

type Props = { initialMessages: ScheduledMessage[] };

function splitAddresses(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function localFutureDate() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ScheduledMailPanel({ initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState(localFutureDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/v1/me/mailbox/scheduled", { cache: "no-store" });
    if (!response.ok) throw new Error((await readClientApiError(response)).message);
    const body = await response.json() as { data: { messages: ScheduledMessage[] } };
    setMessages(body.data.messages);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const date = new Date(scheduledAt);
      if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid delivery time.");
      const response = await fetch("/api/v1/me/mailbox/scheduled", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: splitAddresses(to),
          cc: splitAddresses(cc),
          subject,
          text,
          scheduledAt: date.toISOString()
        })
      });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      setTo("");
      setCc("");
      setSubject("");
      setText("");
      setScheduledAt(localFutureDate());
      setOpen(false);
      await refresh();
      setMessage("Email scheduled.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Email could not be scheduled.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/me/mailbox/scheduled/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      await refresh();
      setMessage("Scheduled delivery cancelled. The message remains available as a draft.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scheduled delivery could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Mail automation</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Scheduled send</h2><p className="mt-1 text-sm text-slate-500">Queue a message for future delivery through the same ResearVia mailbox transport and retry pipeline.</p></div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{open ? "Close" : "Schedule email"}</button>
      </div>
      {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      {open ? <form onSubmit={submit} className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="To (comma separated)" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" required />
        <input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="Cc (optional)" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
        <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" maxLength={500} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Message" rows={6} maxLength={200000} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-400" required />
        <label className="text-sm font-medium text-slate-700">Deliver at<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" required /></label>
        <p className="text-xs text-slate-500">Scheduled messages currently support text mail without attachments. Attachments can still be sent immediately from Compose.</p>
        <div><button disabled={busy} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Scheduling…" : "Schedule"}</button></div>
      </form> : null}

      <div className="mt-5 space-y-2">
        {messages.length ? messages.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.subject || "(no subject)"}</p><p className="mt-1 truncate text-xs text-slate-500">To {item.to.join(", ")} · {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Pending"}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.scheduleStatus}</span><button type="button" disabled={busy || item.scheduleStatus !== "PENDING"} onClick={() => void cancel(item.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50">Cancel</button></div></div>) : <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No scheduled messages.</p>}
      </div>
    </section>
  );
}
