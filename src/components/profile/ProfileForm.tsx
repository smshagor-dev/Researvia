"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatList, parseList, profileToPatch } from "@/lib/profile-form";
import type { CurrentDegree, FundingPreference, ProfileVisibility, StudentProfileDto, TargetDegree } from "@/types/profile";

const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const textareaClass = "min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><Label>{label}</Label><div className="mt-1.5">{children}</div></div>;
}

export function ProfileForm({ initialProfile }: { initialProfile: StudentProfileDto }) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profileToPatch(profile))
      });
      const body = (await response.json()) as { data?: { profile?: StudentProfileDto }; error?: { message?: string } };
      if (!response.ok || !body.data?.profile) throw new Error(body.error?.message || "Unable to save profile.");
      setProfile(body.data.profile);
      setMessage("Academic profile saved.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Section title="Academic background" description="Your current study context and location.">
        <Field label="Country"><Input value={profile.country} onChange={(event) => setProfile({ ...profile, country: event.target.value })} /></Field>
        <Field label="Current university"><Input value={profile.currentUniversity} onChange={(event) => setProfile({ ...profile, currentUniversity: event.target.value })} /></Field>
        <Field label="Current degree">
          <select className={inputClass} value={profile.currentDegree ?? ""} onChange={(event) => setProfile({ ...profile, currentDegree: (event.target.value || null) as CurrentDegree | null })}>
            <option value="">Select degree</option><option value="HIGH_SCHOOL">High school</option><option value="BACHELORS">Bachelor&apos;s</option><option value="MASTERS">Master&apos;s</option><option value="PHD">PhD</option><option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Field of study"><Input value={profile.fieldOfStudy} onChange={(event) => setProfile({ ...profile, fieldOfStudy: event.target.value })} /></Field>
        <Field label="Graduation year"><Input type="number" min={1950} max={2100} value={profile.graduationYear ?? ""} onChange={(event) => setProfile({ ...profile, graduationYear: event.target.value ? Number(event.target.value) : null })} /></Field>
        <Field label="GPA / grade (optional)"><Input value={profile.gpa} onChange={(event) => setProfile({ ...profile, gpa: event.target.value })} placeholder="e.g. 3.75 / 4.00" /></Field>
      </Section>

      <Section title="Research profile" description="Use comma-separated entries for lists.">
        <Field label="Research interests" wide><Input value={formatList(profile.researchInterests)} onChange={(event) => setProfile({ ...profile, researchInterests: parseList(event.target.value) })} placeholder="Machine learning, robotics, cybersecurity" /></Field>
        <Field label="Skills" wide><Input value={formatList(profile.skills)} onChange={(event) => setProfile({ ...profile, skills: parseList(event.target.value) })} placeholder="Python, C++, PyTorch" /></Field>
        <Field label="Languages"><Input value={formatList(profile.languages)} onChange={(event) => setProfile({ ...profile, languages: parseList(event.target.value) })} placeholder="English, Bangla" /></Field>
        <Field label="Preferred research areas"><Input value={formatList(profile.preferredResearchAreas)} onChange={(event) => setProfile({ ...profile, preferredResearchAreas: parseList(event.target.value) })} /></Field>
        <Field label="Short academic bio" wide><textarea className={textareaClass} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="Summarize your academic interests and research direction." /></Field>
      </Section>

      <Section title="Study goals" description="These preferences will guide future opportunity matching.">
        <Field label="Target degrees"><Input value={formatList(profile.targetDegrees)} onChange={(event) => setProfile({ ...profile, targetDegrees: parseList(event.target.value).filter((value): value is TargetDegree => ["BACHELORS", "MASTERS", "PHD", "RESEARCH", "OTHER"].includes(value)) })} placeholder="MASTERS, PHD" /></Field>
        <Field label="Target countries"><Input value={formatList(profile.targetCountries)} onChange={(event) => setProfile({ ...profile, targetCountries: parseList(event.target.value) })} /></Field>
        <Field label="Funding preference">
          <select className={inputClass} value={profile.fundingPreference} onChange={(event) => setProfile({ ...profile, fundingPreference: event.target.value as FundingPreference })}>
            <option value="ANY">Any funding option</option><option value="FULLY_FUNDED">Fully funded only</option><option value="FULL_OR_PARTIAL">Full or partial funding</option><option value="SELF_FUNDED">Self funded</option>
          </select>
        </Field>
        <Field label="Profile use">
          <select className={inputClass} value={profile.profileVisibility} onChange={(event) => setProfile({ ...profile, profileVisibility: event.target.value as ProfileVisibility })}>
            <option value="RECOMMENDATION_ONLY">Use for recommendations</option><option value="PRIVATE">Keep private</option>
          </select>
        </Field>
      </Section>

      <Section title="Academic links" description="Optional links help you keep one complete academic workspace.">
        <Field label="Website"><Input type="url" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} /></Field>
        <Field label="LinkedIn"><Input type="url" value={profile.linkedin} onChange={(event) => setProfile({ ...profile, linkedin: event.target.value })} /></Field>
        <Field label="GitHub"><Input type="url" value={profile.github} onChange={(event) => setProfile({ ...profile, github: event.target.value })} /></Field>
        <Field label="Google Scholar"><Input type="url" value={profile.googleScholar} onChange={(event) => setProfile({ ...profile, googleScholar: event.target.value })} /></Field>
        <Field label="ORCID"><Input type="url" value={profile.orcid} onChange={(event) => setProfile({ ...profile, orcid: event.target.value })} /></Field>
      </Section>

      <div className="flex justify-end"><Button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button></div>
    </div>
  );
}
