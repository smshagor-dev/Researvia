"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

type SyncSettings = {
  imapHost: string;
  imapUsername: string;
  imapPasswordSaved: boolean;
  imapSyncEnabled: boolean;
  imapMailbox: string;
  imapLastUid: number;
  imapSyncStatus: "IDLE" | "RUNNING" | "ERROR";
  imapLastImportedCount: number;
  lastImapSyncAt: string | null;
  lastConfigError: string | null;
};

type Props = { initialSettings: SyncSettings };

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function ImapSyncPanel({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [enabled, setEnabled] = useState(initialSettings.imapSyncEnabled);
  const [mailbox, setMailbox] = useState(initialSettings.imapMailbox || "INBOX");
  const [busy, setBusy] = useState<"SAVE" | "SYNC" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = Boolean(settings.imapHost && settings.imapUsername && settings.imapPasswordSaved);

  async function save() {
    setBusy("SAVE");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/mailbox/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imapSyncEnabled: enabled, imapMailbox: mailbox.trim() || "INBOX" })
      });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const body = await response.json() as { data: { settings: SyncSettings } };
      setSettings(body.data.settings);
      setEnabled(body.data.settings.imapSyncEnabled);
      setMailbox(body.data.settings.imapMailbox);
      setMessage("External inbox synchronization settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sync settings could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function syncNow() {
    setBusy("SYNC");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/mailbox/settings/sync", { method: "POST" });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const body = await response.json() as { data: { result: { imported?: number }; settings: SyncSettings } };
      setSettings(body.data.settings);
      setEnabled(body.data.settings.imapSyncEnabled);
      setMailbox(body.data.settings.imapMailbox);
      setMessage(`Sync complete. ${body.data.result.imported ?? 0} new message(s) imported.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "External inbox synchronization failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">External inbox</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">IMAP synchronization</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Import new messages from your configured IMAP inbox into the same ResearVia mailbox. The first run is bounded to recent mail; later runs use an incremental UID cursor and deduplicate by provider identity and Message-ID.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${settings.imapSyncStatus === "ERROR" ? "bg-red-50 text-red-700" : settings.imapSyncStatus === "RUNNING" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{settings.imapSyncStatus}</span>
      </div>

      {message ? <div className="mt-4"><Alert tone="success">{message}</Alert></div> : null}
      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
      {settings.lastConfigError ? <div className="mt-4"><Alert>Last sync error: {settings.lastConfigError}</Alert></div> : null}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="mt-1" />
          <span><span className="font-medium text-slate-900">Synchronize automatically</span><span className="mt-1 block text-sm text-slate-500">Queue this account during the hourly mail reconciliation scan.</span></span>
        </label>
        <div className="space-y-2">
          <Label htmlFor="externalImapMailbox">Mailbox / folder</Label>
          <Input id="externalImapMailbox" value={mailbox} onChange={(event) => setMailbox(event.target.value)} maxLength={255} placeholder="INBOX" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last sync</p><p className="mt-1 font-medium text-slate-800">{when(settings.lastImapSyncAt)}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last imported</p><p className="mt-1 font-medium text-slate-800">{settings.imapLastImportedCount}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cursor UID</p><p className="mt-1 font-medium text-slate-800">{settings.imapLastUid || "—"}</p></div>
      </div>

      {!configured ? <p className="mt-4 text-sm text-amber-700">Save and test the IMAP host, username and app password above before enabling synchronization.</p> : null}
      <p className="mt-3 text-xs leading-5 text-slate-500">External attachments are not mirrored automatically. This prevents a remote mailbox from consuming ResearVia document storage unexpectedly.</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" onClick={() => void save()} disabled={busy !== null || (!configured && enabled)}>{busy === "SAVE" ? "Saving…" : "Save sync settings"}</Button>
        <Button type="button" variant="outline" onClick={() => void syncNow()} disabled={busy !== null || !configured}>{busy === "SYNC" ? "Synchronizing…" : "Sync now"}</Button>
      </div>
    </section>
  );
}
