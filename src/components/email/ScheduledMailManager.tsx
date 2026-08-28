"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type ScheduledMail = {
  id: string;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  scheduledAt: string | null;
  status: "PENDING" | "SENDING" | "CANCELLED" | "FAILED" | string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  attachments: Array<{ filename: string; contentType: string; size: number }>;
  createdAt: string | null;
};

type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

function splitAddresses(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusTone(status: string) {
  if (status === "FAILED") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-600 ring-slate-200";
  if (status === "SENDING") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function defaultScheduleTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ScheduledMailManager({ initialMessages }: { initialMessages: ScheduledMail[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleTime);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeCount = useMemo(() => messages.filter((message) => message.status === "PENDING" || message.status === "SENDING").length, [messages]);

  async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const body = await response.json() as ApiEnvelope<T>;
    if (!response.ok) throw new Error(body.error?.message || "Request failed.");
    if (!body.data) throw new Error("Unexpected server response.");
    return body.data;
  }

  async function refresh() {
    const result = await api<{ messages: ScheduledMail[] }>("/api/v1/me/mailbox/schedules");
    setMessages(result.messages);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime())) throw new Error("Choose a valid delivery time.");
      const form = new FormData();
      form.set("to", JSON.stringify(splitAddresses(to)));
      form.set("cc", JSON.stringify(splitAddresses(cc)));
      form.set("subject", subject);
      form.set("text", text);
      form.set("scheduledAt", date.toISOString());
      files.forEach((file) => form.append("attachments", file));
      await api<{ message: ScheduledMail }>("/api/v1/me/mailbox/schedules", { method: "POST", body: form });
      await refresh();
      setTo("");
      setCc("");
      setSubject("");
      setText("");
      setFiles([]);
      setScheduledAt(defaultScheduleTime());
      setNotice("Message scheduled successfully. Delivery is handled by the durable mailbox worker.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be scheduled.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    setError("");
    setNotice("");
    try {
      await api<{ message: ScheduledMail }>(`/api/v1/me/mailbox/schedules/${encodeURIComponent(id)}`, { method: "DELETE" });
      await refresh();
      setNotice("Scheduled delivery cancelled.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scheduled delivery could not be cancelled.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mailbox automation</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Scheduled mail</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Queue messages for a future delivery time. Attachments are stored privately until the worker sends or cancels the message.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{activeCount} active</span>
          <Link href="/dashboard/mail" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open mailbox</Link>
        </div>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">To
              <input required value={to} onChange={(event) => setTo(event.target.value)} placeholder="professor@university.edu" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-slate-950 focus:ring-1" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Cc
              <input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="Optional, comma separated" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-slate-950 focus:ring-1" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Subject
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={500} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-slate-950 focus:ring-1" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">Message
              <textarea required value={text} onChange={(event) => setText(event.target.value)} rows={9} maxLength={200000} className="resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-slate-950 focus:ring-1" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Delivery time
                <input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-slate-950 focus:ring-1" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Attachments
                <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>
            {files.length ? <p className="text-xs text-slate-500">{files.length} attachment{files.length === 1 ? "" : "s"} selected · {bytes(files.reduce((sum, file) => sum + file.size, 0))}</p> : null}
            <div className="flex justify-end">
              <button disabled={submitting} className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Scheduling…" : "Schedule message"}</button>
            </div>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-950">Delivery queue</h2>
            <p className="mt-1 text-xs text-slate-500">Automatic retries use the platform job queue.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {messages.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">No scheduled messages yet.</p> : messages.map((message) => (
              <article key={message.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{message.subject || "(no subject)"}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">To {message.to.join(", ")}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusTone(message.status)}`}>{message.status}</span>
                </div>
                <p className="mt-3 text-xs text-slate-600">{message.scheduledAt ? new Date(message.scheduledAt).toLocaleString() : "No delivery time"}</p>
                {message.attachments.length ? <p className="mt-1 text-xs text-slate-500">{message.attachments.length} attachment{message.attachments.length === 1 ? "" : "s"}</p> : null}
                {message.status === "FAILED" && message.lastError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{message.lastError}</p> : null}
                {message.attempts > 0 ? <p className="mt-2 text-[11px] text-slate-400">Attempt {message.attempts}{message.maxAttempts ? ` of ${message.maxAttempts}` : ""}</p> : null}
                {message.status === "PENDING" ? <button type="button" onClick={() => cancel(message.id)} className="mt-4 text-xs font-semibold text-rose-700 hover:text-rose-900">Cancel scheduled send</button> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
