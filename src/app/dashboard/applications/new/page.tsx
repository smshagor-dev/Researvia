import Link from "next/link";
import { ApplicationCreateForm } from "@/components/applications/ApplicationCreateForm";

export const metadata = { title: "New application | ResearVia" };

export default async function NewApplicationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const requestedType = typeof raw.sourceType === "string" ? raw.sourceType : "MANUAL";
  const sourceType = requestedType === "SCHOLARSHIP" || requestedType === "OPPORTUNITY" ? requestedType : "MANUAL";
  const sourceId = typeof raw.sourceId === "string" && /^[a-f\d]{24}$/i.test(raw.sourceId) ? raw.sourceId : "";
  const effectiveType = sourceType !== "MANUAL" && sourceId ? sourceType : "MANUAL";

  return <div className="mx-auto max-w-4xl"><Link href="/dashboard/applications" className="text-sm font-medium text-slate-500 hover:text-slate-950">← Back to applications</Link><div className="mb-6 mt-5"><p className="text-sm font-medium text-slate-500">Application tracker</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{effectiveType === "MANUAL" ? "Add an application" : `Track this ${effectiveType.toLowerCase()}`}</h1><p className="mt-2 text-sm text-slate-600">Keep deadlines, tasks, private notes and progress in one place.</p></div><ApplicationCreateForm sourceType={effectiveType} sourceId={sourceId} /></div>;
}
