"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { studentProfileSections, type ProfileField, type ProfileSectionConfig } from "@/lib/student-profile-fields";
import type { StudentProfileDto } from "@/types/profile";

const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const textareaClass = "min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

type RecordValue = Record<string, unknown>;
type SectionValue = RecordValue | RecordValue[] | null;
type Documents = { id: string; kind: string; name: string; mimeType: string; size: number; createdAt: string }[];
type ActiveTab = "personal" | "documents" | string;

function dateInputValue(value: unknown) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function textValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function listValue(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function newDraft(config: ProfileSectionConfig): RecordValue {
  if (config.key === "opportunity-preferences") return { partialFundingAcceptable: true };
  if (config.key === "collaboration-preferences") {
    return { openToCollaboration: true, lookingForSupervisor: true, lookingForResearchAssistantship: true };
  }
  return {};
}

function payloadFor(fields: ProfileField[], draft: RecordValue) {
  const payload: RecordValue = {};
  for (const field of fields) {
    const value = draft[field.name];
    if (field.type === "checkbox") {
      if (field.name in draft) payload[field.name] = Boolean(value);
      continue;
    }
    if (field.type === "list") {
      const parsed = Array.isArray(value) ? value.map(String).filter(Boolean) : listValue(String(value ?? ""));
      if (parsed.length > 0) payload[field.name] = parsed;
      continue;
    }
    if (field.type === "number") {
      if (value !== "" && value !== null && value !== undefined) payload[field.name] = Number(value);
      continue;
    }
    if (field.type === "date") {
      if (value) payload[field.name] = dateInputValue(value);
      continue;
    }
    const normalized = String(value ?? "").trim();
    if (normalized || field.required) payload[field.name] = normalized;
  }
  return payload;
}

function FieldEditor({ field, draft, setDraft }: { field: ProfileField; draft: RecordValue; setDraft: (next: RecordValue) => void }) {
  const value = draft[field.name];
  const update = (next: unknown) => setDraft({ ...draft, [field.name]: next });

  if (field.type === "checkbox") {
    return (
      <label className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 ${field.wide ? "sm:col-span-2" : ""}`}>
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => update(event.target.checked)} className="mt-0.5 size-4 rounded border-slate-300" />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <div className={field.wide ? "sm:col-span-2" : ""}>
      <Label>{field.label}{field.required ? " *" : ""}</Label>
      <div className="mt-1.5">
        {field.type === "textarea" ? (
          <textarea className={textareaClass} value={textValue(value)} onChange={(event) => update(event.target.value)} placeholder={field.placeholder} />
        ) : field.type === "select" ? (
          <select className={inputClass} value={textValue(value)} onChange={(event) => update(event.target.value)}>
            {!field.options?.some((option) => option.value === "") ? <option value="">Select</option> : null}
            {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : (
          <Input
            type={field.type === "list" ? "text" : field.type}
            value={field.type === "date" ? dateInputValue(value) : textValue(value)}
            onChange={(event) => update(event.target.value)}
            placeholder={field.type === "list" ? (field.placeholder ?? "Comma-separated values") : field.placeholder}
            required={field.required}
          />
        )}
      </div>
    </div>
  );
}

function recordSummary(record: RecordValue, config: ProfileSectionConfig) {
  const parts: string[] = [];
  for (const field of config.fields) {
    const value = record[field.name];
    if (value === null || value === undefined || value === "" || value === false) continue;
    const shown = Array.isArray(value) ? value.join(", ") : field.type === "date" ? dateInputValue(value) : String(value);
    if (shown) parts.push(`${field.label}: ${shown}`);
    if (parts.length === 3) break;
  }
  return parts;
}

function sectionHasData(value: SectionValue | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  if (!value) return false;
  return Object.entries(value).some(([key, item]) => !["id", "createdAt", "updatedAt"].includes(key) && item !== "" && item !== null && item !== undefined && (!Array.isArray(item) || item.length > 0));
}

export function ProfileForm({
  initialProfile,
  initialSections,
  documents,
  defaultName
}: {
  initialProfile: StudentProfileDto;
  initialSections: Record<string, SectionValue>;
  documents: Documents;
  defaultName: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState({ ...initialProfile, fullName: initialProfile.fullName || defaultName });
  const [sections, setSections] = useState(initialSections);
  const [active, setActive] = useState<ActiveTab>("personal");
  const [draft, setDraft] = useState<RecordValue>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openTab(tab: ActiveTab) {
    setActive(tab);
    setEditingId(null);
    setMessage(null);
    setError(null);
    const config = studentProfileSections.find((item) => item.key === tab);
    if (!config) return setDraft({});
    const current = sections[config.key];
    setDraft(!config.repeatable && current && !Array.isArray(current) ? { ...current } : newDraft(config));
  }

  async function savePersonal() {
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          headline: profile.headline,
          phone: profile.phone,
          dateOfBirth: profile.dateOfBirth ? dateInputValue(profile.dateOfBirth) : null,
          gender: profile.gender,
          nationality: profile.nationality,
          country: profile.country,
          city: profile.city,
          bio: profile.bio,
          profileVisibility: profile.profileVisibility
        })
      });
      const body = await response.json() as { data?: { profile?: StudentProfileDto }; error?: { message?: string } };
      if (!response.ok || !body.data?.profile) throw new Error(body.error?.message || "Unable to save personal profile.");
      setProfile(body.data.profile);
      setMessage("Personal profile saved.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save personal profile.");
    } finally { setSaving(false); }
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/v1/me/profile/photo", { method: "POST", body: new FormData(form) });
      const body = await response.json() as { data?: { profile?: StudentProfileDto }; error?: { message?: string } };
      if (!response.ok || !body.data?.profile) throw new Error(body.error?.message || "Unable to upload profile photo.");
      setProfile(body.data.profile);
      form.reset();
      setMessage("Profile photo updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload profile photo.");
    } finally { setSaving(false); }
  }

  async function removePhoto() {
    if (!window.confirm("Remove your profile photo?")) return;
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/v1/me/profile/photo", { method: "DELETE" });
      const body = await response.json() as { data?: { profile?: StudentProfileDto }; error?: { message?: string } };
      if (!response.ok || !body.data?.profile) throw new Error(body.error?.message || "Unable to remove profile photo.");
      setProfile(body.data.profile);
      setMessage("Profile photo removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove profile photo.");
    } finally { setSaving(false); }
  }

  async function saveSection(config: ProfileSectionConfig) {
    setSaving(true); setMessage(null); setError(null);
    try {
      const payload = payloadFor(config.fields, draft);
      const url = editingId
        ? `/api/v1/me/profile/sections/${config.key}/${editingId}`
        : `/api/v1/me/profile/sections/${config.key}`;
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json() as { data?: { item?: RecordValue }; error?: { message?: string } };
      if (!response.ok || !body.data?.item) throw new Error(body.error?.message || `Unable to save ${config.label.toLowerCase()}.`);
      const item = body.data.item;
      setSections((current) => {
        if (!config.repeatable) return { ...current, [config.key]: item };
        const rows = Array.isArray(current[config.key]) ? current[config.key] as RecordValue[] : [];
        const next = editingId ? rows.map((row) => String(row.id) === editingId ? item : row) : [item, ...rows];
        return { ...current, [config.key]: next };
      });
      setDraft(config.repeatable ? newDraft(config) : { ...item });
      setEditingId(null);
      setMessage(`${config.label} saved.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to save ${config.label.toLowerCase()}.`);
    } finally { setSaving(false); }
  }

  async function removeRecord(config: ProfileSectionConfig, id: string) {
    if (!window.confirm(`Delete this ${config.itemLabel}?`)) return;
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/v1/me/profile/sections/${config.key}/${id}`, { method: "DELETE" });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || `Unable to delete ${config.itemLabel}.`);
      setSections((current) => ({
        ...current,
        [config.key]: (Array.isArray(current[config.key]) ? current[config.key] as RecordValue[] : []).filter((row) => String(row.id) !== id)
      }));
      if (editingId === id) { setEditingId(null); setDraft(newDraft(config)); }
      setMessage(`${config.itemLabel.charAt(0).toUpperCase()}${config.itemLabel.slice(1)} deleted.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to delete ${config.itemLabel}.`);
    } finally { setSaving(false); }
  }

  const activeConfig = studentProfileSections.find((item) => item.key === active);

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <nav className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col" aria-label="Student profile sections">
            <button type="button" onClick={() => openTab("personal")} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${active === "personal" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"}`}>
              <span>Personal</span><span className={`size-2 rounded-full ${profile.fullName && profile.country ? "bg-emerald-400" : "bg-slate-300"}`} />
            </button>
            {studentProfileSections.map((config) => (
              <button key={config.key} type="button" onClick={() => openTab(config.key)} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${active === config.key ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"}`}>
                <span>{config.label}</span><span className={`size-2 rounded-full ${sectionHasData(sections[config.key]) ? "bg-emerald-400" : "bg-slate-300"}`} />
              </button>
            ))}
            <button type="button" onClick={() => openTab("documents")} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${active === "documents" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"}`}>
              <span>Documents</span><span className={`size-2 rounded-full ${documents.length ? "bg-emerald-400" : "bg-slate-300"}`} />
            </button>
          </nav>
        </div>
      </aside>

      <main className="min-w-0 space-y-5">
        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {active === "personal" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold text-slate-950">Personal profile</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Your identity and contact context. Sensitive profile fields stay private unless you explicitly choose to share them.</p>
            </div>
            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-500">
                {profile.photoUrl ? <Image src={profile.photoUrl} alt="Profile photo" width={96} height={96} unoptimized className="size-24 object-cover" /> : (profile.fullName || defaultName).slice(0, 1).toUpperCase()}
              </div>
              <form onSubmit={uploadPhoto} className="flex flex-1 flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1"><Label htmlFor="profile-photo">Profile photo</Label><input id="profile-photo" name="file" type="file" required accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></div>
                <Button type="submit" disabled={saving}>Upload</Button>
                {profile.photoUrl ? <Button type="button" variant="secondary" disabled={saving} onClick={() => void removePhoto()}>Remove</Button> : null}
                <p className="basis-full text-xs text-slate-500">JPEG, PNG or WebP · maximum 5 MB.</p>
              </form>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div><Label>Full name</Label><div className="mt-1.5"><Input value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} /></div></div>
              <div><Label>Professional / academic headline</Label><div className="mt-1.5"><Input value={profile.headline} onChange={(event) => setProfile({ ...profile, headline: event.target.value })} /></div></div>
              <div><Label>Phone</Label><div className="mt-1.5"><Input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></div></div>
              <div><Label>Date of birth</Label><div className="mt-1.5"><Input type="date" value={dateInputValue(profile.dateOfBirth)} onChange={(event) => setProfile({ ...profile, dateOfBirth: event.target.value || null })} /></div></div>
              <div><Label>Gender (optional)</Label><div className="mt-1.5"><select className={inputClass} value={profile.gender} onChange={(event) => setProfile({ ...profile, gender: event.target.value as StudentProfileDto["gender"] })}><option value="">Not specified</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="NON_BINARY">Non-binary</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option><option value="OTHER">Other</option></select></div></div>
              <div><Label>Nationality</Label><div className="mt-1.5"><Input value={profile.nationality} onChange={(event) => setProfile({ ...profile, nationality: event.target.value })} /></div></div>
              <div><Label>Current country</Label><div className="mt-1.5"><Input value={profile.country} onChange={(event) => setProfile({ ...profile, country: event.target.value })} /></div></div>
              <div><Label>Current city</Label><div className="mt-1.5"><Input value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} /></div></div>
              <div className="sm:col-span-2"><Label>About / short bio</Label><div className="mt-1.5"><textarea className={textareaClass} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></div></div>
              <div className="sm:col-span-2"><Label>Profile use</Label><div className="mt-1.5"><select className={inputClass} value={profile.profileVisibility} onChange={(event) => setProfile({ ...profile, profileVisibility: event.target.value as StudentProfileDto["profileVisibility"] })}><option value="RECOMMENDATION_ONLY">Use privately for matching and recommendations</option><option value="PRIVATE">Private profile only</option></select></div></div>
            </div>
            <div className="mt-6 flex justify-end"><Button type="button" onClick={() => void savePersonal()} disabled={saving}>{saving ? "Saving…" : "Save personal profile"}</Button></div>
          </section>
        ) : null}

        {activeConfig ? (
          <div className="space-y-5">
            {activeConfig.repeatable && Array.isArray(sections[activeConfig.key]) && (sections[activeConfig.key] as RecordValue[]).length > 0 ? (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">Saved {activeConfig.label.toLowerCase()}</h2></div>
                <div className="divide-y divide-slate-100">
                  {(sections[activeConfig.key] as RecordValue[]).map((record) => (
                    <div key={String(record.id)} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">{recordSummary(record, activeConfig).map((line, index) => <p key={`${String(record.id)}-${index}`} className={index === 0 ? "font-medium text-slate-900" : "text-sm text-slate-500"}>{line}</p>)}</div>
                      <div className="flex shrink-0 gap-2"><Button type="button" variant="secondary" onClick={() => { setEditingId(String(record.id)); setDraft({ ...record }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => void removeRecord(activeConfig, String(record.id))}>Delete</Button></div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div><h2 className="text-lg font-semibold text-slate-950">{editingId ? `Edit ${activeConfig.itemLabel}` : activeConfig.label}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{activeConfig.description}</p></div>
                {editingId ? <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setDraft(newDraft(activeConfig)); }}>Cancel edit</Button> : null}
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {activeConfig.fields.map((field) => <FieldEditor key={field.name} field={field} draft={draft} setDraft={setDraft} />)}
              </div>
              <div className="mt-6 flex justify-end"><Button type="button" disabled={saving} onClick={() => void saveSection(activeConfig)}>{saving ? "Saving…" : activeConfig.repeatable ? (editingId ? "Save changes" : `Add ${activeConfig.itemLabel}`) : "Save section"}</Button></div>
            </section>
          </div>
        ) : null}

        {active === "documents" ? <DocumentManager documents={documents} /> : null}
      </main>
    </div>
  );
}
