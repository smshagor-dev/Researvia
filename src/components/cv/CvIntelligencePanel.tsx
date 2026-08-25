"use client";

import { useState } from "react";

type DocumentOption = { id: string; name: string };
type Analysis = { id: string; documentName: string; score: number; detectedSections: string[]; missingSections: string[]; extractedSkills: string[]; suggestions: string[]; updatedAt: string };

export function CvIntelligencePanel({ documents, analyses: initial }: { documents: DocumentOption[]; analyses: Analysis[] }) {
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const [analyses, setAnalyses] = useState(initial);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function analyze() {
    if (!documentId) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/v1/me/cv-analysis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "CV analysis failed.");
      const refreshed = await fetch("/api/v1/me/cv-analysis", { cache: "no-store" });
      const refreshedBody = await refreshed.json();
      if (refreshed.ok) {
        const mapped = (refreshedBody.data.analyses as Array<Record<string, unknown>>).map((item) => ({
          id: String(item._id), documentName: String((item.documentId as { originalName?: string } | null)?.originalName ?? "CV"), score: Number(item.score), detectedSections: item.detectedSections as string[], missingSections: item.missingSections as string[], extractedSkills: item.extractedSkills as string[], suggestions: item.suggestions as string[], updatedAt: String(item.updatedAt)
        }));
        setAnalyses(mapped);
      }
      setStatus("Analysis updated. Scores are deterministic guidance, not admissions predictions.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "CV analysis failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Analyze a private CV</h2>
      <p className="mt-1 text-sm text-slate-600">Text is extracted transiently for analysis; the raw extracted CV text is not stored in the analysis record.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <select className="min-h-10 flex-1 rounded-md border px-3 text-sm" value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
          {documents.length === 0 ? <option value="">Upload a document marked CV first</option> : documents.map((document) => <option value={document.id} key={document.id}>{document.name}</option>)}
        </select>
        <button disabled={!documentId || busy} onClick={analyze} className="min-h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50">{busy ? "Analyzing…" : "Analyze CV"}</button>
      </div>
      {status ? <p className="mt-3 text-sm text-slate-600" role="status">{status}</p> : null}
    </section>
    {analyses.map((analysis) => <article key={analysis.id} className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{analysis.documentName}</h3><p className="text-xs text-slate-500">Updated {new Date(analysis.updatedAt).toLocaleString()}</p></div><div className="rounded-full border px-3 py-1 text-sm font-semibold">{analysis.score}/100 readiness</div></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2"><div><h4 className="text-sm font-semibold">Detected</h4><p className="mt-2 text-sm text-slate-600">{analysis.detectedSections.join(" · ") || "No standard sections detected"}</p><h4 className="mt-4 text-sm font-semibold">Skills found</h4><p className="mt-2 text-sm text-slate-600">{analysis.extractedSkills.join(" · ") || "No dictionary skills confidently detected"}</p></div><div><h4 className="text-sm font-semibold">Missing / unclear</h4><p className="mt-2 text-sm text-slate-600">{analysis.missingSections.join(" · ") || "No major section gaps detected"}</p><h4 className="mt-4 text-sm font-semibold">Suggestions</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{analysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div></div>
    </article>)}
  </div>;
}
