import Link from "next/link";
import { CampaignSchedulePanel } from "@/components/outreach/CampaignSchedulePanel";
import { getCurrentUser } from "@/server/auth/session";
import { getCampaign } from "@/server/outreach/outreach.service";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  const { campaign, recipients } = await getCampaign(user.id, id);
  return <div className="space-y-6">
    <div><Link href="/dashboard/outreach" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Outreach</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">{campaign.name}</h1><p className="mt-2 text-sm text-slate-600">{campaign.purpose}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{campaign.status}</span></div></div>
    {campaign.status === "DRAFT" ? <CampaignSchedulePanel campaignId={campaign._id.toString()} /> : null}
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">Recipients and delivery</h2><p className="mt-1 text-sm text-slate-500">{recipients.length} recipient{recipients.length === 1 ? "" : "s"}</p></div><div className="divide-y divide-slate-100">{recipients.map((recipient) => <article key={recipient._id.toString()} className="px-5 py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-slate-950">{recipient.name || recipient.email}</p><p className="text-sm text-slate-500">{recipient.email}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${recipient.status === "REPLIED" ? "bg-emerald-50 text-emerald-700" : recipient.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{recipient.status}</span></div><div className="mt-4 rounded-lg bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">{recipient.subject}</p><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-600">{recipient.body}</pre></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>Sent: {recipient.sentAt ? new Date(recipient.sentAt).toLocaleString() : "Not sent"}</span><span>Follow-up: {recipient.followUpSentAt ? "Sent" : recipient.followUpDueAt ? new Date(recipient.followUpDueAt).toLocaleString() : "Not scheduled"}</span></div>{recipient.lastError ? <p className="mt-2 text-sm text-red-600">{recipient.lastError}</p> : null}</article>)}</div></section>
  </div>;
}
