"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

type Match = { id: string; slug: string; kind: "PROFESSOR" | "SCHOLARSHIP" | "OPPORTUNITY"; title: string; subtitle: string; country: string; matchScore: number; matchedReasons: string[]; possibleGaps: string[]; recommendedActions: string[] };
type Recommendations = { mode: "DETERMINISTIC"; professors: Match[]; scholarships: Match[]; opportunities: Match[] };
type Feedback = "INTERESTED" | "NOT_RELEVANT" | "ALREADY_APPLIED" | "WRONG_FIELD" | "WRONG_COUNTRY" | "TOO_COMPETITIVE";

function href(item: Match) {
  if (item.kind === "PROFESSOR") return `/dashboard/professors/${item.slug}`;
  if (item.kind === "SCHOLARSHIP") return `/dashboard/scholarships/${item.slug}`;
  return `/dashboard/opportunities/${item.slug}`;
}

function MatchGroup({ title, items }: { title: string; items: Match[] }) {
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitFeedback(item: Match, value: Feedback) {
    const key = `${item.kind}-${item.id}`;
    setBusyId(key); setError(null);
    const response = await fetch("/api/v1/me/recommendations/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType: item.kind, targetId: item.id, feedback: value }) });
    if (!response.ok) setError((await readClientApiError(response)).message);
    else setFeedback((current) => ({ ...current, [key]: value }));
    setBusyId(null);
  }

  const options: Array<[Feedback, string]> = [["INTERESTED", "Interested"], ["NOT_RELEVANT", "Not relevant"], ["ALREADY_APPLIED", "Applied"], ["WRONG_FIELD", "Wrong field"], ["WRONG_COUNTRY", "Wrong country"], ["TOO_COMPETITIVE", "Too competitive"]];
  return <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">{title}</h2></div>{error ? <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">{error}</div> : null}<div className="divide-y divide-slate-100">{items.slice(0, 10).map((item) => { const key=`${item.kind}-${item.id}`; return <article key={key} className="px-5 py-4"><Link href={href(item)} className="block rounded-md outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400"><div className="flex items-start justify-between gap-4 p-1"><div><p className="font-medium text-slate-950">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.subtitle}{item.country ? ` · ${item.country}` : ""}</p><p className="mt-2 text-xs text-slate-500">{item.matchedReasons.join(" · ") || "Low metadata overlap — review manually"}</p>{item.possibleGaps.length?<p className="mt-2 text-xs text-amber-700">Check: {item.possibleGaps.slice(0,2).join(" · ")}</p>:null}</div><span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">{item.matchScore}%</span></div></Link><div className="mt-3 flex flex-wrap gap-1.5" aria-label={`Feedback for ${item.title}`}>{options.map(([value,label]) => <button key={value} type="button" disabled={busyId===key} aria-pressed={feedback[key]===value} onClick={()=>void submitFeedback(item,value)} className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${feedback[key]===value?"border-slate-950 bg-slate-950 text-white":"border-slate-200 text-slate-600 hover:border-slate-400"}`}>{label}</button>)}</div></article>;})}{!items.length ? <div className="px-5 py-8 text-sm text-slate-500">No published records are available for matching yet.</div> : null}</div></section>;
}

export function AIWorkspace() {
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [draft, setDraft] = useState<{ mode: string; text: string; warning: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadRecommendations() {
    setBusy("recommendations"); setError(null);
    const response = await fetch("/api/v1/me/ai/recommendations", { cache: "no-store" });
    if (!response.ok) setError((await readClientApiError(response)).message);
    else setRecommendations(((await response.json()) as { data: Recommendations }).data);
    setBusy(null);
  }

  async function write(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("write"); setError(null); setDraft(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/me/ai/write", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: form.get("type"), context: form.get("context") }) });
    if (!response.ok) setError((await readClientApiError(response)).message);
    else setDraft(((await response.json()) as { data: { mode: string; text: string; warning: string } }).data);
    setBusy(null);
  }

  return <div className="space-y-8">{error ? <Alert>{error}</Alert> : null}<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-950">Personalized matching</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Matches use your profile and published academic metadata. The deterministic score is explainable and does not pretend to be AI. Your feedback is stored as a separate signal for future ranking improvements.</p></div><Button type="button" onClick={() => void loadRecommendations()} disabled={busy !== null}>{busy === "recommendations" ? "Matching…" : "Build recommendations"}</Button></div></section>{recommendations ? <div className="space-y-4"><Alert tone="info">Mode: <strong>Deterministic matching</strong>. Scores are ranking aids, not admission or funding predictions.</Alert><div className="grid gap-4 xl:grid-cols-3"><MatchGroup title="Professors" items={recommendations.professors}/><MatchGroup title="Scholarships" items={recommendations.scholarships}/><MatchGroup title="Opportunities" items={recommendations.opportunities}/></div></div> : null}<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Academic writing assistant</h2><p className="mt-1 text-sm text-slate-600">Works with deterministic templates by default. An optional configured OpenAI-compatible endpoint can enhance drafts without becoming a platform dependency.</p><form onSubmit={write} className="mt-5 space-y-4"><div className="max-w-xs space-y-2"><Label htmlFor="type">Draft type</Label><select id="type" name="type" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="EMAIL">Professor email</option><option value="SOP">Statement of Purpose</option><option value="PROPOSAL">Research proposal</option></select></div><div className="space-y-2"><Label htmlFor="context">Your verified context / instructions</Label><textarea id="context" name="context" maxLength={8000} rows={7} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6" placeholder="Add the facts, target program, research topic, or achievements you want included. Do not add facts you cannot verify." /></div><Button type="submit" disabled={busy !== null}>{busy === "write" ? "Generating…" : "Generate draft"}</Button></form>{draft ? <div className="mt-6 rounded-xl bg-slate-950 p-5 text-white"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{draft.mode === "AI" ? "AI-enhanced draft" : "Deterministic template draft"}</p><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{draft.mode}</span></div><pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-100">{draft.text}</pre><p className="mt-4 text-xs text-amber-200">{draft.warning}</p></div> : null}</section></div>;
}
