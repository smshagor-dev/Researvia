"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

type Mailbox = { address: string; displayName: string; status: string };
type Settings = {
  deliveryMode: "MANAGED" | "CUSTOM";
  senderName: string;
  signature: string;
  replyTo: string;
  forwardingEnabled: boolean;
  forwardingEmail: string;
  webNotifications: boolean;
  pushNotifications: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPasswordSaved: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUsername: string;
  imapPasswordSaved: boolean;
  lastSmtpTestAt: string | null;
  lastImapTestAt: string | null;
  lastImapSyncAt: string | null;
  lastConfigError: string | null;
};

type Props = { initialMailbox: Mailbox; initialSettings: Settings };

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not tested yet";
}

export function MailSettingsForm({ initialMailbox, initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<"SMTP" | "IMAP" | "DELIVERY" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const payload = {
      deliveryMode: settings.deliveryMode,
      senderName: settings.senderName,
      signature: settings.signature,
      replyTo: settings.replyTo,
      forwardingEnabled: settings.forwardingEnabled,
      forwardingEmail: settings.forwardingEmail,
      webNotifications: settings.webNotifications,
      pushNotifications: settings.pushNotifications,
      smtpHost: settings.smtpHost,
      smtpPort: Number(settings.smtpPort),
      smtpSecure: settings.smtpSecure,
      smtpUsername: settings.smtpUsername,
      ...(smtpPassword ? { smtpPassword } : {}),
      imapHost: settings.imapHost,
      imapPort: Number(settings.imapPort),
      imapSecure: settings.imapSecure,
      imapUsername: settings.imapUsername,
      ...(imapPassword ? { imapPassword } : {})
    };

    try {
      const response = await fetch("/api/v1/me/mailbox/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const body = await response.json() as { data: { settings: Settings } };
      setSettings(body.data.settings);
      setSmtpPassword("");
      setImapPassword("");
      setMessage("Mail settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mail settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function test(action: "SMTP" | "IMAP" | "DELIVERY") {
    setTesting(action);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/mailbox/settings/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      const refreshed = await fetch("/api/v1/me/mailbox/settings", { cache: "no-store" });
      if (refreshed.ok) {
        const body = await refreshed.json() as { data: { settings: Settings } };
        setSettings(body.data.settings);
      }
      setMessage(action === "DELIVERY" ? "Test message sent to your account email." : `${action} connection passed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} test failed.`);
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">System mailbox</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{initialMailbox.address}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Configure your own mail identity, delivery, forwarding and notifications. Your password fields are encrypted at rest and are never returned to the browser.</p>
        </div>
        <Link href="/dashboard/mail" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open mailbox</Link>
      </div>

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      {settings.lastConfigError ? <Alert>Last connection error: {settings.lastConfigError}</Alert> : null}

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Delivery mode</h2>
          <p className="mt-1 text-sm text-slate-500">Managed mode uses the ResearVia mail infrastructure. Custom mode uses the SMTP credentials you save below for your outgoing system address.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className={`cursor-pointer rounded-xl border p-4 ${settings.deliveryMode === "MANAGED" ? "border-slate-950 bg-slate-50" : "border-slate-200"}`}>
              <div className="flex items-start gap-3"><input type="radio" name="deliveryMode" checked={settings.deliveryMode === "MANAGED"} onChange={() => patch("deliveryMode", "MANAGED")} className="mt-1"/><div><p className="font-semibold text-slate-900">Managed ResearVia Mail</p><p className="mt-1 text-sm leading-6 text-slate-500">Recommended. No personal SMTP password required.</p></div></div>
            </label>
            <label className={`cursor-pointer rounded-xl border p-4 ${settings.deliveryMode === "CUSTOM" ? "border-slate-950 bg-slate-50" : "border-slate-200"}`}>
              <div className="flex items-start gap-3"><input type="radio" name="deliveryMode" checked={settings.deliveryMode === "CUSTOM"} onChange={() => patch("deliveryMode", "CUSTOM")} className="mt-1"/><div><p className="font-semibold text-slate-900">Custom SMTP / IMAP</p><p className="mt-1 text-sm leading-6 text-slate-500">Use your own university, cPanel, Zoho or other mail server.</p></div></div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Identity & signature</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="senderName">Sender name</Label><Input id="senderName" value={settings.senderName} onChange={(event) => patch("senderName", event.target.value)} maxLength={120} placeholder={initialMailbox.displayName || "Your name"}/></div>
            <div className="space-y-2"><Label htmlFor="replyTo">Reply-to address (optional)</Label><Input id="replyTo" type="email" value={settings.replyTo} onChange={(event) => patch("replyTo", event.target.value)} placeholder="personal@email.com"/></div>
          </div>
          <div className="mt-5 space-y-2"><Label htmlFor="signature">Email signature</Label><textarea id="signature" value={settings.signature} onChange={(event) => patch("signature", event.target.value)} rows={6} maxLength={4000} placeholder="Best regards,\nYour Name\nResearch interests..." className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-400"/><p className="text-xs text-slate-500">Automatically appended to system-mail messages and professor outreach sent from this mailbox.</p></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Incoming mail</h2>
          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3"><input type="checkbox" checked={settings.forwardingEnabled} onChange={(event) => patch("forwardingEnabled", event.target.checked)} className="mt-1"/><span><span className="font-medium text-slate-900">Forward incoming mail</span><span className="mt-1 block text-sm text-slate-500">Keep the original in ResearVia Inbox and send a copy to another address.</span></span></label>
            <div className="max-w-xl space-y-2"><Label htmlFor="forwardingEmail">Forward to</Label><Input id="forwardingEmail" type="email" value={settings.forwardingEmail} onChange={(event) => patch("forwardingEmail", event.target.value)} disabled={!settings.forwardingEnabled} placeholder="your.personal@email.com"/></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={settings.webNotifications} onChange={(event) => patch("webNotifications", event.target.checked)} className="mt-1"/><span><span className="font-medium text-slate-900">Web notifications</span><span className="mt-1 block text-sm text-slate-500">Show new-mail alerts inside the dashboard.</span></span></label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={settings.pushNotifications} onChange={(event) => patch("pushNotifications", event.target.checked)} className="mt-1"/><span><span className="font-medium text-slate-900">Push / local notifications</span><span className="mt-1 block text-sm text-slate-500">Notify subscribed browsers and installed PWA devices.</span></span></label>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl border bg-white p-6 shadow-sm ${settings.deliveryMode === "CUSTOM" ? "border-slate-300" : "border-slate-200 opacity-75"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Custom SMTP</h2><p className="mt-1 text-sm text-slate-500">Used only when Custom SMTP / IMAP mode is selected.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Last test: {when(settings.lastSmtpTestAt)}</span></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2"><Label htmlFor="smtpHost">SMTP host</Label><Input id="smtpHost" value={settings.smtpHost} onChange={(event) => patch("smtpHost", event.target.value)} placeholder="smtp.example.com"/></div>
            <div className="space-y-2"><Label htmlFor="smtpPort">Port</Label><Input id="smtpPort" type="number" min={1} max={65535} value={settings.smtpPort} onChange={(event) => patch("smtpPort", Number(event.target.value || 587))}/></div>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={settings.smtpSecure} onChange={(event) => patch("smtpSecure", event.target.checked)}/> Direct TLS / SSL</label>
            <div className="space-y-2 lg:col-span-2"><Label htmlFor="smtpUsername">SMTP username</Label><Input id="smtpUsername" value={settings.smtpUsername} onChange={(event) => patch("smtpUsername", event.target.value)} placeholder={initialMailbox.address}/></div>
            <div className="space-y-2 lg:col-span-2"><Label htmlFor="smtpPassword">SMTP password / app password</Label><Input id="smtpPassword" type="password" value={smtpPassword} onChange={(event) => setSmtpPassword(event.target.value)} placeholder={settings.smtpPasswordSaved ? "Saved — enter a new value to replace" : "App password"}/></div>
          </div>
          <div className="mt-5"><Button type="button" variant="outline" onClick={() => void test("SMTP")} disabled={testing !== null}>{testing === "SMTP" ? "Testing SMTP…" : "Test SMTP connection"}</Button></div>
        </section>

        <section className={`rounded-2xl border bg-white p-6 shadow-sm ${settings.deliveryMode === "CUSTOM" ? "border-slate-300" : "border-slate-200 opacity-75"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Custom IMAP</h2><p className="mt-1 text-sm text-slate-500">Validate access to your own inbound mail server. Managed ResearVia inbound routing does not require IMAP credentials.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Last test: {when(settings.lastImapTestAt)}</span></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2"><Label htmlFor="imapHost">IMAP host</Label><Input id="imapHost" value={settings.imapHost} onChange={(event) => patch("imapHost", event.target.value)} placeholder="imap.example.com"/></div>
            <div className="space-y-2"><Label htmlFor="imapPort">Port</Label><Input id="imapPort" type="number" min={1} max={65535} value={settings.imapPort} onChange={(event) => patch("imapPort", Number(event.target.value || 993))}/></div>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={settings.imapSecure} onChange={(event) => patch("imapSecure", event.target.checked)}/> TLS / SSL</label>
            <div className="space-y-2 lg:col-span-2"><Label htmlFor="imapUsername">IMAP username</Label><Input id="imapUsername" value={settings.imapUsername} onChange={(event) => patch("imapUsername", event.target.value)} placeholder={initialMailbox.address}/></div>
            <div className="space-y-2 lg:col-span-2"><Label htmlFor="imapPassword">IMAP password / app password</Label><Input id="imapPassword" type="password" value={imapPassword} onChange={(event) => setImapPassword(event.target.value)} placeholder={settings.imapPasswordSaved ? "Saved — enter a new value to replace" : "App password"}/></div>
          </div>
          <div className="mt-5"><Button type="button" variant="outline" onClick={() => void test("IMAP")} disabled={testing !== null}>{testing === "IMAP" ? "Testing IMAP…" : "Test IMAP connection"}</Button></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Connected personal accounts</h2>
          <p className="mt-1 text-sm text-slate-500">Gmail and Microsoft OAuth accounts remain available as alternate professor-outreach senders.</p>
          <div className="mt-4 flex flex-wrap gap-3"><Link href="/dashboard/email-accounts" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Manage Gmail / Microsoft</Link><Button type="button" variant="outline" onClick={() => void test("DELIVERY")} disabled={testing !== null}>{testing === "DELIVERY" ? "Sending test…" : "Send delivery test"}</Button></div>
        </section>

        <div className="sticky bottom-4 flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save mail settings"}</Button></div>
      </form>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><strong>Platform-managed security:</strong> MX, SPF, DKIM and the shared domain routing are controlled centrally because changing them affects every ResearVia mailbox. Everything specific to your own mailbox is configured here.</div>
    </div>
  );
}
