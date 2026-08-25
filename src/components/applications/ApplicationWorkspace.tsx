"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { readClientApiError } from "@/lib/client-api";

type Application = { id: string; title: string; status: string; deadline: string | null; notes: string; sourceUrl: string; applicationUrl: string };
type Timeline = { id: string; type: string; message: string; createdAt: string };
type Task = { id: string; title: string; notes: string; dueAt: string | null; priority: string; completedAt: string | null };

type WorkspaceData = { application: Application; timeline: Timeline[]; tasks: Task[] };
const statuses = ["INTERESTED", "PREPARING", "CONTACTED", "APPLIED", "INTERVIEW", "OFFER", "ACCEPTED", "REJECTED", "WITHDRAWN"];

export function ApplicationWorkspace({ data }: { data: WorkspaceData }) {
  const [status, setStatus] = useState(data.application.status);
  const [deadline, setDeadline] = useState(data.application.deadline?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(data.application.notes);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function mutate(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    if (!response.ok) {
      const apiError = await readClientApiError(response);
      throw new Error(apiError.message);
    }
    return response;
  }

  async function saveApplication() {
    setSaving(true); setError(null);
    try {
      await mutate(`/api/v1/me/applications/${data.application.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, deadline, notes }) });
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update application."); }
    finally { setSaving(false); }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget); const message = String(form.get("message") || "");
    try { await mutate(`/api/v1/me/applications/${data.application.id}/notes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) }); event.currentTarget.reset(); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add note."); }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget);
    try { await mutate(`/api/v1/me/applications/${data.application.id}/tasks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), dueDate: form.get("dueDate") || "", priority: form.get("priority") || "MEDIUM", notes: "" }) }); event.currentTarget.reset(); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add task."); }
  }

  async function toggleTask(task: Task) {
    setError(null);
    try { await mutate(`/api/v1/me/applications/${data.application.id}/tasks/${task.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ completed: !task.completedAt }) }); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update task."); }
  }

  async function removeTask(taskId: string) {
    setError(null);
    try { await mutate(`/api/v1/me/applications/${data.application.id}/tasks/${taskId}`, { method: "DELETE" }); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove task."); }
  }

  async function removeApplication() {
    if (!window.confirm("Delete this application tracker and its timeline/tasks?")) return;
    setError(null);
    try { await mutate(`/api/v1/me/applications/${data.application.id}`, { method: "DELETE" }); router.push("/dashboard/applications"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete application."); }
  }

  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]">{error ? <div className="lg:col-span-2"><Alert tone="error">{error}</Alert></div> : null}<div className="space-y-6"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Progress</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium text-slate-500">Stage<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{statuses.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-medium text-slate-500">Deadline<Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1.5" /></label></div><label className="mt-4 block text-xs font-medium text-slate-500">Private summary notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><div className="mt-4 flex flex-wrap justify-between gap-3"><Button variant="ghost" type="button" onClick={removeApplication}>Delete tracker</Button><Button type="button" disabled={saving} onClick={saveApplication}>{saving ? "Saving…" : "Save progress"}</Button></div></section><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Tasks</h2><form onSubmit={addTask} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_120px_auto]"><Input name="title" required maxLength={240} placeholder="Next task" /><Input name="dueDate" type="date" /><select name="priority" defaultValue="MEDIUM" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select><Button type="submit">Add</Button></form><div className="mt-4 space-y-2">{data.tasks.length === 0 ? <p className="text-sm text-slate-500">No tasks yet.</p> : data.tasks.map((task) => <div key={task.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"><input type="checkbox" checked={Boolean(task.completedAt)} onChange={() => toggleTask(task)} className="mt-1 size-4" /><div className="min-w-0 flex-1"><p className={`text-sm font-medium ${task.completedAt ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.priority}{task.dueAt ? ` • due ${task.dueAt.slice(0, 10)}` : ""}</p></div><button type="button" onClick={() => removeTask(task.id)} className="text-xs font-medium text-rose-600">Remove</button></div>)}</div></section></div><aside className="space-y-6"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Timeline</h2><form onSubmit={addNote} className="mt-4 flex gap-2"><Input name="message" required maxLength={2000} placeholder="Add private note" /><Button type="submit">Add</Button></form><div className="mt-5 space-y-4">{data.timeline.map((entry) => <div key={entry.id} className="border-l-2 border-slate-200 pl-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{entry.type.replaceAll("_", " ")}</p><p className="mt-1 text-sm leading-6 text-slate-700">{entry.message}</p><p className="mt-1 text-xs text-slate-400">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</p></div>)}</div></section>{data.application.applicationUrl || data.application.sourceUrl ? <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Official links</h2><div className="mt-3 flex flex-col gap-2">{data.application.applicationUrl ? <a href={data.application.applicationUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-700 underline">Application page</a> : null}{data.application.sourceUrl ? <a href={data.application.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-700 underline">Verify source</a> : null}</div></section> : null}</aside></div>;
}
