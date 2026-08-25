"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

type SourceType = "MANUAL" | "SCHOLARSHIP" | "OPPORTUNITY";

export function ApplicationCreateForm({ sourceType, sourceId }: { sourceType: SourceType; sourceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const linked = sourceType !== "MANUAL";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/me/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceType,
          ...(linked ? { sourceId } : {}),
          title: form.get("title") || "",
          organization: form.get("organization") || "",
          university: form.get("university") || "",
          country: form.get("country") || "",
          contactName: form.get("contactName") || "",
          contactEmail: form.get("contactEmail") || "",
          deadline: form.get("deadline") || "",
          status: form.get("status") || "INTERESTED",
          notes: form.get("notes") || ""
        })
      });
      if (!response.ok) {
        const apiError = await readClientApiError(response);
        throw new Error(apiError.message);
      }
      const body = await response.json() as { data?: { application?: { id?: string } } };
      const id = body.data?.application?.id;
      if (!id) throw new Error("Application tracker could not be created.");
      router.push(`/dashboard/applications/${id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create application tracker.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {linked ? <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">This tracker will be created from the published {sourceType.toLowerCase()} record. Title, organization, country, deadline and official URLs are copied server-side so they cannot be spoofed by the browser.</div> : null}
      {error ? <div className="mb-5"><Alert tone="error">{error}</Alert></div> : null}
      {!linked ? <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="title">Application title</Label><Input id="title" name="title" required maxLength={300} className="mt-1.5" /></div><div><Label htmlFor="organization">Organization</Label><Input id="organization" name="organization" maxLength={240} className="mt-1.5" /></div><div><Label htmlFor="university">University</Label><Input id="university" name="university" maxLength={240} className="mt-1.5" /></div><div><Label htmlFor="country">Country</Label><Input id="country" name="country" maxLength={120} className="mt-1.5" /></div><div><Label htmlFor="deadline">Deadline</Label><Input id="deadline" name="deadline" type="date" className="mt-1.5" /></div></div> : null}
      <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><Label htmlFor="contactName">Contact name</Label><Input id="contactName" name="contactName" maxLength={180} className="mt-1.5" /></div><div><Label htmlFor="contactEmail">Contact email</Label><Input id="contactEmail" name="contactEmail" type="email" maxLength={320} className="mt-1.5" /></div><div><Label htmlFor="status">Starting stage</Label><select id="status" name="status" defaultValue="INTERESTED" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="INTERESTED">Interested</option><option value="PREPARING">Preparing</option><option value="CONTACTED">Contacted</option><option value="APPLIED">Applied</option></select></div></div>
      <div className="mt-5"><Label htmlFor="notes">Private notes</Label><textarea id="notes" name="notes" maxLength={5000} className="mt-1.5 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
      <div className="mt-7 flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create tracker"}</Button></div>
    </form>
  );
}
