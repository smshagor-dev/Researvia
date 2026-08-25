"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatList, parseList, profileToPatch } from "@/lib/profile-form";
import type { CurrentDegree, FundingPreference, StudentProfileDto, TargetDegree } from "@/types/profile";

const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const textareaClass = "min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const degreeOptions: { value: TargetDegree; label: string }[] = [
  { value: "BACHELORS", label: "Bachelor's" },
  { value: "MASTERS", label: "Master's" },
  { value: "PHD", label: "PhD" },
  { value: "RESEARCH", label: "Research role" },
  { value: "OTHER", label: "Other" }
];

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><Label>{label}</Label><div className="mt-1.5">{children}</div></div>;
}

export function OnboardingForm({ initialProfile }: { initialProfile: StudentProfileDto }) {
  const [profile, setProfile] = useState(initialProfile);
  const [step, setStep] = useState(Math.max(1, Math.min(initialProfile.onboardingStep, 4)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggleDegree(value: TargetDegree) {
    setProfile((current) => ({
      ...current,
      targetDegrees: current.targetDegrees.includes(value)
        ? current.targetDegrees.filter((degree) => degree !== value)
        : [...current.targetDegrees, value]
    }));
  }

  async function save(nextStep?: number) {
    setSaving(true);
    setError(null);
    try {
      const targetStep = nextStep ?? step;
      const response = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profileToPatch(profile, targetStep))
      });
      const body = (await response.json()) as { data?: { profile?: StudentProfileDto }; error?: { message?: string } };
      if (!response.ok || !body.data?.profile) throw new Error(body.error?.message || "Unable to save onboarding progress.");
      setProfile(body.data.profile);
      if (nextStep) setStep(nextStep);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save onboarding progress.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const saveResponse = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profileToPatch(profile, 4))
      });
      const savedBody = (await saveResponse.json()) as { data?: { profile?: StudentProfileDto }; error?: { message?: string } };
      if (!saveResponse.ok || !savedBody.data?.profile) throw new Error(savedBody.error?.message || "Unable to save onboarding progress.");

      const response = await fetch("/api/v1/me/onboarding/complete", { method: "POST" });
      const body = (await response.json()) as { data?: { profile?: StudentProfileDto }; error?: { message?: string } };
      if (!response.ok || !body.data?.profile) throw new Error(body.error?.message || "Complete the required fields before finishing onboarding.");
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to finish onboarding.");
    } finally {
      setSaving(false);
    }
  }

  const titles = ["Academic background", "Research profile", "Study goals", "Academic identity"];
  const descriptions = [
    "Tell ResearVia where you are in your academic journey.",
    "Add the areas and skills that best represent your research direction.",
    "Choose the paths and destinations you want to explore.",
    "Add optional links and a short bio to complete your workspace."
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside>
        <p className="text-sm font-semibold text-slate-950">Setup progress</p>
        <div className="mt-4 space-y-3">
          {titles.map((title, index) => {
            const number = index + 1;
            const active = number === step;
            const done = number < step;
            return (
              <div key={title} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${active ? "bg-slate-950 text-white" : "text-slate-600"}`}>
                <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${active ? "bg-white text-slate-950" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{done ? "✓" : number}</span>
                <span className="text-sm font-medium">{title}</span>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="border-b border-slate-100 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step {step} of 4</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{titles[step - 1]}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{descriptions[step - 1]}</p>
        </div>

        {error ? <div className="mt-5"><Alert tone="error">{error}</Alert></div> : null}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {step === 1 ? (
            <>
              <Field label="Country"><Input value={profile.country} onChange={(event) => setProfile({ ...profile, country: event.target.value })} /></Field>
              <Field label="Current university"><Input value={profile.currentUniversity} onChange={(event) => setProfile({ ...profile, currentUniversity: event.target.value })} /></Field>
              <Field label="Current degree">
                <select className={selectClass} value={profile.currentDegree ?? ""} onChange={(event) => setProfile({ ...profile, currentDegree: (event.target.value || null) as CurrentDegree | null })}>
                  <option value="">Select degree</option><option value="HIGH_SCHOOL">High school</option><option value="BACHELORS">Bachelor&apos;s</option><option value="MASTERS">Master&apos;s</option><option value="PHD">PhD</option><option value="OTHER">Other</option>
                </select>
              </Field>
              <Field label="Field of study"><Input value={profile.fieldOfStudy} onChange={(event) => setProfile({ ...profile, fieldOfStudy: event.target.value })} /></Field>
              <Field label="Graduation year"><Input type="number" min={1950} max={2100} value={profile.graduationYear ?? ""} onChange={(event) => setProfile({ ...profile, graduationYear: event.target.value ? Number(event.target.value) : null })} /></Field>
              <Field label="GPA / grade (optional)"><Input value={profile.gpa} onChange={(event) => setProfile({ ...profile, gpa: event.target.value })} /></Field>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Research interests" wide><Input value={formatList(profile.researchInterests)} onChange={(event) => setProfile({ ...profile, researchInterests: parseList(event.target.value) })} placeholder="Machine learning, robotics, cybersecurity" /></Field>
              <Field label="Skills" wide><Input value={formatList(profile.skills)} onChange={(event) => setProfile({ ...profile, skills: parseList(event.target.value) })} placeholder="Python, C++, PyTorch" /></Field>
              <Field label="Languages" wide><Input value={formatList(profile.languages)} onChange={(event) => setProfile({ ...profile, languages: parseList(event.target.value) })} placeholder="English, Bangla" /></Field>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field label="Target degrees" wide>
                <div className="flex flex-wrap gap-2">
                  {degreeOptions.map((option) => {
                    const selected = profile.targetDegrees.includes(option.value);
                    return <button key={option.value} type="button" onClick={() => toggleDegree(option.value)} className={`rounded-full border px-3 py-2 text-sm font-medium transition ${selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>{option.label}</button>;
                  })}
                </div>
              </Field>
              <Field label="Target countries" wide><Input value={formatList(profile.targetCountries)} onChange={(event) => setProfile({ ...profile, targetCountries: parseList(event.target.value) })} placeholder="Germany, United States, Canada" /></Field>
              <Field label="Funding preference">
                <select className={selectClass} value={profile.fundingPreference} onChange={(event) => setProfile({ ...profile, fundingPreference: event.target.value as FundingPreference })}>
                  <option value="ANY">Any funding option</option><option value="FULLY_FUNDED">Fully funded only</option><option value="FULL_OR_PARTIAL">Full or partial funding</option><option value="SELF_FUNDED">Self funded</option>
                </select>
              </Field>
              <Field label="Preferred research areas"><Input value={formatList(profile.preferredResearchAreas)} onChange={(event) => setProfile({ ...profile, preferredResearchAreas: parseList(event.target.value) })} /></Field>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Field label="Short academic bio" wide><textarea className={textareaClass} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="What are you interested in researching and why?" /></Field>
              <Field label="Website"><Input type="url" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} /></Field>
              <Field label="LinkedIn"><Input type="url" value={profile.linkedin} onChange={(event) => setProfile({ ...profile, linkedin: event.target.value })} /></Field>
              <Field label="GitHub"><Input type="url" value={profile.github} onChange={(event) => setProfile({ ...profile, github: event.target.value })} /></Field>
              <Field label="Google Scholar"><Input type="url" value={profile.googleScholar} onChange={(event) => setProfile({ ...profile, googleScholar: event.target.value })} /></Field>
              <Field label="ORCID"><Input type="url" value={profile.orcid} onChange={(event) => setProfile({ ...profile, orcid: event.target.value })} /></Field>
            </>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          <Button type="button" variant="ghost" disabled={step === 1 || saving} onClick={() => setStep((current) => Math.max(1, current - 1))}>Back</Button>
          {step < 4 ? <Button type="button" disabled={saving} onClick={() => save(step + 1)}>{saving ? "Saving…" : "Save & continue"}</Button> : <Button type="button" disabled={saving} onClick={finish}>{saving ? "Finishing…" : "Finish setup"}</Button>}
        </div>
      </section>
    </div>
  );
}
