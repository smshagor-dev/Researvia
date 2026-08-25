import Link from "next/link";
import { OutreachCreateForm } from "@/components/outreach/OutreachCreateForm";
import { getCurrentUser } from "@/server/auth/session";
import { listEmailAccounts } from "@/server/email/email-account.service";
import { Professor } from "@/server/models/Professor";
import { listCampaigns } from "@/server/outreach/outreach.service";

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ professorId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { professorId } = await searchParams;
  const [accounts, campaigns, professor] = await Promise.all([
    listEmailAccounts(user.id),
    listCampaigns(user.id),
    professorId ? Professor.findOne({ _id: professorId, status: "PUBLISHED" }).select("fullName email").lean() : Promise.resolve(null)
  ]);
  return <div className="space-y-8">
    <div><p className="text-sm font-medium text-slate-500">Academic communication</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Professor outreach</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Create personalized drafts, send through your connected mailbox, schedule delivery, follow up automatically, and track replies. Always review factual claims before sending.</p></div>
    <OutreachCreateForm accounts={accounts.map((account) => ({ id: account._id.toString(), email: account.email, provider: account.provider }))} professor={professor ? { id: professor._id.toString(), name: professor.fullName, email: professor.email } : null} />
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">Campaigns</h2></div><div className="divide-y divide-slate-100">{campaigns.length ? campaigns.map((campaign) => <Link key={campaign._id.toString()} href={`/dashboard/outreach/${campaign._id.toString()}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"><div><p className="font-medium text-slate-900">{campaign.name}</p><p className="mt-1 text-sm text-slate-500">{campaign.purpose}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{campaign.status}</span></Link>) : <div className="px-5 py-8 text-sm text-slate-500">No outreach campaigns yet.</div>}</div></section>
  </div>;
}
