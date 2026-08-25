"use client";

import { useEffect, useState, type FormEvent } from "react";

type Preferences = { aiProcessingAllowed: boolean; recommendationPersonalization: boolean; analyticsAllowed: boolean; emailSyncAllowed: boolean };
type Session = { id: string; createdAt: string; lastSeenAt: string; expiresAt: string; ipAddress: string | null; userAgent: string | null; isCurrent: boolean };
const defaults: Preferences = { aiProcessingAllowed: false, recommendationPersonalization: true, analyticsAllowed: false, emailSyncAllowed: false };

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Request failed.");
  return body.data;
}

export function PrivacyCenter() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [privacyData, sessionData] = await Promise.all([jsonRequest("/api/v1/me/privacy"), jsonRequest("/api/v1/me/security/sessions")]);
      const p = privacyData.preferences as Partial<Preferences>;
      setPreferences({ ...defaults, ...p });
      setSessions(sessionData.sessions as Session[]);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not load privacy controls."); }
  }

  useEffect(() => { void refresh(); }, []);

  async function savePreferences() {
    setBusy(true); setStatus("");
    try {
      const data = await jsonRequest("/api/v1/me/privacy", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(preferences) });
      setPreferences({ ...defaults, ...(data.preferences as Partial<Preferences>) });
      setStatus("Privacy preferences saved.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save privacy preferences."); }
    finally { setBusy(false); }
  }

  async function revokeSession(id: string) {
    setBusy(true); setStatus("");
    try { await jsonRequest(`/api/v1/me/security/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }); await refresh(); setStatus("Session revoked."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Could not revoke session."); }
    finally { setBusy(false); }
  }

  async function revokeOthers() {
    setBusy(true); setStatus("");
    try { await jsonRequest("/api/v1/me/security/sessions/revoke-others", { method: "POST" }); await refresh(); setStatus("Other active sessions revoked."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Could not revoke other sessions."); }
    finally { setBusy(false); }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (confirmation !== "DELETE MY ACCOUNT") { setStatus("Type DELETE MY ACCOUNT exactly to confirm deletion."); return; }
    setBusy(true); setStatus("");
    try {
      await jsonRequest("/api/v1/me/privacy/delete-account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, confirmation }) });
      window.location.assign("/");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Account deletion failed."); setBusy(false); }
  }

  const toggles: Array<[keyof Preferences, string, string]> = [
    ["recommendationPersonalization", "Personalized recommendations", "Use your academic profile and saved activity for deterministic matching."],
    ["aiProcessingAllowed", "Optional AI processing", "Allow configured optional AI tools to process submitted academic context. Core features still work without it."],
    ["emailSyncAllowed", "Connected email synchronization", "Allow explicitly connected Gmail/Outlook accounts to synchronize supported metadata."],
    ["analyticsAllowed", "Product analytics", "Allow non-essential product analytics associated with your account."]
  ];

  return <div className="space-y-8">
    <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Privacy preferences</h2><p className="mt-1 text-sm text-slate-600">Control optional processing independently. Security, account integrity, and essential service operations are not disabled by these switches.</p><div className="mt-5 space-y-3">{toggles.map(([key,label,description]) => <label key={key} className="flex cursor-pointer items-start justify-between gap-5 rounded-lg border p-4"><span><span className="block text-sm font-medium text-slate-950">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span><input type="checkbox" className="mt-1 size-4" checked={preferences[key]} onChange={(event) => setPreferences((value) => ({ ...value, [key]: event.target.checked }))}/></label>)}</div><button disabled={busy} onClick={savePreferences} className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save preferences</button></section>

    <section className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Devices & sessions</h2><p className="mt-1 text-sm text-slate-600">Review active opaque-cookie sessions. Session tokens and token hashes are never displayed.</p></div><button disabled={busy || sessions.length < 2} onClick={revokeOthers} className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50">Sign out other devices</button></div><div className="mt-4 space-y-3">{sessions.map((session) => <article key={session.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="text-sm font-medium">{session.isCurrent ? "Current session" : "Active session"}</p>{session.isCurrent ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Current</span> : null}</div><p className="mt-1 max-w-3xl break-words text-xs text-slate-500">{session.userAgent || "Unknown device"}</p><p className="mt-2 text-xs text-slate-500">IP {session.ipAddress || "Unknown"} · Last active {new Date(session.lastSeenAt).toLocaleString()} · Expires {new Date(session.expiresAt).toLocaleString()}</p></div>{!session.isCurrent ? <button disabled={busy} onClick={() => revokeSession(session.id)} className="rounded-md border px-3 py-1.5 text-xs font-medium text-red-700">Revoke</button> : null}</div></article>)}{sessions.length === 0 ? <p className="text-sm text-slate-600">No active sessions were returned.</p> : null}</div></section>

    <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Your data</h2><p className="mt-1 text-sm text-slate-600">Export account-scoped data as JSON. Private uploaded file bytes are not embedded in the export.</p><a href="/api/v1/me/privacy/export" className="mt-4 inline-block rounded-md border px-4 py-2 text-sm font-medium">Download data export</a></section>

    <section className="rounded-xl border border-red-200 bg-red-50/40 p-5"><h2 className="text-lg font-semibold text-red-950">Delete account</h2><p className="mt-1 text-sm text-red-800">This permanently removes student workspace data and revokes sessions. Stored document binaries are queued for durable GridFS cleanup.</p><form onSubmit={deleteAccount} className="mt-4 grid gap-3 max-w-xl"><label className="text-sm font-medium text-red-950">Current password<input required name="password" type="password" autoComplete="current-password" className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-medium text-red-950">Type DELETE MY ACCOUNT<input required name="confirmation" autoComplete="off" className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-slate-950"/></label><button disabled={busy} className="w-fit rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Permanently delete account</button></form></section>
    {status ? <p role="status" className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p> : null}
  </div>;
}
