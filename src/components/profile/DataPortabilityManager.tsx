"use client";

import { ChangeEvent, useState } from "react";

type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

type ExportPayload = {
  product: string;
  version: number;
  exportedAt: string;
  personal: Record<string, unknown>;
  sections: Record<string, unknown>;
};

export function DataPortabilityManager() {
  const [mode, setMode] = useState<"MERGE" | "REPLACE">("MERGE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"EXPORT" | "IMPORT" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const body = await response.json() as ApiEnvelope<T>;
    if (!response.ok) throw new Error(body.error?.message || "Request failed.");
    if (!body.data) throw new Error("Unexpected server response.");
    return body.data;
  }

  async function exportData() {
    setBusy("EXPORT");
    setError("");
    setNotice("");
    try {
      const result = await api<{ export: ExportPayload }>("/api/v1/me/data-portability");
      const blob = new Blob([JSON.stringify(result.export, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `researvia-profile-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice("A versioned profile export was generated successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile export failed.");
    } finally {
      setBusy(null);
    }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError("");
    setNotice("");
  }

  async function importData() {
    if (!selectedFile) {
      setError("Choose a ResearVia JSON export first.");
      return;
    }
    if (selectedFile.size > 2 * 1024 * 1024) {
      setError("Profile import files must be 2 MB or smaller.");
      return;
    }
    setBusy("IMPORT");
    setError("");
    setNotice("");
    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text) as unknown;
      const result = await api<{ result: { totalRecords: number } }>("/api/v1/me/data-portability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, data })
      });
      setNotice(`Import complete. ${result.result.totalRecords} validated profile records were applied.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile import failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Account portability</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Import & export profile data</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Move your structured academic profile without copying internal IDs, authentication secrets, or private system metadata. Imports are validated against the same schemas used by the profile editor.</p>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Export</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Downloads personal academic fields and every structured CV/research section as versioned JSON. Passwords, sessions, OAuth tokens and mailbox credentials are never included.</p>
          <button type="button" onClick={exportData} disabled={busy !== null} className="mt-6 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{busy === "EXPORT" ? "Preparing export…" : "Export my profile"}</button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Import</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use a ResearVia JSON export. Invalid fields or malformed records are rejected before they can corrupt your academic profile.</p>
          <label className="mt-5 grid gap-1.5 text-sm font-medium text-slate-700">Import mode
            <select value={mode} onChange={(event) => setMode(event.target.value as "MERGE" | "REPLACE")} className="rounded-lg border border-slate-300 px-3 py-2.5">
              <option value="MERGE">Merge with current profile</option>
              <option value="REPLACE">Replace repeatable section records</option>
            </select>
          </label>
          <label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700">Profile export
            <input type="file" accept="application/json,.json" onChange={chooseFile} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          {selectedFile ? <p className="mt-2 text-xs text-slate-500">Selected: {selectedFile.name}</p> : null}
          <button type="button" onClick={importData} disabled={busy !== null || !selectedFile} className="mt-6 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">{busy === "IMPORT" ? "Validating & importing…" : "Import profile"}</button>
        </section>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <strong>Replace mode is intentionally scoped.</strong> It replaces repeatable section records such as education, projects, publications and skills, while singleton sections are safely updated only when present in the import file. This avoids accidental deletion from a partial backup.
      </section>
    </div>
  );
}
