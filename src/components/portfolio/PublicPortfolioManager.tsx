"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

type Portfolio = {
  slug: string;
  enabled: boolean;
  headline: string;
  summary: string;
  showInterests: boolean;
  showSkills: boolean;
  showPublications: boolean;
  showProjects: boolean;
  showAcademicLinks: boolean;
  allowCvDownload: boolean;
};

async function savePortfolio(input: Portfolio): Promise<Portfolio> {
  const response = await fetch("/api/v1/me/portfolio", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Could not save public portfolio settings.");
  const value = body.data.profile as Record<string, unknown>;
  return {
    slug: String(value.slug ?? input.slug),
    enabled: Boolean(value.enabled),
    headline: String(value.headline ?? ""),
    summary: String(value.summary ?? ""),
    showInterests: value.showInterests !== false,
    showSkills: value.showSkills !== false,
    showPublications: value.showPublications !== false,
    showProjects: value.showProjects !== false,
    showAcademicLinks: value.showAcademicLinks !== false,
    allowCvDownload: Boolean(value.allowCvDownload)
  };
}

export function PublicPortfolioManager({ initialValue, appUrl }: { initialValue: Portfolio; appUrl: string }) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const cleanBase = appUrl.replace(/\/$/, "");
  const publicUrl = useMemo(() => `${cleanBase}/students/${value.slug || "your-slug"}`, [cleanBase, value.slug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setStatus("");
    try {
      const saved = await savePortfolio({ ...value, slug: value.slug.trim().toLowerCase() });
      setValue(saved);
      setStatus(saved.enabled ? "Public portfolio saved and enabled." : "Portfolio settings saved. Your profile remains private until enabled.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save public portfolio settings."); }
    finally { setBusy(false); }
  }

  const toggles: Array<[keyof Pick<Portfolio,"showInterests"|"showSkills"|"showPublications"|"showProjects"|"showAcademicLinks"|"allowCvDownload">,string,string]> = [
    ["showInterests","Research interests","Show research interests from your academic profile."],
    ["showSkills","Skills","Show skills from your academic profile."],
    ["showPublications","Publications","Show publications stored in your ResearVia research profile."],
    ["showProjects","Public research projects","Show only projects that you separately marked public."],
    ["showAcademicLinks","Academic links","Show your configured website, LinkedIn, GitHub, Google Scholar and ORCID links."],
    ["allowCvDownload","Allow CV download","Expose only your latest CV through the protected public-CV route. Off by default."]
  ];

  return <form onSubmit={submit} className="space-y-6">
    <section className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Publishing status</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Your profile stays private until you explicitly enable it. Disabling immediately removes the public profile route from discovery.</p></div><label className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium"><input type="checkbox" checked={value.enabled} onChange={(event)=>setValue((current)=>({...current,enabled:event.target.checked}))}/>{value.enabled?"Public":"Private"}</label></div>{value.enabled&&value.slug?<Link target="_blank" href={`/students/${encodeURIComponent(value.slug)}`} className="mt-4 inline-flex rounded-md border px-3 py-2 text-sm font-medium">View public portfolio ↗</Link>:null}</section>

    <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Public identity</h2><div className="mt-4 grid gap-4"><label className="text-sm font-medium">Public URL slug<input required minLength={3} maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={value.slug} onChange={(event)=>setValue((current)=>({...current,slug:event.target.value.toLowerCase().replace(/\s+/g,"-")}))} className="mt-1 block w-full rounded-md border px-3 py-2" aria-describedby="portfolio-url"/></label><p id="portfolio-url" className="break-all rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">{publicUrl}</p><label className="text-sm font-medium">Headline<input maxLength={240} value={value.headline} onChange={(event)=>setValue((current)=>({...current,headline:event.target.value}))} placeholder="Computer Vision researcher focused on autonomous systems" className="mt-1 block w-full rounded-md border px-3 py-2"/></label><label className="text-sm font-medium">Public summary<textarea maxLength={4000} rows={7} value={value.summary} onChange={(event)=>setValue((current)=>({...current,summary:event.target.value}))} placeholder="Write a factual academic summary. Avoid claims you cannot verify." className="mt-1 block w-full rounded-md border px-3 py-2"/></label></div></section>

    <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Visible sections</h2><p className="mt-1 text-sm text-slate-600">Each section is independently controlled. Private documents and private projects are never exposed by these switches.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{toggles.map(([key,label,description])=><label key={key} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-4"><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span><input type="checkbox" checked={value[key]} onChange={(event)=>setValue((current)=>({...current,[key]:event.target.checked}))} className="mt-1 size-4"/></label>)}</div></section>

    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Privacy reminder:</strong> enabling a public portfolio makes the selected academic information indexable by search engines. CV download remains separately disabled unless you opt in.</section>
    <button disabled={busy} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy?"Saving…":"Save portfolio settings"}</button>
    {status?<p role="status" className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p>:null}
  </form>;
}
