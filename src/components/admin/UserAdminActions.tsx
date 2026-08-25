"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readClientApiError } from "@/lib/client-api";

export function UserAdminActions({ userId, role, status, canManage }: { userId: string; role: string; status: string; canManage: boolean }) {
  const router = useRouter();
  const [nextRole, setNextRole] = useState(role);
  const [nextStatus, setNextStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole, status: nextStatus })
      });
      if (!response.ok) throw new Error((await readClientApiError(response)).message);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update user.");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) return <span className="text-xs text-slate-400">Super admin required</span>;

  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <select value={nextRole} onChange={(event) => setNextRole(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
        <option value="STUDENT">Student</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super admin</option>
      </select>
      <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
        <option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DELETED">Deleted</option>
      </select>
      <button type="button" onClick={save} disabled={saving || (nextRole === role && nextStatus === status)} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">{saving ? "Saving…" : "Save"}</button>
    </div>
    {error ? <p className="max-w-sm text-xs text-red-600">{error}</p> : null}
  </div>;
}
