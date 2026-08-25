"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

type Status = { enabled: boolean; enabledAt: string | null };
type Setup = { secret: string; otpauthUrl: string };

export function TwoFactorPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/v1/me/security/2fa", { cache: "no-store" });
    if (response.ok) setStatus(((await response.json()) as { data: Status }).data);
  }

  useEffect(() => { void load(); }, []);

  async function start() {
    setError(null); setMessage(null); setRecoveryCodes([]);
    const response = await fetch("/api/v1/me/security/2fa", { method: "POST" });
    if (!response.ok) { setError((await readClientApiError(response)).message); return; }
    setSetup(((await response.json()) as { data: Setup }).data);
  }

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/me/security/2fa", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: form.get("code") }) });
    if (!response.ok) { setError((await readClientApiError(response)).message); return; }
    const data = ((await response.json()) as { data: { recoveryCodes: string[] } }).data;
    setRecoveryCodes(data.recoveryCodes); setSetup(null); setMessage("Two-factor authentication is now enabled. Store the recovery codes somewhere safe."); await load();
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/me/security/2fa", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: form.get("code") }) });
    if (!response.ok) { setError((await readClientApiError(response)).message); return; }
    setMessage("Two-factor authentication disabled."); setRecoveryCodes([]); await load();
  }

  return <div className="space-y-6">
    {error ? <Alert>{error}</Alert> : null}
    {message ? <Alert tone="info">{message}</Alert> : null}
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-950">Authenticator app</h2><p className="mt-1 text-sm text-slate-600">Protect sign-in with a time-based one-time password and single-use recovery codes.</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status?.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{status?.enabled ? "Enabled" : "Disabled"}</span></div>
      {!status?.enabled && !setup ? <Button className="mt-5" onClick={start}>Set up two-factor authentication</Button> : null}
      {setup ? <div className="mt-5 space-y-4"><Alert tone="info">Add the account in any TOTP authenticator. If your app cannot open the setup URI, enter the secret manually.</Alert><div><Label>Setup secret</Label><code className="mt-2 block break-all rounded-lg bg-slate-950 p-3 text-sm text-white">{setup.secret}</code></div><details className="text-sm text-slate-600"><summary className="cursor-pointer font-medium">Show otpauth URI</summary><code className="mt-2 block break-all rounded-lg bg-slate-50 p-3">{setup.otpauthUrl}</code></details><form className="space-y-3" onSubmit={enable}><Label htmlFor="enable-code">Verify 6-digit code</Label><Input id="enable-code" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} placeholder="123456"/><Button type="submit">Verify and enable</Button></form></div> : null}
      {status?.enabled ? <form className="mt-5 max-w-md space-y-3" onSubmit={disable}><Label htmlFor="disable-code">Disable using authenticator or recovery code</Label><Input id="disable-code" name="code" required maxLength={32}/><Button type="submit" variant="secondary">Disable two-factor authentication</Button></form> : null}
    </div>
    {recoveryCodes.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-6"><h3 className="font-semibold text-amber-950">Recovery codes — shown once</h3><p className="mt-1 text-sm text-amber-800">Each code can be used once if you lose access to your authenticator.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{recoveryCodes.map((code) => <code key={code} className="rounded-md bg-white px-3 py-2 text-sm text-slate-900">{code}</code>)}</div></div> : null}
  </div>;
}
