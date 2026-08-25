import { getCurrentUser } from "@/server/auth/session";
import { listReading } from "@/server/research/research.service";

type PopulatedPaper = { _id: { toString(): string }; title: string; authors: string[]; venue: string; publicationDate: Date | null; landingUrl: string };

export default async function ReadingPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const items = await listReading(user.id);
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Research workflow</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Academic reading list</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Keep papers connected to your research interests, notes, and reading status.</p></div><div className="space-y-3">{items.map((item) => { const paper = item.paperId as unknown as PopulatedPaper; return <article key={item._id.toString()} className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.status}</p><h2 className="mt-1 font-semibold">{paper.title || "Paper record unavailable"}</h2>{paper.authors?.length ? <p className="mt-2 text-sm text-slate-600">{paper.authors.slice(0, 6).join(", ")}</p> : null}</div>{paper.landingUrl ? <a href={paper.landingUrl} target="_blank" rel="noreferrer" className="text-sm font-medium underline underline-offset-4">Source</a> : null}</div>{item.notes ? <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{item.notes}</p> : <p className="mt-4 text-sm text-slate-500">No notes yet.</p>}{item.mappedResearchInterests.length > 0 ? <p className="mt-3 text-xs text-slate-500">Mapped interests: {item.mappedResearchInterests.join(" · ")}</p> : null}</article>; })}{items.length === 0 ? <div className="rounded-xl border border-dashed bg-white p-8 text-center"><p className="text-sm text-slate-600">Your reading list is empty.</p><a href="/dashboard/research" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">Discover papers</a></div> : null}</div></div>;
}
