"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

export type VacationResponderSettings = {
  enabled: boolean;
  enabledAt: string | null;
  startAt: string | null;
  endAt: string | null;
  subject: string;
  message: string;
  cooldownHours: number;
};

function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function isoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function VacationResponderSettings({ initialSettings }: { initialSettings: VacationResponderSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [startAt, setStartAt] = useState(localInput(initialSettings.startAt));
  const [endAt, setEndAt] = useState(localInput(initialSettings.endAt));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/mailbox/vacation", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: settings.enabled,
          startAt: isoOrNull(startAt),
          endAt: isoOrNull(endAt),
          subject: settings.subject,
          message: settings.message,
          cooldownHours: Number(settings.cooldownHours)
        })
      });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const body = await response.json() as { data: { settings: VacationResponderSettings } };
      setSettings(body.data.settings);
      setStartAt(localInput(body.data.settings.startAt));
      setEndAt(localInput(body.data.settings.endAt));
      setMessage(body.data.settings.enabled ? "Automatic vacation replies are enabled." : "Vacation responder settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Vacation responder settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Automatic replies</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Vacation responder</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Reply automatically to eligible incoming professor and academic emails. ResearVia suppresses mailing lists, automated senders, self-mail and reply loops, and applies a per-sender cooldown.</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${settings.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{settings.enabled ? "Enabled" : "Disabled"}</span>
      </div>

      {message ? <div className="mt-4"><Alert tone="success">{message}</Alert></div> : null}
      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}

      <form onSubmit={save} className="mt-6 space-y-5">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))} className="mt-1"/>
          <span><span className="font-medium text-slate-900">Enable automatic replies</span><span className="mt-1 block text-sm leading-6 text-slate-500">Only messages received after the responder is enabled and inside the optional date window are eligible.</span></span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="vacationStartAt">Start date & time (optional)</Label><Input id="vacationStartAt" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)}/></div>
          <div className="space-y-2"><Label htmlFor="vacationEndAt">End date & time (optional)</Label><Input id="vacationEndAt" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)}/></div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vacationSubject">Reply subject (optional)</Label>
          <Input id="vacationSubject" value={settings.subject} onChange={(event) => setSettings((current) => ({ ...current, subject: event.target.value }))} maxLength={500} placeholder="Away from email — {{subject}}"/>
          <p className="text-xs text-slate-500">Use <code className="rounded bg-slate-100 px-1 py-0.5">{"{{subject}}"}</code> to include the original subject. If empty, ResearVia uses a normal “Re:” subject.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vacationMessage">Automatic reply message</Label>
          <textarea id="vacationMessage" value={settings.message} onChange={(event) => setSettings((current) => ({ ...current, message: event.target.value }))} rows={7} maxLength={10000} placeholder="Thank you for your email. I am currently away and will reply when I return." className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-400"/>
          <p className="text-xs text-slate-500">Your configured mailbox signature is appended by the delivery layer.</p>
        </div>

        <div className="max-w-sm space-y-2">
          <Label htmlFor="vacationCooldownHours">Repeat-reply cooldown</Label>
          <div className="flex items-center gap-3"><Input id="vacationCooldownHours" type="number" min={1} max={720} value={settings.cooldownHours} onChange={(event) => setSettings((current) => ({ ...current, cooldownHours: Number(event.target.value || 24) }))}/><span className="text-sm text-slate-500">hours per sender</span></div>
          <p className="text-xs text-slate-500">Default: 24 hours. This prevents repeated messages from the same professor from receiving a reply storm.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save vacation responder"}</Button>
          {settings.enabledAt ? <span className="text-xs text-slate-500">Enabled since {new Date(settings.enabledAt).toLocaleString()}</span> : null}
        </div>
      </form>
    </section>
  );
}
